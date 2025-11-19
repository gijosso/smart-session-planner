import type React from "react";
import type { PressableProps } from "react-native";
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

/**
 * Button primitive component for Expo
 * A pressable button with consistent styling and variants
 */
export const Button: React.FC<ButtonProps> = ({
  variant = "default",
  size = "default",
  className,
  textClassName,
  children,
  disabled,
  ...props
}) => {
  const variantStyles = {
    default: "bg-primary active:bg-primary/90",
    destructive: "bg-destructive active:bg-destructive/90",
    outline:
      "bg-transparent border border-border active:bg-accent dark:bg-input/30 dark:border-input dark:active:bg-input/50",
    secondary: "bg-secondary active:bg-secondary/80",
    ghost: "bg-transparent active:bg-accent dark:active:bg-accent/50",
    link: "bg-transparent",
  };

  const textVariantStyles = {
    default: "text-primary-foreground",
    destructive: "text-destructive-foreground",
    outline: "text-foreground",
    secondary: "text-secondary-foreground",
    ghost: "text-foreground",
    link: "text-primary underline",
  };

  const sizeStyles = {
    default: "h-10 px-4",
    sm: "h-8 px-3",
    lg: "h-11 px-6",
    icon: "h-10 w-10",
  };

  const textSizeStyles = {
    default: "text-sm",
    sm: "text-sm",
    lg: "text-base",
    icon: "text-base",
  };

  const isIconOnly = size === "icon";

  return (
    <Pressable
      className={cn(
        "items-center justify-center rounded-md shadow-xs",
        variantStyles[variant],
        sizeStyles[size],
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
                textVariantStyles[variant],
                textSizeStyles[size],
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
};
