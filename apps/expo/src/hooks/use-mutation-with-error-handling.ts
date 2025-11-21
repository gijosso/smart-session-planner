import { Alert } from "react-native";

import type { AppError } from "~/utils/error/types";
import { createAppError } from "~/utils/error/types";

export interface MutationErrorHandlingOptions {
  /**
   * Custom error message to show in alert
   * If not provided, uses error's userMessage or a default message
   */
  errorMessage?: string;
  /**
   * Custom title for error alert
   * Defaults to "Error"
   */
  errorTitle?: string;
  /**
   * Whether to show an alert on error
   * Defaults to true
   */
  showAlert?: boolean;
  /**
   * Custom error handler function
   * If provided, this will be called instead of showing default alert
   */
  onError?: (error: AppError) => void;
  /**
   * Whether to log errors in development
   * Defaults to true
   */
  logError?: boolean;
}

/**
 * Creates standardized mutation error handler
 * Can be used with mutationOptions to provide consistent error handling
 */
export function createMutationErrorHandler(
  options: MutationErrorHandlingOptions = {},
) {
  const {
    errorMessage,
    errorTitle = "Error",
    showAlert = true,
    onError,
    logError = process.env.NODE_ENV === "development",
  } = options;

  return (error: unknown) => {
    const appError = createAppError(error);

    if (logError) {
      console.error("Mutation error:", error);
    }

    if (onError) {
      onError(appError);
    } else if (showAlert) {
      const message = errorMessage ?? appError.userMessage ?? appError.message;
      Alert.alert(errorTitle, message, [{ text: "OK" }]);
    }
  };
}
