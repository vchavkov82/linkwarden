import React from "react";

export type LinkPreviewThumbContextValue = {
  /** When true, thumbnails load only after the row is viewable (FlatList). */
  deferArchiveThumbnails: boolean;
  isArchiveThumbReady: (linkId: number) => boolean;
};

const defaultValue: LinkPreviewThumbContextValue = {
  deferArchiveThumbnails: false,
  isArchiveThumbReady: () => true,
};

export const LinkPreviewThumbContext =
  React.createContext<LinkPreviewThumbContextValue>(defaultValue);

export function useLinkPreviewThumbContext() {
  return React.useContext(LinkPreviewThumbContext);
}
