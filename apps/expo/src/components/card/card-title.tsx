import React from "react";
import { Text } from "react-native";

import { cn } from "~/utils/cn";

export interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Card title component
 */
export const CardTitle = React.memo<CardTitleProps>(
  ({ className, children }) => {
    return (
      <Text
        className={cn("text-card-foreground text-2xl font-semibold", className)}
      >
        {children}
      </Text>
    );
  },
);

