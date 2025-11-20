import type { PressableProps } from "react-native";
import React from "react";
import { Pressable, Text, View } from "react-native";

import { cn } from "~/utils/cn";

export type ButtonVariant =
  | "default"
  | "destructive"
  | "outline"
  | "secondary"
  | "ghost"
  | "link";

export type ButtonSize = "default" | "sm" | "lg" | "icon";

export interface ButtonProps extends Omit<PressableProps, "children"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
  className?: string;
  textClassName?: string;
}

const VARIANT_STYLES = {
  default: "bg-black active:bg-black/90",
  destructive: "bg-destructive active:bg-destructive/90",
  outline:
    "bg-transparent border border-border active:bg-accent dark:bg-input/30 dark:border-input dark:active:bg-input/50",
  secondary: "bg-secondary active:bg-secondary/80",
  ghost: "bg-transparent active:bg-accent dark:active:bg-accent/50",
  link: "bg-transparent",
} as const;

const TEXT_VARIANT_STYLES = {
  default: "text-primary-foreground",
  destructive: "text-destructive-foreground",
  outline: "text-foreground",
  secondary: "text-secondary-foreground",
  ghost: "text-foreground",
  link: "text-primary underline",
} as const;

const SIZE_STYLES = {
  default: "h-10 px-4",
  sm: "h-8 px-3",
  lg: "h-11 px-6",
  icon: "h-10 w-10",
} as const;

const TEXT_SIZE_STYLES = {
  default: "text-sm",
  sm: "text-sm",
  lg: "text-base",
  icon: "text-base",
} as const;

/**
 * Button primitive component for Expo
 * A pressable button with consistent styling and variants
 */
export const Button = React.memo<ButtonProps>(
  ({
    variant = "default",
    size = "default",
    className,
    textClassName,
    children,
    disabled,
    ...props
  }) => {
    const isIconOnly = size === "icon";

    return (
      <Pressable
        className={cn(
          "items-center justify-center rounded-lg shadow-xs",
          VARIANT_STYLES[variant],
          SIZE_STYLES[size],
          disabled && "opacity-50",
          className,
        )}
        disabled={disabled}
        {...props}
      >
        {({ pressed }) => (
          <View
            className={cn(
              "flex flex-row items-center justify-center gap-2",
              pressed && variant !== "link" && "opacity-80",
            )}
          >
            {typeof children === "string" ? (
              <Text
                className={cn(
                  "font-medium",
                  TEXT_VARIANT_STYLES[variant],
                  TEXT_SIZE_STYLES[size],
                  isIconOnly && "hidden",
                  textClassName,
                )}
              >
                {children}
              </Text>
            ) : (
              children
            )}
          </View>
        )}
      </Pressable>
    );
  },
);
