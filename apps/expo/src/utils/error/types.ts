/**
 * Centralized error types and utilities for error homogenization
 * Provides consistent error handling across the application
 */

/**
 * Error codes that can occur in the application
 */
export type AppErrorCode =
  | "NETWORK_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "CONFLICT"
  | "RATE_LIMIT"
  | "SERVER_ERROR"
  | "UNKNOWN_ERROR";

/**
 * User-friendly error messages mapped to error codes
 */
export const ERROR_MESSAGES: Record<AppErrorCode, string> = {
  NETWORK_ERROR: "Unable to connect. Please check your internet connection and try again.",
  UNAUTHORIZED: "You need to be logged in to perform this action.",
  FORBIDDEN: "You don't have permission to perform this action.",
  NOT_FOUND: "The requested resource was not found.",
  VALIDATION_ERROR: "Please check your input and try again.",
  CONFLICT: "This action conflicts with existing data. Please refresh and try again.",
  RATE_LIMIT: "Too many requests. Please wait a moment and try again.",
  SERVER_ERROR: "Something went wrong on our end. Please try again later.",
  UNKNOWN_ERROR: "An unexpected error occurred. Please try again.",
};

/**
 * Standardized error structure
 */
export interface AppError {
  code: AppErrorCode;
  message: string;
  originalError?: unknown;
  retryable?: boolean;
  userMessage?: string; // Override default message if needed
}

/**
 * Create a standardized error from various error sources
 */
export function createAppError(
  error: unknown,
  fallbackCode: AppErrorCode = "UNKNOWN_ERROR",
): AppError {
  // Handle tRPC errors
  if (
    error &&
    typeof error === "object" &&
    "data" in error &&
    error.data &&
    typeof error.data === "object"
  ) {
    const trpcError = error as {
      data?: {
        code?: string;
        httpStatus?: number;
        message?: string;
      };
      message?: string;
    };

    const code = trpcError.data?.code;
    const httpStatus = trpcError.data?.httpStatus;

    // Map tRPC error codes to AppErrorCode
    let appErrorCode: AppErrorCode = fallbackCode;
    if (code === "UNAUTHORIZED" || httpStatus === 401) {
      appErrorCode = "UNAUTHORIZED";
    } else if (code === "FORBIDDEN" || httpStatus === 403) {
      appErrorCode = "FORBIDDEN";
    } else if (code === "NOT_FOUND" || httpStatus === 404) {
      appErrorCode = "NOT_FOUND";
    } else if (code === "BAD_REQUEST" || httpStatus === 400) {
      appErrorCode = "VALIDATION_ERROR";
    } else if (code === "CONFLICT" || httpStatus === 409) {
      appErrorCode = "CONFLICT";
    } else if (code === "TOO_MANY_REQUESTS" || httpStatus === 429) {
      appErrorCode = "RATE_LIMIT";
    } else if (code === "INTERNAL_SERVER_ERROR" || (httpStatus && httpStatus >= 500)) {
      appErrorCode = "SERVER_ERROR";
    }

    return {
      code: appErrorCode,
      message: trpcError.data?.message ?? trpcError.message ?? ERROR_MESSAGES[appErrorCode],
      originalError: error,
      retryable: appErrorCode === "NETWORK_ERROR" || appErrorCode === "SERVER_ERROR",
      userMessage: trpcError.data?.message,
    };
  }

  // Handle network errors
  if (error instanceof TypeError && error.message.includes("fetch")) {
    return {
      code: "NETWORK_ERROR",
      message: ERROR_MESSAGES.NETWORK_ERROR,
      originalError: error,
      retryable: true,
    };
  }

  // Handle standard Error objects
  if (error instanceof Error) {
    // Check for network-related error messages
    if (
      error.message.includes("network") ||
      error.message.includes("Network") ||
      error.message.includes("Failed to fetch")
    ) {
      return {
        code: "NETWORK_ERROR",
        message: ERROR_MESSAGES.NETWORK_ERROR,
        originalError: error,
        retryable: true,
      };
    }

    return {
      code: fallbackCode,
      message: error.message || ERROR_MESSAGES[fallbackCode],
      originalError: error,
      retryable: fallbackCode === "NETWORK_ERROR" || fallbackCode === "SERVER_ERROR",
    };
  }

  // Fallback for unknown error types
  return {
    code: fallbackCode,
    message: ERROR_MESSAGES[fallbackCode],
    originalError: error,
    retryable: false,
  };
}

/**
 * Get user-friendly error message from an error
 */
export function getUserErrorMessage(error: unknown): string {
  const appError = createAppError(error);
  return appError.userMessage ?? appError.message;
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  const appError = createAppError(error);
  return appError.retryable ?? false;
}

/**
 * Check if an error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  const appError = createAppError(error);
  return appError.code === "NETWORK_ERROR";
}

/**
 * Check if an error is an authentication error
 */
export function isAuthError(error: unknown): boolean {
  const appError = createAppError(error);
  return appError.code === "UNAUTHORIZED" || appError.code === "FORBIDDEN";
}

