import { useState, useEffect, useMemo, useCallback } from "react";

export interface BentoCardConfig {
  id: string;
  title: string;
  colSpan: 1 | 2 | 3 | 4 | 6 | 12;
  priority: number; // Higher number = placed higher in layout
  hasData: boolean;
  collapsed?: boolean;
}

export interface UseBentoAutoLayoutOptions {
  compactMode: boolean;
  autoAdjust: boolean;
  cards: BentoCardConfig[];
}

export function useBentoAutoLayout({ compactMode, autoAdjust, cards }: UseBentoAutoLayoutOptions) {
  const [collapsedCardIds, setCollapsedCardIds] = useState<Record<string, boolean>>({});

  const toggleCardCollapse = useCallback((id: string) => {
    setCollapsedCardIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }, []);

  const sortedCards = useMemo(() => {
    let result = [...cards];

    if (autoAdjust) {
      // Re-sort cards by priority (data intensity / risk score)
      result.sort((a, b) => b.priority - a.priority);
    }

    return result;
  }, [cards, autoAdjust]);

  // CSS Grid Auto-Layout Helper Classes
  const gridContainerClass = useMemo(() => {
    if (compactMode) {
      return "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 auto-rows-max grid-flow-dense";
    }
    return "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6 auto-rows-max grid-flow-dense";
  }, [compactMode]);

  const getCardSpanClass = useCallback(
    (colSpan: 1 | 2 | 3 | 4 | 6 | 12, isCollapsed?: boolean) => {
      if (isCollapsed) return "col-span-1 border-slate-800/60 opacity-80";

      switch (colSpan) {
        case 12:
          return "col-span-1 md:col-span-2 lg:col-span-3 xl:col-span-4";
        case 6:
          return "col-span-1 md:col-span-2 lg:col-span-3 xl:col-span-2";
        case 4:
          return "col-span-1 md:col-span-2 lg:col-span-3 xl:col-span-2";
        case 3:
          return "col-span-1 lg:col-span-1 xl:col-span-1";
        case 2:
          return "col-span-1 md:col-span-2 lg:col-span-2";
        default:
          return "col-span-1";
      }
    },
    []
  );

  return {
    sortedCards,
    collapsedCardIds,
    toggleCardCollapse,
    gridContainerClass,
    getCardSpanClass,
  };
}
