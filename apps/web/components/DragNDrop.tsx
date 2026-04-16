import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  MouseSensor,
  SensorDescriptor,
  SensorOptions,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import LinkIcon from "./LinkViews/LinkComponents/LinkIcon";
import { LinkIncludingShortenedCollectionAndTags } from "@linkwarden/types/global";
import toast from "react-hot-toast";
import {
  useUpdateLink,
  useReorderLinks,
} from "@linkwarden/router/links";
import { useTranslation } from "next-i18next";
import { snapCenterToCursor } from "@dnd-kit/modifiers";
import { customCollisionDetectionAlgorithm } from "@/lib/utils";
import usePinLink from "@/lib/client/pinLink";
import { useQueryClient } from "@tanstack/react-query";
import { useUser } from "@linkwarden/router/user";
import useLocalSettingsStore from "@/store/localSettings";
import { Sort } from "@linkwarden/types/global";
import useLinkStore from "@/store/links";

interface DragNDropProps {
  children: React.ReactNode;
  /**
   * The currently active link being dragged
   */
  activeLink: LinkIncludingShortenedCollectionAndTags | null;
  /**
   * All links available for drag and drop
   */
  setActiveLink: (link: LinkIncludingShortenedCollectionAndTags | null) => void;
  /**
   * Override the default sensors used for drag and drop.
   */
  sensors?: SensorDescriptor<SensorOptions>[];

  /**
   * Override onDragEnd function.
   */
  onDragEnd?: (event: DragEndEvent) => void;
}

/**
 * Wrapper component for drag and drop functionality.
 */
export default function DragNDrop({
  children,
  activeLink,
  setActiveLink,
  sensors: sensorProp,
  onDragEnd: onDragEndProp,
}: DragNDropProps) {
  const { t } = useTranslation();
  const updateLink = useUpdateLink({ toast, t });
  const reorderLinks = useReorderLinks({ toast, t });
  const pinLink = usePinLink();
  const { data: user } = useUser();
  const queryClient = useQueryClient();
  const { settings } = useLocalSettingsStore();
  const { selectedIds, selectionCount, clearSelected } = useLinkStore();
  const mouseSensor = useSensor(MouseSensor, {
    // Require the mouse to move by 10 pixels before activating
    activationConstraint: {
      distance: 10,
    },
  });
  const touchSensor = useSensor(TouchSensor, {
    // Press delay of 250ms, with tolerance of 5px of movement
    activationConstraint: {
      delay: 200,
      tolerance: 5,
    },
  });

  const sensors = useSensors(mouseSensor, touchSensor);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveLink(
      (event.active.data.current
        ?.link as LinkIncludingShortenedCollectionAndTags) ?? null
    );
  };

  const handleDragOverCancel = () => {
    setActiveLink(null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    if (onDragEndProp) {
      onDragEndProp(event);
      return;
    }

    const { over, active } = event;
    if (!over || !activeLink) return;

    const overData = over.data.current;
    const targetId = String(over.id);

    const isFromRecentSection = active.data.current?.dashboardType === "recent";

    setActiveLink(null);

    // SAME-COLLECTION REORDER (Manual sort mode only)
    if (settings.sortBy === Sort.Manual) {
      const overLink =
        over.data.current?.link as
          | LinkIncludingShortenedCollectionAndTags
          | undefined;
      const activeIsLink = !!active.data.current?.link;
      const overIsLink = !!overLink;
      const sameCollection =
        activeIsLink &&
        overIsLink &&
        activeLink.collection?.id === overLink.collection?.id;

      if (sameCollection && activeLink.id !== overLink.id) {
        // Get the current cached link list for this collection
        const collectionId = activeLink.collection?.id as number;
        const queryKey = ["links"];

        const allQueries = queryClient
          .getQueryCache()
          .findAll({ queryKey, exact: false });

        // Find the query that contains this collection's links
        for (const query of allQueries) {
          const data = query.state.data as any;
          if (!data?.pages) continue;

          const allLinks: LinkIncludingShortenedCollectionAndTags[] =
            data.pages.flatMap((p: any) => p.links ?? []);

          const oldIndex = allLinks.findIndex((l) => l.id === activeLink.id);
          const newIndex = allLinks.findIndex((l) => l.id === overLink.id);

          if (oldIndex === -1 || newIndex === -1) continue;

          const reordered = arrayMove(allLinks, oldIndex, newIndex);
          const orderedIds = reordered.map((l) => l.id as number);

          // Optimistic update
          queryClient.setQueryData(query.queryKey, (old: any) => {
            if (!old?.pages) return old;
            let remaining = [...reordered];
            return {
              ...old,
              pages: old.pages.map((p: any) => {
                const count = (p.links ?? []).length;
                return {
                  ...p,
                  links: remaining.splice(0, count),
                };
              }),
            };
          });

          reorderLinks
            .mutateAsync({ collectionId, orderedIds })
            .catch(() => {
              // Rollback
              queryClient.setQueryData(query.queryKey, data);
            });

          return;
        }
        return;
      }
    }

    const mutateWithToast = async (
      updatedLink: LinkIncludingShortenedCollectionAndTags,
      opts?: { invalidateDashboardOnError?: boolean }
    ) => {
      updateLink.mutateAsync(updatedLink);
    };

    // DROP ON TAG
    if (overData?.type === "tag") {
      const tagName = overData?.name as string | undefined;
      if (!tagName) return;

      const isTagAlreadyExists = activeLink.tags?.some(
        (tag) => tag.name === tagName
      );
      if (isTagAlreadyExists) {
        toast.error(t("tag_already_added"));
        return;
      }

      const allTags: { name: string }[] = (activeLink.tags ?? []).map(
        (tag) => ({
          name: tag.name,
        })
      );

      const updatedLink: LinkIncludingShortenedCollectionAndTags = {
        ...activeLink,
        tags: [...allTags, { name: tagName }] as any,
      };

      await mutateWithToast(updatedLink, {
        invalidateDashboardOnError: typeof queryClient !== "undefined",
      });
      return;
    }

    // DROP ON DASHBOARD "PINNED" SECTION
    const isPinnedSection = targetId === "pinned-links-section";

    const canPin =
      typeof pinLink === "function" &&
      typeof user !== "undefined" &&
      typeof user?.id !== "undefined";

    if (isPinnedSection && canPin) {
      if (Array.isArray(activeLink.pinnedBy) && !activeLink.pinnedBy.length) {
        if (typeof queryClient !== "undefined") {
          const optimisticallyPinned = {
            ...activeLink,
            pinnedBy: [user!.id],
          };

          queryClient.setQueryData(["dashboardData"], (oldData: any) => {
            if (!oldData?.links) return oldData;
            return {
              ...oldData,
              links: oldData.links.map((l: any) =>
                l.id === optimisticallyPinned.id ? optimisticallyPinned : l
              ),
            };
          });
        }

        pinLink(activeLink);
      }
      return;
    }

    // DROP ON COLLECTION (dashboard + sidebar)
    const collectionId = overData?.id as number | undefined;
    const collectionName = overData?.name as string | undefined;
    const ownerId = overData?.ownerId as number | undefined;

    if (!collectionId || !collectionName || typeof ownerId === "undefined")
      return;

    const isSameCollection = activeLink.collection?.id === collectionId;
    if (isSameCollection) {
      if (isFromRecentSection) toast.error(t("link_already_in_collection"));
      return;
    }

    // MULTI-SELECT: move all selected links if dragged link is among selected
    const isMultiSelect =
      selectionCount > 1 && activeLink.id !== undefined && selectedIds[activeLink.id as number];

    if (isMultiSelect) {
      const selectedLinkIds = Object.keys(selectedIds).map(Number);
      // Find all selected links in the cache
      const allQueries = queryClient
        .getQueryCache()
        .findAll({ queryKey: ["links"], exact: false });

      let linksToMove: LinkIncludingShortenedCollectionAndTags[] = [];
      for (const query of allQueries) {
        const data = query.state.data as any;
        if (!data?.pages) continue;
        const allLinks: LinkIncludingShortenedCollectionAndTags[] =
          data.pages.flatMap((p: any) => p.links ?? []);
        const found = allLinks.filter(
          (l) => l.id !== undefined && selectedLinkIds.includes(l.id as number)
        );
        if (found.length > 0) {
          linksToMove = found;
          break;
        }
      }

      clearSelected();

      await Promise.all(
        linksToMove.map((l) =>
          updateLink.mutateAsync({
            ...l,
            collection: { id: collectionId, name: collectionName, ownerId },
          })
        )
      );
      return;
    }

    const updatedLink: LinkIncludingShortenedCollectionAndTags = {
      ...activeLink,
      collection: {
        id: collectionId,
        name: collectionName,
        ownerId,
      },
    };

    if (typeof queryClient !== "undefined") {
      queryClient.setQueryData(["dashboardData"], (oldData: any) => {
        if (!oldData?.links) return oldData;
        return {
          ...oldData,
          links: oldData.links.map((l: any) =>
            l.id === updatedLink.id ? updatedLink : l
          ),
        };
      });

      queryClient.setQueryData(["dashboardData"], (oldData: any) => {
        if (!oldData?.collectionLinks) return oldData;

        const oldCollectionId = activeLink.collection?.id;
        if (!oldCollectionId) return oldData;

        return {
          ...oldData,
          collectionLinks: {
            ...oldData.collectionLinks,
            [oldCollectionId]: (
              oldData.collectionLinks[oldCollectionId] || []
            ).filter((l: any) => l.id !== updatedLink.id),
            [collectionId]: [
              ...(oldData.collectionLinks[collectionId] || []),
              updatedLink,
            ],
          },
        };
      });
    }

    await mutateWithToast(updatedLink, {
      invalidateDashboardOnError: typeof queryClient !== "undefined",
    });
  };

  return (
    <DndContext
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragOverCancel}
      modifiers={[snapCenterToCursor]}
      sensors={sensorProp ? sensorProp : sensors}
      collisionDetection={customCollisionDetectionAlgorithm}
    >
      {!!activeLink && (
        // when drag end, immediately hide the overlay
        <DragOverlay
          style={{
            zIndex: 100,
            pointerEvents: "none",
          }}
        >
          <div className="w-fit h-fit relative">
            <LinkIcon link={activeLink} />
            {selectionCount > 1 &&
              activeLink.id !== undefined &&
              selectedIds[activeLink.id as number] && (
                <span className="absolute -top-2 -right-2 bg-primary text-primary-content text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {selectionCount}
                </span>
              )}
          </div>
        </DragOverlay>
      )}
      {children}
    </DndContext>
  );
}
