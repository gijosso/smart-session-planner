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

export type ButtonSize = "default" | "sm" | "md" | "lg" | "icon";

export interface ButtonProps extends Omit<PressableProps, "children"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
  className?: string;
  textClassName?: string;
  // Accessibility props are passed through via PressableProps
}

const VARIANT_STYLES = {
  default: "bg-primary active:bg-primary/90",
  destructive: "bg-destructive active:bg-destructive/90",
  outline: "bg-transparent border border-border",
  secondary: "bg-secondary active:bg-secondary/90 border border-border",
  ghost: "bg-transparent active:bg-primary/10",
  link: "bg-transparent active:bg-primary/10",
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
  md: "h-12 px-4",
  lg: "h-14 px-6",
  icon: "h-10 w-10",
} as const;

const TEXT_SIZE_STYLES = {
  default: "text-sm",
  sm: "text-sm",
  md: "text-md",
  lg: "text-base",
  icon: "text-base",
} as const;

const SHADOW_STYLES = {
  default: "shadow-none",
  destructive: "shadow-none",
  outline: "shadow-none",
  secondary: "shadow-none",
  ghost: "shadow-none",
  link: "shadow-none",
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
          "items-center justify-center rounded-3xl",
          VARIANT_STYLES[variant],
          SHADOW_STYLES[variant],
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
