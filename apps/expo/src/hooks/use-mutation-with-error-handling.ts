import type { AppError } from "~/utils/error/types";
import { createAppError } from "~/utils/error/types";
import { showErrorToast } from "~/utils/toast";
import { isValidationError } from "~/utils/form/type-guards";

/**
 * Error codes that may contain sensitive information
 * These errors should not show detailed messages in production
 */
const SENSITIVE_ERROR_CODES: AppError["code"][] = [
  "UNAUTHORIZED",
  "FORBIDDEN",
  "SERVER_ERROR",
  "UNKNOWN_ERROR",
];

/**
 * Check if an error message contains sensitive information
 * Filters out stack traces, file paths, and other technical details
 */
function containsSensitiveInfo(message: string): boolean {
  const sensitivePatterns = [
    /stack trace/i,
    /at \w+ \(/i, // Stack trace format
    /file:\/\//i, // File paths
    /\/Users\/|\/home\/|\/var\/|\/tmp\//i, // Common file system paths
    /password|secret|token|key|api[_-]?key/i, // Credentials
    /sql|database|query/i, // Database details
  ];

  return sensitivePatterns.some((pattern) => pattern.test(message));
}

/**
 * Sanitize error message for display to users
 * Removes sensitive information in production, shows full details in development
 */
function sanitizeErrorMessage(
  message: string,
  errorCode: AppError["code"],
  isDevelopment: boolean,
): string {
  // In development, show full error messages
  if (isDevelopment) {
    return message;
  }

  // In production, filter sensitive error codes
  if (SENSITIVE_ERROR_CODES.includes(errorCode)) {
    return "An error occurred. Please try again later.";
  }

  // Filter out sensitive patterns
  if (containsSensitiveInfo(message)) {
    return "An error occurred. Please try again later.";
  }

  // For validation errors, show the message as-is (they're user-friendly)
  if (errorCode === "VALIDATION_ERROR") {
    return message;
  }

  // For other errors, show the message if it's user-friendly
  return message;
}

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
  /**
   * Whether to show validation errors in toast
   * Defaults to false - validation errors are typically shown inline in forms
   */
  showValidationErrors?: boolean;
}

/**
 * Creates standardized mutation error handler
 * Can be used with mutationOptions to provide consistent error handling
 * Uses toast notifications instead of alerts for better UX
 *
 * Security: Filters sensitive information in production
 * - Never shows stack traces, file paths, or technical details
 * - Never shows detailed error messages for sensitive error codes
 * - Always shows user-friendly validation errors
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
    showValidationErrors = false,
  } = options;

  const isDevelopment = process.env.NODE_ENV === "development";

  return (error: unknown) => {
    const appError = createAppError(error);

    // Log full error details in development
    if (logError && isDevelopment) {
      // eslint-disable-next-line no-console
      console.error("Mutation error:", error);
    }

    // Skip showing validation errors in toast (they're shown inline in forms)
    if (isValidationError(error) && !showValidationErrors) {
      if (onError) {
        onError(appError);
      }
      return;
    }

    if (onError) {
      onError(appError);
    } else if (showToast) {
      // Determine the message to show
      let message: string;
      if (errorMessage) {
        message = errorMessage;
      } else if (appError.userMessage) {
        message = appError.userMessage;
      } else if (appError.message) {
        message = sanitizeErrorMessage(appError.message, appError.code, isDevelopment);
      } else {
        message = "An error occurred";
      }

      showErrorToast(message, errorTitle);
    }
  };
}
