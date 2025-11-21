import React from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { AppError } from "~/utils/error/types";
import { ERROR_MESSAGES } from "~/utils/error/types";
import { ErrorIcon } from "./error-icon";
import { ErrorDetails } from "./error-details";
import { ErrorActions } from "./error-actions";

interface ErrorScreenProps {
  error: AppError;
  onRetry?: () => void;
  onReset?: () => void;
  title?: string;
  showDetails?: boolean;
}

/**
 * Full-screen error display component
 * Used for critical errors that prevent the screen from rendering
 * Composed of icon, details, and action sub-components
 */
export const ErrorScreen = React.memo<ErrorScreenProps>(
  ({ error, onRetry, onReset, title, showDetails = false }) => {
    const userMessage =
      error.userMessage ?? error.message ?? ERROR_MESSAGES[error.code];

    return (
      <SafeAreaView className="bg-background flex-1">
        <View className="flex-1 items-center justify-center p-6">
          <ErrorIcon />

          <Text className="text-foreground mb-2 text-center text-2xl font-bold">
            {title ?? "Something went wrong"}
          </Text>

          <Text className="text-muted-foreground mb-6 text-center text-base">
            {userMessage}
          </Text>

          <ErrorDetails error={error} showDetails={showDetails} />

          <ErrorActions error={error} onRetry={onRetry} onReset={onReset} />
        </View>
      </SafeAreaView>
    );
  },
);

ErrorScreen.displayName = "ErrorScreen";

