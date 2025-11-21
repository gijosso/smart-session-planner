import React from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { AppError } from "~/utils/error/types";
import { getUserErrorMessage } from "~/utils/error/types";

interface ErrorMessageProps {
  error: AppError | unknown;
  className?: string;
  textClassName?: string;
  showIcon?: boolean;
  size?: "sm" | "md" | "lg";
}

const SIZE_STYLES = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
} as const;

/**
 * Inline error message component
 * Used for displaying errors within forms or content areas
 */
export const ErrorMessage = React.memo<ErrorMessageProps>(
  ({ error, className, textClassName, showIcon = true, size = "md" }) => {
    const appError: AppError | null =
      typeof error === "object" && error !== null && "code" in error
        ? (error as AppError)
        : null;
    const message = appError
      ? appError.userMessage ?? appError.message
      : getUserErrorMessage(error);

    if (!message) return null;

    return (
      <View className={`flex flex-row items-center gap-2 ${className ?? ""}`}>
        {showIcon && (
          <Ionicons
          name="alert-circle"
          size={size === "sm" ? 16 : size === "md" ? 18 : 20}
          color="#EF4444"
        />
        )}
        <Text className={`text-destructive ${SIZE_STYLES[size]} ${textClassName ?? ""}`}>
          {message}
        </Text>
      </View>
    );
  },
);

ErrorMessage.displayName = "ErrorMessage";

