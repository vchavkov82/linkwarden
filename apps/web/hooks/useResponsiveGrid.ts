import { useEffect, useMemo, useState } from "react";
import useLocalSettingsStore from "@/store/localSettings";

const gridMap = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
  6: "grid-cols-6",
  7: "grid-cols-7",
  8: "grid-cols-8",
} as const;

const heightMap = {
  1: "h-44",
  2: "h-40",
  3: "h-36",
  4: "h-32",
  5: "h-28",
  6: "h-24",
  7: "h-20",
  8: "h-20",
} as const;

type ColumnCount = keyof typeof gridMap;

function getColumnCount(): ColumnCount {
  const width = window.innerWidth;
  if (width >= 1901) return 5;
  if (width >= 1501) return 4;
  if (width >= 881) return 3;
  if (width >= 551) return 2;
  return 1;
}

export function useResponsiveGrid() {
  const settings = useLocalSettingsStore((state) => state.settings);

  const [columnCount, setColumnCount] = useState<ColumnCount>(
    (settings.columns || getColumnCount()) as ColumnCount
  );

  const gridColClass = useMemo(
    () => gridMap[columnCount],
    [columnCount]
  );

  const imageHeightClass = useMemo(
    () => (columnCount ? heightMap[columnCount] : "h-40"),
    [columnCount]
  );

  useEffect(() => {
    const handleResize = () => {
      if (settings.columns === 0) {
        setColumnCount(getColumnCount());
      }
    };

    if (settings.columns === 0) {
      window.addEventListener("resize", handleResize);
    }

    setColumnCount((settings.columns || getColumnCount()) as ColumnCount);

    return () => {
      if (settings.columns === 0) {
        window.removeEventListener("resize", handleResize);
      }
    };
  }, [settings.columns]);

  return { columnCount, gridColClass, imageHeightClass };
}
