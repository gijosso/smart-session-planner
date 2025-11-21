import React from "react";
import { View } from "react-native";

import { Button } from "~/components/button";
import type { AppError } from "~/utils/error/types";

interface ErrorActionsProps {
  error: AppError;
  onRetry?: () => void;
  onReset?: () => void;
}

/**
 * Error actions component
 * Renders retry and reset buttons based on error state and available handlers
 */
export const ErrorActions = React.memo<ErrorActionsProps>(
  ({ error, onRetry, onReset }) => {
    return (
      <View className="w-full gap-3">
        {error.retryable && onRetry && (
          <Button
            variant="default"
            onPress={onRetry}
            accessibilityLabel="Retry the failed operation"
            accessibilityRole="button"
          >
            Try Again
          </Button>
        )}
        {onReset && (
          <Button
            variant="outline"
            onPress={onReset}
            accessibilityLabel="Go back to previous screen"
            accessibilityRole="button"
          >
            Go Back
          </Button>
        )}
      </View>
    );
  },
);

ErrorActions.displayName = "ErrorActions";

