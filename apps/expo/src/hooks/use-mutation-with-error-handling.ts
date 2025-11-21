import type { AppError } from "~/utils/error/types";
import { createAppError } from "~/utils/error/types";
import { showErrorToast } from "~/utils/toast";

export interface MutationErrorHandlingOptions {
  /**
   * Custom error message to show in toast
   * If not provided, uses error's userMessage or a default message
   */
  errorMessage?: string;
  /**
   * Custom title for error toast
   * Defaults to "Error"
   */
  errorTitle?: string;
  /**
   * Whether to show a toast on error
   * Defaults to true
   */
  showToast?: boolean;
  /**
   * Custom error handler function
   * If provided, this will be called instead of showing default toast
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
 * Uses toast notifications instead of alerts for better UX
 */
export function createMutationErrorHandler(
  options: MutationErrorHandlingOptions = {},
) {
  const {
    errorMessage,
    errorTitle = "Error",
    showToast = true,
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
    } else if (showToast) {
      const message =
        errorMessage ?? appError.userMessage ?? appError.message ?? "An error occurred";
      showErrorToast(message, errorTitle);
    }
  };
}
