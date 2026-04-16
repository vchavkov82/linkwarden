import {
  CollectionIncludingMembersAndLinkCount,
  LinkIncludingShortenedCollectionAndTags,
} from "@linkwarden/types/global";
import React, { useRef, useState } from "react";
import unescapeString from "@/lib/client/unescapeString";
import LinkActions from "@/components/LinkViews/LinkComponents/LinkActions";
import LinkDate from "@/components/LinkViews/LinkComponents/LinkDate";
import LinkCollection from "@/components/LinkViews/LinkComponents/LinkCollection";
import {
  atLeastOneFormatAvailable,
  formatAvailable,
} from "@linkwarden/lib/formatStats";
import LazyLinkPreview from "./LazyLinkPreview";
import Link from "next/link";
import LinkIcon from "./LinkIcon";
import toast from "react-hot-toast";
import LinkTypeBadge from "./LinkTypeBadge";
import useLocalSettingsStore from "@/store/localSettings";
import clsx from "clsx";
import LinkPin from "./LinkPin";
import LinkFormats from "./LinkFormats";
import openLink from "@/lib/client/openLink";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@linkwarden/lib/utils";
import { TFunction } from "i18next";

type Props = {
  link: LinkIncludingShortenedCollectionAndTags;
  collection: CollectionIncludingMembersAndLinkCount;
  isPublicRoute: boolean;
  t: TFunction<"translation", undefined>;
  disableDraggable: boolean;
  user: any;
  isSelected: boolean;
  toggleSelected: (id: number) => void;
  imageHeightClass: string;
  editMode?: boolean;
};

function LinkMasonry({
  link,
  collection,
  isPublicRoute,
  t,
  disableDraggable,
  user,
  isSelected,
  toggleSelected,
  imageHeightClass,
  editMode,
}: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    isDragging,
    transform,
    transition,
  } = useSortable({
    id: link.id?.toString() ?? "",
    data: {
      linkId: link.id,
      link,
    },
    disabled: disableDraggable,
  });

  const {
    settings: { show },
  } = useLocalSettingsStore();

  const ref = useRef<HTMLDivElement>(null);

  const [linkModal, setLinkModal] = useState(false);

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        "border border-solid border-neutral-content bg-base-200 shadow-md hover:shadow-none duration-100 rounded-xl relative group",
        isSelected && "border-primary bg-base-300"
      )}
      onClick={() =>
        editMode
          ? toggleSelected(link.id as number)
          : editMode
            ? toast.error(t("link_selection_error"))
            : undefined
      }
    >
      {!isPublicRoute && (
        <input
          type="checkbox"
          className="checkbox checkbox-sm absolute top-2 left-2 z-20 opacity-0 group-hover:opacity-100 checked:opacity-100 cursor-pointer"
          checked={isSelected}
          onChange={() => toggleSelected(link.id as number)}
          onClick={(e) => e.stopPropagation()}
        />
      )}
      <div ref={ref}>
        <div
          className="rounded-xl cursor-pointer"
          onClick={() =>
            !editMode && openLink(link, user, () => setLinkModal(true))
          }
          {...listeners}
          {...attributes}
        >
          {show.image && formatAvailable(link, "preview") && (
            <div>
              <div className="relative rounded-t-xl overflow-hidden">
                {formatAvailable(link, "preview") ? (
                  <LazyLinkPreview
                    linkId={link.id as number}
                    updatedAt={link.updatedAt}
                    imageHeightClass={imageHeightClass}
                    iconBlur={show.icon}
                    imageClassName={`rounded-t-xl select-none object-cover z-10 ${imageHeightClass} w-full shadow opacity-80 scale-105`}
                  />
                ) : link.preview === "unavailable" ? null : (
                  <div
                    className={`duration-100 ${imageHeightClass} bg-opacity-80 skeleton rounded-none`}
                  ></div>
                )}
                {show.icon && (
                  <div className="absolute top-0 left-0 right-0 bottom-0 rounded-t-xl flex items-center justify-center rounded-md">
                    <LinkIcon link={link} />
                  </div>
                )}
              </div>

              <Separator />
            </div>
          )}

          <div className="p-3 flex flex-col gap-2 h-full min-h-14">
            {show.name && (
              <div className="hyphens-auto w-full text-primary text-sm">
                {unescapeString(link.name)}
                {show.preserved_formats &&
                  link.type === "url" &&
                  atLeastOneFormatAvailable(link) && (
                    <div className="pl-1 inline-block">
                      <LinkFormats link={link} />
                    </div>
                  )}
              </div>
            )}

            {show.link && <LinkTypeBadge link={link} />}

            {show.description && link.description && (
              <p className={clsx("hyphens-auto text-sm w-full")}>
                {unescapeString(link.description)}
              </p>
            )}

            {show.tags && link.tags && link.tags[0] && (
              <div className="flex gap-1 items-center flex-wrap">
                {link.tags.map((e, i) => (
                  <Button variant="ghost" size="sm" key={i}>
                    <Link
                      href={"/tags/" + e.id}
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                      className="truncate max-w-[19rem]"
                    >
                      #{e.name}
                    </Link>
                  </Button>
                ))}
              </div>
            )}
          </div>

          {(show.collection || show.date) && (
            <div>
              <Separator className="mb-1" />

              <div className="flex flex-wrap justify-between items-center text-xs text-neutral px-3 pb-1 w-full gap-x-2">
                {!isPublicRoute && show.collection && collection && (
                  <div className="cursor-pointer truncate">
                    <LinkCollection
                      link={link}
                      collection={collection}
                      isPublicRoute={isPublicRoute}
                    />
                  </div>
                )}
                {show.date && <LinkDate link={link} />}
              </div>
            </div>
          )}
        </div>

        {/* Overlay on hover */}
        <div className="absolute pointer-events-none top-0 left-0 right-0 bottom-0 bg-base-100 bg-opacity-0 group-hover:bg-opacity-20 group-focus-within:opacity-20 rounded-xl duration-100"></div>
        <LinkActions
          link={link}
          linkModal={linkModal}
          t={t}
          setLinkModal={(e) => setLinkModal(e)}
          className="absolute top-3 right-3 group-hover:opacity-100 group-focus-within:opacity-100 opacity-0 duration-100 text-neutral z-20"
        />
        {!isPublicRoute && <LinkPin link={link} />}
      </div>
    </div>
  );
}

export default React.memo(LinkMasonry);
