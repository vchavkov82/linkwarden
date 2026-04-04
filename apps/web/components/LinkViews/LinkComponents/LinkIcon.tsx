import { LinkIncludingShortenedCollectionAndTags } from "@linkwarden/types/global";
import Image from "next/image";
import isValidUrl from "@/lib/shared/isValidUrl";
import React, { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import { IconWeight } from "@phosphor-icons/react";
import clsx from "clsx";
import oklchVariableToHex from "@/lib/client/oklchVariableToHex";

function LinkIcon({
  link,
  className,
  hideBackground,
  compact,
  onClick,
}: {
  link: LinkIncludingShortenedCollectionAndTags;
  className?: string;
  hideBackground?: boolean;
  /** Smaller footprint for list rows */
  compact?: boolean;
  onClick?: Function;
}) {
  const iconSize = compact ? 22 : 30;
  const imgSize = compact ? 48 : 64;

  let iconClasses: string = clsx(
    "rounded flex item-center justify-center shadow select-none z-10",
    compact ? "w-9 h-9" : "w-12 h-12",
    !hideBackground &&
      "rounded-md backdrop-blur-xl bg-white/30 dark:bg-black/30 bg-opacity-50 p-1",
    className
  );

  const url =
    isValidUrl(link.url || "") && link.url ? new URL(link.url) : undefined;

  const [faviconLoaded, setFaviconLoaded] = useState(false);

  useEffect(() => {
    setFaviconLoaded(false);
  }, [link.url]);

  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={() => onClick && onClick()}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) onClick();
      }}
    >
      {link.icon ? (
        <div className={iconClasses}>
          <Icon
            icon={link.icon}
            size={iconSize}
            weight={(link.iconWeight || "regular") as IconWeight}
            color={link.color || oklchVariableToHex("--p")}
            className="m-auto"
          />
        </div>
      ) : link.type === "url" && url ? (
        <>
          <Image
            src={`/api/v1/getFavicon?url=${encodeURIComponent(url.origin)}`}
            width={imgSize}
            height={imgSize}
            alt=""
            unoptimized
            className={clsx(
              iconClasses,
              faviconLoaded ? "" : "absolute opacity-0"
            )}
            draggable="false"
            onLoad={() => setFaviconLoaded(true)}
          />
          {!faviconLoaded && (
            <LinkPlaceholderIcon
              iconClasses={iconClasses}
              icon="bi-link-45deg"
              compact={compact}
            />
          )}
        </>
      ) : link.type === "pdf" ? (
        <LinkPlaceholderIcon
          iconClasses={iconClasses}
          icon="bi-file-earmark-pdf"
          compact={compact}
        />
      ) : link.type === "image" ? (
        <LinkPlaceholderIcon
          iconClasses={iconClasses}
          icon="bi-file-earmark-image"
          compact={compact}
        />
      ) : // : link.type === "monolith" ? (
      //   <LinkPlaceholderIcon
      //     iconClasses={iconClasses + dimension}
      //     size={size}
      //     icon="bi-filetype-html"
      //   />
      // )
      undefined}
    </div>
  );
}

const LinkPlaceholderIcon = ({
  iconClasses,
  icon,
  compact,
}: {
  iconClasses: string;
  icon: string;
  compact?: boolean;
}) => {
  return (
    <div
      className={clsx(
        iconClasses,
        "aspect-square text-[oklch(var(--p))]",
        compact ? "text-2xl" : "text-4xl"
      )}
    >
      <i className={`${icon} m-auto`}></i>
    </div>
  );
};

export default React.memo(LinkIcon);
