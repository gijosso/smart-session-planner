import React from "react";
import { View } from "react-native";

interface SkeletonLoaderProps {
  /**
   * Width of the skeleton (default: "100%")
   */
  width?: number | string;
  /**
   * Height of the skeleton
   */
  height?: number | string;
  /**
   * Border radius (default: 8)
   */
  borderRadius?: number;
  /**
   * Additional className for styling
   */
  className?: string;
}

/**
 * Skeleton loader component for progressive loading states
 * Provides a shimmer effect placeholder while content loads
 */
export const SkeletonLoader = React.memo<SkeletonLoaderProps>(
  ({ width = "100%", height = 20, borderRadius = 8, className }) => {
    return (
      <View
        key={`skeleton-${width}-${height}-${borderRadius}-${className ?? ""}`}
        className={`bg-muted animate-pulse ${className ?? ""}`}
        style={{
          width: typeof width === "number" ? width : undefined,
          height: typeof height === "number" ? height : undefined,
          borderRadius:
            typeof borderRadius === "number" ? borderRadius : undefined,
        }}
      />
    );
  },
);

SkeletonLoader.displayName = "SkeletonLoader";

/**
 * Pre-configured skeleton loaders for common use cases
 */

export const SkeletonCard = React.memo(() => (
  <View className="bg-muted gap-3 rounded-lg p-4">
    <SkeletonLoader height={24} width="60%" />
    <SkeletonLoader height={16} width="100%" />
    <SkeletonLoader height={16} width="80%" />
  </View>
));

SkeletonCard.displayName = "SkeletonCard";

export const SkeletonList = React.memo<{ count?: number }>(({ count = 3 }) => (
  <View className="gap-3">
    {Array.from({ length: count }).map((_, index) => (
      <SkeletonCard key={index} />
    ))}
  </View>
));

SkeletonList.displayName = "SkeletonList";

export const SkeletonText = React.memo<{
  lines?: number;
  width?: string | number;
}>(({ lines = 3, width = "100%" }) => (
  <View className="gap-2">
    {Array.from({ length: lines }).map((_, index) => (
      <SkeletonLoader
        key={index}
        height={16}
        width={index === lines - 1 ? "80%" : width}
      />
    ))}
  </View>
));

SkeletonText.displayName = "SkeletonText";
