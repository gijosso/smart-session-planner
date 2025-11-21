import type { UseQueryResult } from "@tanstack/react-query";
import { useCallback } from "react";
import { useRouter } from "expo-router";

import type { AppError } from "~/utils/error/types";
import { useQueryError } from "./use-query-error";

/**
 * Standardized error handling hook
 * Provides consistent error handling patterns across the app
 */
export interface UseErrorHandlingOptions {
  /**
   * Query to handle errors for
   */
  query?: Pick<UseQueryResult<unknown, unknown>, "error" | "refetch">;
  /**
   * Custom retry handler
   */
  onRetry?: () => void;
  /**
   * Custom reset handler (defaults to router.back())
   */
  onReset?: () => void;
  /**
   * Custom error title
   */
  title?: string;
  /**
   * Whether to show error details in development
   */
  showDetails?: boolean;
}

export interface UseErrorHandlingResult {
  /**
   * The error object if present
   */
  error: AppError | null;
  /**
   * Whether an error exists
   */
  hasError: boolean;
  /**
   * Standardized retry handler
   */
  handleRetry: () => void;
  /**
   * Standardized reset handler
   */
  handleReset: () => void;
  /**
   * Error title for display
   */
  errorTitle: string;
}

/**
 * Hook for consistent error handling across components
 * Standardizes error handling patterns and provides reusable handlers
 */
export function useErrorHandling(
  options: UseErrorHandlingOptions = {},
): UseErrorHandlingResult {
  const router = useRouter();

  const { query, onRetry, onReset, title } = options;

  // Extract error from query if provided
  // Always call hook unconditionally to satisfy React Hook rules
  const queryError = useQueryError(query ?? { error: undefined });
  const error = query ? (queryError.error ?? null) : null;
  const hasError = query ? queryError.hasError : false;

  // Standardized retry handler
  const handleRetry = useCallback(() => {
    if (onRetry) {
      onRetry();
    } else if (query?.refetch) {
      void query.refetch();
    }
  }, [onRetry, query]);

  // Standardized reset handler
  const handleReset = useCallback(() => {
    if (onReset) {
      onReset();
    } else {
      router.back();
    }
  }, [onReset, router]);

  // Standardized error title
  const errorTitle = title ?? "Something went wrong";

  return {
    error,
    hasError,
    handleRetry,
    handleReset,
    errorTitle,
  };
}

/**
 * Hook for handling query errors with standardized patterns
 * Convenience wrapper around useErrorHandling for queries
 */
export function useQueryErrorHandling<TData, TError>(
  query: UseQueryResult<TData, TError>,
  options?: Omit<UseErrorHandlingOptions, "query">,
): UseErrorHandlingResult {
  return useErrorHandling({
    ...options,
    query: {
      error: query.error,
      refetch: query.refetch,
    },
  });
}
