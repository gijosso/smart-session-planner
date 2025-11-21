import type { LegendListRef } from "@legendapp/list";
import { useEffect } from "react";

export const useScrollToTop = (
  listRef: React.RefObject<LegendListRef | null>,
  horizontal: boolean,
  hasItems: boolean,
) => {
  // Scroll to top when component mounts or when suggestions change
  useEffect(() => {
    if (!horizontal && listRef.current && hasItems) {
      // Use requestAnimationFrame to ensure the list is fully laid out
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // Double RAF to ensure layout is complete
          listRef.current?.scrollToOffset({ offset: 0, animated: false });
        });
      });
    }
  }, [horizontal, listRef, hasItems]);
};
