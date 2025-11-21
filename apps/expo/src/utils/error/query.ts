/**
 * Utilities for handling React Query errors consistently
 */

import type { UseQueryResult, UseMutationResult } from "@tanstack/react-query";

import type { AppError } from "./types";
import { createAppError, getUserErrorMessage, isRetryableError } from "./types";

/**
 * Extract error from React Query result
 */
export function getQueryError<TData, TError>(
  query: Pick<UseQueryResult<TData, TError>, "error">,
): AppError | undefined {
  if (!query.error) return undefined;
  return createAppError(query.error);
}

/**
 * Extract error from React Query mutation result
 */
export function getMutationError<TData, TError, TVariables>(
  mutation: Pick<UseMutationResult<TData, TError, TVariables>, "error">,
): AppError | undefined {
  if (!mutation.error) return undefined;
  return createAppError(mutation.error);
}

/**
 * Get user-friendly error message from query
 */
export function getQueryErrorMessage<TData, TError>(
  query: Pick<UseQueryResult<TData, TError>, "error">,
): string | undefined {
  const error = getQueryError(query);
  return error ? getUserErrorMessage(error) : undefined;
}

/**
 * Get user-friendly error message from mutation
 */
export function getMutationErrorMessage<TData, TError, TVariables>(
  mutation: Pick<UseMutationResult<TData, TError, TVariables>, "error">,
): string | undefined {
  const error = getMutationError(mutation);
  return error ? getUserErrorMessage(error) : undefined;
}

/**
 * Check if query error is retryable
 */
export function isQueryErrorRetryable<TData, TError>(
  query: Pick<UseQueryResult<TData, TError>, "error">,
): boolean {
  if (!query.error) return false;
  return isRetryableError(query.error);
}

/**
 * Check if mutation error is retryable
 */
export function isMutationErrorRetryable<TData, TError, TVariables>(
  mutation: Pick<UseMutationResult<TData, TError, TVariables>, "error">,
): boolean {
  if (!mutation.error) return false;
  return isRetryableError(mutation.error);
}

