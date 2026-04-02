import Image from "next/image";
import React from "react";
import { useInView } from "react-intersection-observer";
import { cn } from "@/lib/utils";

/** Matches `ArchivedFormat.jpeg` in @linkwarden/types (avoid importing workspace package in this leaf component). */
const ARCHIVE_FORMAT_JPEG = 1;

type Props = {
  linkId: number;
  updatedAt: string | Date | undefined;
  imageHeightClass: string;
  iconBlur?: boolean;
  imageClassName: string;
};

/**
 * Mounts the archive preview image only near the viewport to avoid
 * many simultaneous /api/v1/archives requests on first paint.
 */
function LazyLinkPreview({
  linkId,
  updatedAt,
  imageHeightClass,
  iconBlur,
  imageClassName,
}: Props) {
  const { ref, inView } = useInView({
    triggerOnce: true,
    rootMargin: "200px 0px",
  });

  return (
    <div ref={ref} className={cn("relative w-full", imageHeightClass)}>
      {inView ? (
        <Image
          src={`/api/v1/archives/${linkId}?format=${ARCHIVE_FORMAT_JPEG}&preview=true&updatedAt=${updatedAt}`}
          width={1280}
          height={720}
          alt=""
          className={imageClassName}
          style={iconBlur ? { filter: "blur(1px)" } : undefined}
          draggable={false}
          loading="lazy"
          onError={(e) => {
            const target = e.target as HTMLElement;
            target.style.display = "none";
          }}
          unoptimized
        />
      ) : (
        <div
          className={cn(
            imageHeightClass,
            "w-full bg-opacity-80 skeleton rounded-none"
          )}
        />
      )}
    </div>
  );
}

export default React.memo(LazyLinkPreview);
