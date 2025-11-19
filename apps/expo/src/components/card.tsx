import React from "react";
import type { ViewProps } from "react-native";
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

/**
 * Card primitive component for Expo
 * A container component with consistent styling and variants
 */
export const Card = React.memo<CardProps>(({
  variant = "default",
  className,
  children,
  ...props
}) => {

  return (
    <View
      className={cn(
        "rounded-xl p-4 shadow-sm",
        VARIANT_STYLES[variant],
        className,
      )}
      {...props}
    >
      {children}
    </View>
  );
});

export interface CardHeaderProps extends ViewProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Card header component
 */
export const CardHeader = React.memo<CardHeaderProps>(({
  className,
  children,
  ...props
}) => {
  return (
    <View className={cn("mb-2 flex flex-col gap-1", className)} {...props}>
      {children}
    </View>
  );
});

export interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Card title component
 */
export const CardTitle = React.memo<CardTitleProps>(({
  className,
  children,
}) => {
  return (
    <Text
      className={cn("text-card-foreground text-lg font-semibold", className)}
    >
      {children}
    </Text>
  );
});

export interface CardDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Card description component
 */
export const CardDescription = React.memo<CardDescriptionProps>(({
  className,
  children,
}) => {
  return (
    <Text className={cn("text-muted-foreground text-sm", className)}>
      {children}
    </Text>
  );
});

export interface CardContentProps extends ViewProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Card content component
 */
export const CardContent = React.memo<CardContentProps>(({
  className,
  children,
  ...props
}) => {
  return (
    <View className={cn("pt-2", className)} {...props}>
      {children}
    </View>
  );
});

export interface CardFooterProps extends ViewProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Card footer component
 */
export const CardFooter = React.memo<CardFooterProps>(({
  className,
  children,
  ...props
}) => {
  return (
    <View
      className={cn("mt-4 flex flex-row items-center gap-2", className)}
      {...props}
    >
      {children}
    </View>
  );
});
