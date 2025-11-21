import React from "react";
import { Text, View } from "react-native";

import type { AppError } from "~/utils/error/types";
import { safeStringify } from "~/utils/safe-json";

interface ErrorDetailsProps {
  error: AppError;
  showDetails: boolean;
}

/**
 * Error details component
 * Displays technical error information when showDetails is true
 */
export const ErrorDetails = React.memo<ErrorDetailsProps>(
  ({ error, showDetails }) => {
    if (!showDetails || !error.originalError) {
      return null;
    }

    return (
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
    );
  },
);

ErrorDetails.displayName = "ErrorDetails";

