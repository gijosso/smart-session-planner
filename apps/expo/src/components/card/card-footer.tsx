import type { ViewProps } from "react-native";
import React from "react";
import { View } from "react-native";

import { cn } from "~/utils/cn";

export interface CardFooterProps extends ViewProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Card footer component
 */
export const CardFooter = React.memo<CardFooterProps>(
  ({ className, children, ...props }) => {
    return (
      <View
        key={`card-footer-${className ?? ""}`}
        className={cn("flex flex-row items-center gap-2", className)}
        {...props}
      >
        {children}
      </View>
    );
  },
);

