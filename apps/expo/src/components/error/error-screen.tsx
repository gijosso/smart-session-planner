import React from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { Button } from "~/components/button";
import { COLORS_DESTRUCTIVE } from "~/constants/colors";
import type { AppError } from "~/utils/error/types";
import { ERROR_MESSAGES } from "~/utils/error/types";
import { safeStringify } from "~/utils/safe-json";

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
 */
export const ErrorScreen = React.memo<ErrorScreenProps>(
  ({ error, onRetry, onReset, title, showDetails = false }) => {
    const userMessage = error.userMessage ?? error.message ?? ERROR_MESSAGES[error.code];

    return (
      <SafeAreaView className="bg-background flex-1">
        <View className="flex-1 items-center justify-center p-6">
          <View className="mb-6" accessibilityRole="image" accessibilityLabel="Error icon">
            <Ionicons name="alert-circle-outline" size={64} color={COLORS_DESTRUCTIVE} />
          </View>

          <Text className="text-foreground mb-2 text-center text-2xl font-bold">
            {title ?? "Something went wrong"}
          </Text>

          <Text className="text-muted-foreground mb-6 text-center text-base">
            {userMessage}
          </Text>

          {showDetails && error.originalError ? (
            <View className="mb-6 w-full rounded-lg bg-muted p-4">
              <Text className="text-muted-foreground mb-2 text-xs font-semibold uppercase">
                Error Details
              </Text>
              <Text className="text-muted-foreground text-xs">
                {error.originalError instanceof Error
                  ? error.originalError.message
                  : typeof error.originalError === "string"
                    ? error.originalError
                    : safeStringify(error.originalError, 2)}
              </Text>
            </View>
          ) : null}

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
        </View>
      </SafeAreaView>
    );
  },
);

ErrorScreen.displayName = "ErrorScreen";

