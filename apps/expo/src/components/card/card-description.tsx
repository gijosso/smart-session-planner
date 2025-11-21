import React from "react";
import { Text } from "react-native";

import { cn } from "~/utils/cn";

export interface CardDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Card description component
 */
export const CardDescription = React.memo<CardDescriptionProps>(
  ({ className, children }) => {
    return (
      <Text className={cn("text-muted-foreground text-sm", className)}>
        {children}
      </Text>
    );
  },
);

