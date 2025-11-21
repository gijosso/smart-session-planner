import type { LegendListRef } from "@legendapp/list";
import { useEffect, useRef } from "react";

export const useScrollToTop = (
  listRef: React.RefObject<LegendListRef | null>,
  horizontal: boolean,
  hasItems: boolean,
) => {
  // Track animation frame IDs for cleanup
  const rafId1Ref = useRef<number | null>(null);
  const rafId2Ref = useRef<number | null>(null);

  // Scroll to top when component mounts or when suggestions change
  useEffect(() => {
    if (!horizontal && listRef.current && hasItems) {
      // Use requestAnimationFrame to ensure the list is fully laid out
      rafId1Ref.current = requestAnimationFrame(() => {
        rafId2Ref.current = requestAnimationFrame(() => {
          // Double RAF to ensure layout is complete
          listRef.current?.scrollToOffset({ offset: 0, animated: false });
        });
      });
    }

    // Cleanup: cancel animation frames if component unmounts
    return () => {
      if (rafId1Ref.current !== null) {
        cancelAnimationFrame(rafId1Ref.current);
        rafId1Ref.current = null;
      }
      if (rafId2Ref.current !== null) {
        cancelAnimationFrame(rafId2Ref.current);
        rafId2Ref.current = null;
      }
    };
  }, [horizontal, hasItems]); // Removed listRef from dependencies - refs are stable
};
