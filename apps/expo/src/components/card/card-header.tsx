import type { ViewProps } from "react-native";
import React from "react";
import { View } from "react-native";

import { cn } from "~/utils/cn";

export interface CardHeaderProps extends ViewProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Card header component
 */
export const CardHeader = React.memo<CardHeaderProps>(
  ({ className, children, ...props }) => {
    return (
      <View className={cn("flex flex-col", className)} {...props}>
        {children}
      </View>
    );
  },
);

