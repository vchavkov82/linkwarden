type PreviewStateLink = {
  clientSide?: boolean | null;
  preview?: string | null;
};

export function shouldGeneratePreviewOnDemand(
  link: PreviewStateLink | null | undefined
) {
  if (!link) return false;
  if (link.clientSide) return false;
  return link.preview !== "unavailable";
}

export function hasPendingServerManagedPreview(
  links: PreviewStateLink[] | null | undefined
) {
  return (
    links?.some(
      (link) =>
        !link.clientSide &&
        !link.preview?.startsWith("archives") &&
        link.preview !== "unavailable"
    ) ?? false
  );
}
