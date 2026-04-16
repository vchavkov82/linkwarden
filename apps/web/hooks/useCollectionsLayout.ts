import { useCallback, useEffect, useState } from "react";

export type CollectionsLayout = "card" | "list";

const STORAGE_KEY = "collectionsViewMode";

function readLayout(): CollectionsLayout {
  if (typeof window === "undefined") return "list";
  const v = localStorage.getItem(STORAGE_KEY);
  return v === "card" || v === "list" ? v : "list";
}

/**
 * Persists how collection folders are shown on /collections and nested collection lists.
 */
export function useCollectionsLayout() {
  const [layout, setLayoutState] = useState<CollectionsLayout>("list");

  useEffect(() => {
    setLayoutState(readLayout());
  }, []);

  const setLayout = useCallback((next: CollectionsLayout) => {
    localStorage.setItem(STORAGE_KEY, next);
    setLayoutState(next);
  }, []);

  return [layout, setLayout] as const;
}
