import type { ViewProps } from "react-native";
import React from "react";
import { View } from "react-native";

import { cn } from "~/utils/cn";

export interface CardContentProps extends ViewProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Card content component
 */
export const CardContent = React.memo<CardContentProps>(
  ({ className, children, ...props }) => {
    return (
      <View key={`card-content-${className ?? ""}`} className={cn("gap-2", className)} {...props}>
        {children}
      </View>
    );
  },
);

