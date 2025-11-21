import type { ViewProps } from "react-native";
import React from "react";
import { Text, View } from "react-native";

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
      <View className={cn("gap-2", className)} {...props}>
        {children}
      </View>
    );
  },
);

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
        className={cn("flex flex-row items-center gap-2", className)}
        {...props}
      >
        {children}
      </View>
    );
  },
);
