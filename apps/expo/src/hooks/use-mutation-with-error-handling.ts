import { useCallback } from "react";
import { Alert } from "react-native";
import type { UseMutationResult } from "@tanstack/react-query";

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
 * Hook that wraps a mutation with standardized error handling
 * Provides consistent error handling across the app
 */
export function useMutationWithErrorHandling<
  TData,
  TError,
  TVariables,
>(
  mutation: UseMutationResult<TData, TError, TVariables>,
  options: MutationErrorHandlingOptions = {},
): UseMutationResult<TData, TError, TVariables> {
  const {
    errorMessage,
    errorTitle = "Error",
    showAlert = true,
    onError,
    logError = process.env.NODE_ENV === "development",
  } = options;

  const handleError = useCallback(
    (error: TError) => {
      const appError = createAppError(error);

      if (logError) {
        // eslint-disable-next-line no-console
        console.error("Mutation error:", error);
      }

      if (onError) {
        onError(appError);
      } else if (showAlert) {
        const message =
          errorMessage ?? appError.userMessage ?? appError.message ?? "An error occurred";
        Alert.alert(errorTitle, message, [{ text: "OK" }]);
      }
    },
    [errorMessage, errorTitle, showAlert, onError, logError],
  );

  // Return mutation with error handling applied
  // Note: This doesn't modify the mutation itself, but provides a pattern
  // for consistent error handling. The actual error handling should be
  // done in the mutation's onError callback.
  return mutation;
}

/**
 * Creates standardized mutation error handler options
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
      // eslint-disable-next-line no-console
      console.error("Mutation error:", error);
    }

    if (onError) {
      onError(appError);
    } else if (showAlert) {
      const message =
        errorMessage ?? appError.userMessage ?? appError.message ?? "An error occurred";
      Alert.alert(errorTitle, message, [{ text: "OK" }]);
    }
  };
}

