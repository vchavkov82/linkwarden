import LinkCard from "@/components/LinkViews/LinkComponents/LinkCard";
import {
  CollectionIncludingMembersAndLinkCount,
  LinkIncludingShortenedCollectionAndTags,
  Sort,
  ViewMode,
} from "@linkwarden/types";
import { hasPendingServerManagedPreview } from "@linkwarden/lib/previewState";
import { useEffect, useRef } from "react";
import { useInView } from "react-intersection-observer";
import LinkMasonry from "@/components/LinkViews/LinkComponents/LinkMasonry";
import Masonry from "react-masonry-css";
import { useMemo } from "react";
import LinkList from "@/components/LinkViews/LinkComponents/LinkList";
import useLocalSettingsStore from "@/store/localSettings";
import { useResponsiveGrid } from "@/hooks/useResponsiveGrid";
import { useCollections } from "@linkwarden/router/collections";
import { useRouter } from "next/router";
import { useTranslation } from "next-i18next";
import { TFunction } from "i18next";
import useLinkStore from "@/store/links";
import useMediaQuery from "@/hooks/useMediaQuery";
import { useUser } from "@linkwarden/router/user";
import {
  SortableContext,
  rectSortingStrategy,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

function CardView({
  links,
  collectionsById,
  isPublicRoute,
  t,
  user,
  disableDraggable,
  isSelected,
  toggleSelected,
  editMode,
  isLoading,
  hasNextPage,
  placeHolderRef,
  isManualSort,
}: {
  links: LinkIncludingShortenedCollectionAndTags[];
  collectionsById: Map<number, CollectionIncludingMembersAndLinkCount>;
  isPublicRoute: boolean;
  t: TFunction<"translation", undefined>;
  user: any;
  disableDraggable: boolean;
  isSelected: (id: number) => boolean;
  toggleSelected: (id: number) => void;
  editMode: boolean;
  isLoading: boolean;
  hasNextPage: boolean;
  placeHolderRef: any;
  isManualSort: boolean;
}) {
  const { gridColClass, imageHeightClass } = useResponsiveGrid();

  const items = links.map((e) => e.id?.toString() ?? "");

  const inner = (
    <div className={`${gridColClass} grid gap-5 pb-5`}>
      {links?.map((e) => {
        const collection = collectionsById.get(e.collection.id as number);
        const selected = isSelected(e.id as number);

        return (
          <LinkCard
            key={e.id}
            link={e}
            collection={collection as CollectionIncludingMembersAndLinkCount}
            isPublicRoute={isPublicRoute}
            t={t}
            user={user}
            disableDraggable={disableDraggable}
            isSelected={selected}
            toggleSelected={toggleSelected}
            editMode={editMode}
            imageHeightClass={imageHeightClass}
          />
        );
      })}

      {(hasNextPage || isLoading) && (
        <div className="flex flex-col gap-4" ref={placeHolderRef}>
          <div className="skeleton h-40 w-full"></div>
          <div className="skeleton h-3 w-2/3"></div>
          <div className="skeleton h-3 w-full"></div>
          <div className="skeleton h-3 w-full"></div>
          <div className="skeleton h-3 w-1/3"></div>
        </div>
      )}
    </div>
  );

  if (isManualSort) {
    return (
      <SortableContext items={items} strategy={rectSortingStrategy}>
        {inner}
      </SortableContext>
    );
  }

  return inner;
}

function MasonryView({
  links,
  collectionsById,
  isPublicRoute,
  t,
  disableDraggable,
  user,
  isSelected,
  toggleSelected,
  editMode,
  isLoading,
  hasNextPage,
  placeHolderRef,
  isManualSort,
}: {
  links: LinkIncludingShortenedCollectionAndTags[];
  collectionsById: Map<number, CollectionIncludingMembersAndLinkCount>;
  isPublicRoute: boolean;
  t: TFunction<"translation", undefined>;
  disableDraggable: boolean;
  user: any;
  isSelected: (id: number) => boolean;
  toggleSelected: (id: number) => void;
  editMode: boolean;
  isLoading: boolean;
  hasNextPage: boolean;
  placeHolderRef: any;
  isManualSort: boolean;
}) {
  const settings = useLocalSettingsStore((state) => state.settings);
  const { columnCount, gridColClass, imageHeightClass } = useResponsiveGrid();

  const breakpointColumnsObj = { default: 5, 1900: 4, 1500: 3, 880: 2, 550: 1 };

  const items = links.map((e) => e.id?.toString() ?? "");

  const inner = (
    <Masonry
      breakpointCols={
        settings.columns === 0 ? breakpointColumnsObj : columnCount
      }
      columnClassName="flex flex-col gap-5 !w-full"
      className={`${gridColClass} grid gap-5 pb-5`}
    >
      {links?.map((e) => {
        const collection = collectionsById.get(e.collection.id as number);
        const selected = isSelected(e.id as number);

        return (
          <LinkMasonry
            key={e.id}
            link={e}
            collection={collection as CollectionIncludingMembersAndLinkCount}
            isPublicRoute={isPublicRoute}
            t={t}
            disableDraggable={disableDraggable}
            user={user}
            isSelected={selected}
            toggleSelected={toggleSelected}
            imageHeightClass={imageHeightClass}
            editMode={editMode}
          />
        );
      })}

      {(hasNextPage || isLoading) && (
        <div className="flex flex-col gap-4" ref={placeHolderRef}>
          <div className="skeleton h-40 w-full"></div>
          <div className="skeleton h-3 w-2/3"></div>
          <div className="skeleton h-3 w-full"></div>
          <div className="skeleton h-3 w-full"></div>
          <div className="skeleton h-3 w-1/3"></div>
        </div>
      )}
    </Masonry>
  );

  if (isManualSort) {
    return (
      <SortableContext items={items} strategy={rectSortingStrategy}>
        {inner}
      </SortableContext>
    );
  }

  return inner;
}

function ListView({
  links,
  collectionsById,
  isPublicRoute,
  t,
  disableDraggable,
  user,
  isSelected,
  toggleSelected,
  editMode,
  isLoading,
  hasNextPage,
  placeHolderRef,
  isManualSort,
}: {
  links: LinkIncludingShortenedCollectionAndTags[];
  collectionsById: Map<number, CollectionIncludingMembersAndLinkCount>;
  isPublicRoute: boolean;
  t: TFunction<"translation", undefined>;
  disableDraggable: boolean;
  user: any;
  isSelected: (id: number) => boolean;
  toggleSelected: (id: number) => void;
  editMode: boolean;
  isLoading: boolean;
  hasNextPage: boolean;
  placeHolderRef: any;
  isManualSort: boolean;
}) {
  const items = links.map((e) => e.id?.toString() ?? "");

  const inner = (
    <div className="flex flex-col">
      {links?.map((e, i) => {
        const collection = collectionsById.get(e.collection.id as number);
        const selected = isSelected(e.id as number);

        return (
          <LinkList
            key={e.id}
            link={e}
            collection={collection as CollectionIncludingMembersAndLinkCount}
            isPublicRoute={isPublicRoute}
            t={t}
            disableDraggable={disableDraggable}
            user={user}
            isSelected={selected}
            toggleSelected={toggleSelected}
            count={i}
            editMode={editMode}
          />
        );
      })}

      {(hasNextPage || isLoading) && (
        <div ref={placeHolderRef} className="flex gap-2 py-1 px-1">
          <div className="skeleton h-9 w-9 shrink-0 rounded-md"></div>
          <div className="flex flex-col gap-1.5 w-full min-w-0 py-0.5">
            <div className="skeleton h-2.5 w-2/3"></div>
            <div className="skeleton h-2 w-1/2"></div>
          </div>
        </div>
      )}
    </div>
  );

  if (isManualSort) {
    return (
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        {inner}
      </SortableContext>
    );
  }

  return inner;
}

export default function Links({
  layout,
  links,
  editMode,
  useData,
}: {
  layout: ViewMode;
  links?: LinkIncludingShortenedCollectionAndTags[];
  editMode?: boolean;
  useData?: any;
}) {
  const { ref, inView } = useInView();

  const { t } = useTranslation();
  const router = useRouter();

  const isPublicRoute = router.pathname.startsWith("/public") ? true : false;

  useEffect(() => {
    if (!inView) return;
    if (!useData.hasNextPage) return;
    if (useData.isFetchingNextPage) return;

    useData.fetchNextPage();
  }, [inView, useData]);

  const { data: collections = [] } = useCollections();

  const collectionsById = useMemo(() => {
    const m = new Map<number, (typeof collections)[number]>();
    for (const c of collections) m.set(c.id as any, c);
    return m;
  }, [collections]);

  const { clearSelected, isSelected, toggleSelected } = useLinkStore();

  useEffect(() => {
    if (!editMode) {
      clearSelected();
    }
  }, [clearSelected, editMode]);

  const hasPendingPreviews = useMemo(
    () => hasPendingServerManagedPreview(links),
    [links]
  );

  const pollCountRef = useRef(0);

  useEffect(() => {
    if (!hasPendingPreviews) {
      pollCountRef.current = 0;
      return;
    }

    const MAX_POLLS = 20;
    if (pollCountRef.current >= MAX_POLLS) return;

    const interval = setInterval(() => {
      pollCountRef.current++;
      if (pollCountRef.current >= MAX_POLLS) {
        clearInterval(interval);
        return;
      }
      useData?.refetch().catch((error: any) => {
        console.error("Error refetching links:", error);
      });
    }, 15000);

    return () => clearInterval(interval);
  }, [hasPendingPreviews, useData]);

  const { data: user } = useUser();
  const { settings } = useLocalSettingsStore();
  const isManualSort = settings.sortBy === Sort.Manual;

  const disableDraggable =
    useMediaQuery("(max-width: 1023px)") || !isManualSort;

  if (layout === ViewMode.List) {
    return (
      <ListView
        links={links || []}
        collectionsById={collectionsById}
        isPublicRoute={isPublicRoute}
        t={t}
        disableDraggable={disableDraggable}
        user={user}
        toggleSelected={toggleSelected}
        isSelected={isSelected}
        editMode={editMode || false}
        isLoading={useData?.isLoading}
        hasNextPage={useData?.hasNextPage}
        placeHolderRef={ref}
        isManualSort={isManualSort}
      />
    );
  } else if (layout === ViewMode.Masonry) {
    return (
      <MasonryView
        links={links || []}
        collectionsById={collectionsById}
        isPublicRoute={isPublicRoute}
        t={t}
        disableDraggable={disableDraggable}
        user={user}
        toggleSelected={toggleSelected}
        isSelected={isSelected}
        editMode={editMode || false}
        isLoading={useData?.isLoading}
        hasNextPage={useData?.hasNextPage}
        placeHolderRef={ref}
        isManualSort={isManualSort}
      />
    );
  } else {
    // Default: card view (explicit layout or legacy)
    return (
      <CardView
        links={links || []}
        collectionsById={collectionsById}
        isPublicRoute={isPublicRoute}
        t={t}
        user={user}
        disableDraggable={disableDraggable}
        toggleSelected={toggleSelected}
        isSelected={isSelected}
        editMode={editMode || false}
        isLoading={useData?.isLoading}
        hasNextPage={useData?.hasNextPage}
        placeHolderRef={ref}
        isManualSort={isManualSort}
      />
    );
  }
}
