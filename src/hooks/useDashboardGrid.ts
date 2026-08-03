import { useMemo } from "react";

export interface GridItemConfig {
  id: string;
  w: number; // width in grid columns (1-12)
  h: number; // height unit
  x: number;
  y: number;
  intensity: number; // data intensity / usage score
}

export function useDashboardGrid(panelOrder: string[], panelScores?: Record<string, number>) {
  const gridLayout = useMemo(() => {
    const cols = 12;
    let currentX = 0;
    let currentY = 0;
    let maxRowHeight = 0;

    const items: GridItemConfig[] = panelOrder.map((id) => {
      const score = panelScores?.[id] ?? 5;
      // Calculate width based on score/importance (6 for high priority, 12 for full width, 4 for standard)
      let w = 12;
      if (id === "metrics" || id === "visual") w = 12;
      else if (id === "scope" || id === "column" || id === "status") w = 6;
      else w = 6;

      const h = Math.max(1, Math.ceil(score / 3));

      if (currentX + w > cols) {
        currentX = 0;
        currentY += maxRowHeight || 1;
        maxRowHeight = 0;
      }

      const item: GridItemConfig = {
        id,
        w,
        h,
        x: currentX,
        y: currentY,
        intensity: score,
      };

      currentX += w;
      maxRowHeight = Math.max(maxRowHeight, h);

      return item;
    });

    return items;
  }, [panelOrder, panelScores]);

  return { gridLayout };
}
