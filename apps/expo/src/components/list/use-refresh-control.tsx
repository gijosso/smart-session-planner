import type React from "react";
import type { RefreshControlProps } from "react-native";
import { useMemo } from "react";
import { RefreshControl } from "react-native";

interface UseRefreshControlOptions {
  isLoading?: boolean;
  onRefresh?: () => void;
  horizontal?: boolean;
}

/**
 * Hook to create a refresh control for lists
 * Returns undefined if refresh is not needed (horizontal lists or no onRefresh handler)
 */
export const useRefreshControl = ({
  isLoading = false,
  onRefresh,
  horizontal = false,
}: UseRefreshControlOptions):
  | React.ReactElement<RefreshControlProps>
  | undefined => {
  return useMemo(() => {
    if (!onRefresh || horizontal) {
      return undefined;
    }
    return <RefreshControl refreshing={isLoading} onRefresh={onRefresh} />;
  }, [isLoading, onRefresh, horizontal]);
};
