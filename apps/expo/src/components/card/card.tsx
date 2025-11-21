import type { ViewProps } from "react-native";
import React from "react";
import { View } from "react-native";

import { cn } from "~/utils/cn";

export interface CardProps extends ViewProps {
  variant?: "default" | "outline" | "muted";
  children: React.ReactNode;
  className?: string;
}

const VARIANT_STYLES = {
  default: "bg-card border border-border",
  outline: "bg-transparent border border-border",
  muted: "bg-muted border border-transparent",
} as const;

const SHADOW_STYLES = {
  default: "shadow-none",
  outline: "shadow-none",
  muted: "shadow-none",
} as const;

/**
 * Card primitive component for Expo
 * A container component with consistent styling and variants
 */
export const Card = React.memo<CardProps>(
  ({ variant = "default", className, children, ...props }) => {
    return (
      <View
        key={`card-${variant}-${className ?? ""}`}
        className={cn(
          "gap-6 rounded-3xl p-6",
          VARIANT_STYLES[variant],
          SHADOW_STYLES[variant],
          className,
        )}
        {...props}
      >
        {children}
      </View>
    );
  },
);
