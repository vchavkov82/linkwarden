import Link from "next/link";
import {
  AccountSettings,
  CollectionIncludingMembersAndLinkCount,
} from "@linkwarden/types/global";
import React, { useState } from "react";
import ProfilePhoto from "./ProfilePhoto";
import usePermissions from "@/hooks/usePermissions";
import getPublicUserData from "@/lib/client/getPublicUserData";
import { useQuery } from "@tanstack/react-query";
import EditCollectionModal from "./ModalContent/EditCollectionModal";
import EditCollectionSharingModal from "./ModalContent/EditCollectionSharingModal";
import DeleteCollectionModal from "./ModalContent/DeleteCollectionModal";
import { useTranslation } from "next-i18next";
import { useUser } from "@linkwarden/router/user";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "./ui/button";
import Icon from "@/components/Icon";
import { IconWeight } from "@phosphor-icons/react";
import { cn } from "@linkwarden/lib";

export default function CollectionCard({
  collection,
  variant = "card",
}: {
  collection: CollectionIncludingMembersAndLinkCount;
  variant?: "card" | "list";
}) {
  const { t } = useTranslation();
  const { data: user } = useUser();

  const formattedDate = new Date(collection.createdAt as string).toLocaleString(
    t("locale"),
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    }
  );

  const permissions = usePermissions(collection.id as number);

  const isOwnCollection = collection.ownerId === user?.id;

  const { data: remoteOwner } = useQuery<Partial<AccountSettings>>({
    queryKey: ["publicUser", collection.ownerId],
    queryFn: () => getPublicUserData(collection.ownerId as number),
    enabled: !isOwnCollection && !!collection.ownerId,
    staleTime: 1000 * 60 * 5,
  });

  const collectionOwner: Partial<AccountSettings> = isOwnCollection
    ? {
        id: user?.id as number,
        name: user?.name,
        username: user?.username as string,
        image: user?.image as string,
        archiveAsScreenshot: user?.archiveAsScreenshot as boolean,
        archiveAsMonolith: user?.archiveAsMonolith as boolean,
        archiveAsPDF: user?.archiveAsPDF as boolean,
      }
    : (remoteOwner ?? {});

  const [editCollectionModal, setEditCollectionModal] = useState(false);
  const [editCollectionSharingModal, setEditCollectionSharingModal] =
    useState(false);
  const [deleteCollectionModal, setDeleteCollectionModal] = useState(false);

  const menu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "z-20",
            variant === "list"
              ? "absolute top-1.5 right-2 h-8 w-8"
              : "absolute top-3 right-3"
          )}
        >
          <i title={t("more")} className="bi-three-dots text-xl text-neutral" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        sideOffset={4}
        side="bottom"
        align="end"
        className="z-[30]"
      >
        {permissions === true && (
          <DropdownMenuItem onSelect={() => setEditCollectionModal(true)}>
            <i className="bi-pencil-square" />
            {t("edit_collection_info")}
          </DropdownMenuItem>
        )}

        <DropdownMenuItem
          onSelect={() => setEditCollectionSharingModal(true)}
        >
          <i className="bi-globe" />
          {permissions === true ? t("share_and_collaborate") : t("view_team")}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onSelect={() => setDeleteCollectionModal(true)}
          className="text-error"
        >
          {permissions === true ? (
            <>
              <i className="bi-trash" />
              {t("delete_collection")}
            </>
          ) : (
            <>
              <i className="bi-box-arrow-left" />
              {t("leave_collection")}
            </>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const modals = (
    <>
      {editCollectionModal && (
        <EditCollectionModal
          onClose={() => setEditCollectionModal(false)}
          activeCollection={collection}
        />
      )}
      {editCollectionSharingModal && (
        <EditCollectionSharingModal
          onClose={() => setEditCollectionSharingModal(false)}
          activeCollection={collection}
        />
      )}
      {deleteCollectionModal && (
        <DeleteCollectionModal
          onClose={() => setDeleteCollectionModal(false)}
          activeCollection={collection}
        />
      )}
    </>
  );

  const memberAvatars = (maxMemberFaces: number) => {
    const compact = maxMemberFaces === 2;
    const overflow = Math.max(0, collection.members.length - maxMemberFaces);
    return (
      <>
        {collectionOwner.id && (
          <ProfilePhoto
            src={collectionOwner.image || undefined}
            name={collectionOwner.name}
            className={compact ? "!w-6 !h-6 [&_span]:!text-sm" : undefined}
          />
        )}
        {collection.members
          .sort((a, b) => (a.userId as number) - (b.userId as number))
          .map((e, i) => {
            return (
              <ProfilePhoto
                key={i}
                src={e.user.image ? e.user.image : undefined}
                name={e.user.name}
                className={cn(
                  compact ? "!w-6 !h-6 [&_span]:!text-sm" : undefined,
                  "-ml-3"
                )}
              />
            );
          })
          .slice(0, maxMemberFaces)}
        {overflow > 0 && (
          <div
            className={cn(
              "avatar drop-shadow-md placeholder -ml-3",
              compact && "!w-6 !h-6"
            )}
          >
            <div
              className={cn(
                "bg-base-100 text-neutral rounded-full ring-2 ring-neutral-content flex items-center justify-center",
                compact ? "w-6 h-6 text-[10px]" : "w-8 h-8"
              )}
            >
              <span>+{overflow}</span>
            </div>
          </div>
        )}
      </>
    );
  };

  if (variant === "list") {
    return (
      <div className="relative flex items-stretch rounded-md border border-neutral-content bg-base-100/90 dark:bg-base-200/40 hover:bg-base-200/80 dark:hover:bg-base-200/70 duration-200 shadow-sm group">
        {menu}
        <div className="flex flex-1 min-w-0 items-center pr-11">
          <Link
            href={`/collections/${collection.id}`}
            className="flex flex-1 min-w-0 items-center gap-2 py-2 pl-2 sm:pl-3 touch-manipulation"
          >
            <div
              className="shrink-0 flex items-center justify-center w-9 h-9 rounded-md"
              style={{
                backgroundColor: `${collection.color}28`,
              }}
            >
              {collection.icon ? (
                <Icon
                  icon={collection.icon}
                  size={22}
                  weight={(collection.iconWeight || "regular") as IconWeight}
                  color={collection.color}
                />
              ) : (
                <i
                  className="bi-folder-fill text-lg"
                  style={{ color: collection.color }}
                />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold leading-snug">
                {collection.name}
              </p>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0 text-[11px] leading-tight text-neutral">
                {collection.isPublic && (
                  <i
                    className="bi-globe2 shrink-0"
                    title={t("collection_publicly_shared")}
                  />
                )}
                <span className="inline-flex items-center gap-0.5 shrink-0">
                  <i className="bi-link-45deg" title={t("links")} />
                  {collection._count?.links ?? 0}
                </span>
                <span className="inline-flex items-center gap-0.5 shrink-0">
                  <i className="bi-calendar3" />
                  {formattedDate}
                </span>
              </div>
            </div>
          </Link>
          <div
            className="hidden sm:flex items-center shrink-0 pl-1 pr-1 cursor-pointer rounded-md hover:bg-base-content/10 py-1"
            onClick={(e) => {
              e.preventDefault();
              setEditCollectionSharingModal(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setEditCollectionSharingModal(true);
              }
            }}
            role="button"
            tabIndex={0}
          >
            <div className="flex items-center">{memberAvatars(2)}</div>
          </div>
        </div>
        {modals}
      </div>
    );
  }

  return (
    <div className="relative">
      {menu}

      <div
        className="flex items-center absolute bottom-3 left-3 z-10 px-1 py-1 rounded-full cursor-pointer hover:bg-base-content/20 transition-colors duration-200"
        onClick={() => setEditCollectionSharingModal(true)}
      >
        {memberAvatars(3)}
      </div>
      <Link
        href={`/collections/${collection.id}`}
        style={{
          backgroundImage: `linear-gradient(45deg, ${collection.color}30 10%, ${
            user?.theme === "dark" ? "oklch(var(--b2))" : "oklch(var(--b2))"
          } 50%, ${
            user?.theme === "dark" ? "oklch(var(--b2))" : "oklch(var(--b2))"
          } 100%)`,
        }}
        className="card card-compact shadow-md hover:shadow-none duration-200 border border-neutral-content"
      >
        <div className="card-body flex flex-col justify-between min-h-[12rem]">
          <div className="flex justify-between">
            <p className="card-title break-words line-clamp-2 w-full">
              {collection.name}
            </p>
            <div className="w-8 h-8 ml-10"></div>
          </div>

          <div className="flex justify-end items-center">
            <div className="text-right">
              <div className="font-bold text-sm flex justify-end gap-1 items-center">
                {collection.isPublic && (
                  <i
                    className="bi-globe2 drop-shadow text-neutral"
                    title={t("collection_publicly_shared")}
                  ></i>
                )}
                <i
                  className="bi-link-45deg text-lg text-neutral"
                  title={t("links")}
                ></i>
                {collection._count && collection._count.links}
              </div>
              <div className="flex items-center justify-end gap-1 text-neutral">
                <p className="font-bold text-xs flex gap-1 items-center">
                  <i
                    className="bi-calendar3 text-neutral"
                    title={t("collection_publicly_shared")}
                  ></i>
                  {formattedDate}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Link>
      {modals}
    </div>
  );
}
