import {
  CollectionIncludingMembersAndLinkCount,
  LinkIncludingShortenedCollectionAndTags,
} from "@linkwarden/types/global";
import React, { useState } from "react";
import unescapeString from "@/lib/client/unescapeString";
import LinkActions from "@/components/LinkViews/LinkComponents/LinkActions";
import LinkDate from "@/components/LinkViews/LinkComponents/LinkDate";
import LinkCollection from "@/components/LinkViews/LinkComponents/LinkCollection";
import LinkIcon from "@/components/LinkViews/LinkComponents/LinkIcon";
import { cn, isPWA } from "@/lib/utils";
import toast from "react-hot-toast";
import LinkTypeBadge from "./LinkTypeBadge";
import useLocalSettingsStore from "@/store/localSettings";
import LinkPin from "./LinkPin";
import { atLeastOneFormatAvailable } from "@linkwarden/lib/formatStats";
import LinkFormats from "./LinkFormats";
import openLink from "@/lib/client/openLink";
import { useDraggable } from "@dnd-kit/core";
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
  count: number;
  className?: string;
  editMode?: boolean;
};

function LinkList({
  link,
  collection,
  isPublicRoute,
  t,
  disableDraggable,
  user,
  isSelected,
  toggleSelected,
  editMode,
}: Props) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
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

  const [linkModal, setLinkModal] = useState(false);

  return (
    <>
      <div
        ref={setNodeRef}
        className={cn(
          "rounded-md border relative group items-center flex",
          isSelected
            ? "border border-primary bg-base-300"
            : "border-transparent",
          !isPWA() ? "hover:bg-base-300 px-1.5 py-0.5" : "py-0.5",
          isDragging ? "opacity-30" : "opacity-100",
          "duration-200, touch-manipulation select-none"
        )}
        onClick={() =>
          editMode
            ? toggleSelected(link.id as number)
            : editMode
              ? toast.error(t("link_selection_error"))
              : undefined
        }
      >
        <div
          className="flex items-center cursor-pointer w-full min-h-10 gap-2 min-w-0"
          onClick={() =>
            !editMode && openLink(link, user, () => setLinkModal(true))
          }
          {...attributes}
          {...listeners}
        >
          {show.icon && (
            <div className="shrink-0">
              <LinkIcon link={link} hideBackground compact />
            </div>
          )}

          <div className="min-w-0 flex-1 pr-20">
            {show.name && (
              <div className="flex gap-1 items-center min-w-0">
                <p className="truncate text-primary text-sm leading-snug">
                  {unescapeString(link.name)}
                </p>
                {show.preserved_formats &&
                  link.type === "url" &&
                  atLeastOneFormatAvailable(link) && (
                    <div className="shrink-0 pl-0.5 inline-flex text-base leading-none">
                      <LinkFormats link={link} />
                    </div>
                  )}
              </div>
            )}

            <div className="mt-0.5 flex flex-row flex-wrap items-center gap-x-2 gap-y-0 text-[11px] leading-tight text-neutral">
              {show.link && <LinkTypeBadge link={link} />}
              {show.collection && collection && (
                <LinkCollection
                  link={link}
                  collection={collection}
                  isPublicRoute={isPublicRoute}
                />
              )}
              {show.date && <LinkDate link={link} />}
            </div>
          </div>
        </div>
        {!isPublicRoute && (
          <LinkPin
            link={link}
            btnStyle="!top-1.5 !right-[2.35rem] h-7 w-7 [&_i]:text-lg"
          />
        )}
        <LinkActions
          link={link}
          linkModal={linkModal}
          t={t}
          setLinkModal={(e) => setLinkModal(e)}
          className="absolute top-1.5 right-2 group-hover:opacity-100 group-focus-within:opacity-100 opacity-0 duration-100 text-neutral z-20"
        />
      </div>
      <div className="last:hidden rounded-none my-0 mx-1 border-t border-base-300 h-[1px]"></div>
    </>
  );
}

export default React.memo(LinkList);
