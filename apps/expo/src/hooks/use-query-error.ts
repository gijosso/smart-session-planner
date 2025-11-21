import { useMemo } from "react";
import type { UseQueryResult, UseMutationResult } from "@tanstack/react-query";

import { getQueryError, getMutationError, getQueryErrorMessage, getMutationErrorMessage, isQueryErrorRetryable, isMutationErrorRetryable } from "~/utils/error/query";
import type { AppError } from "~/utils/error/types";

/**
 * Hook to extract and handle errors from React Query queries
 */
export function useQueryError<TData, TError>(
  query: Pick<UseQueryResult<TData, TError>, "error">,
) {
  return useMemo(() => {
    const error = getQueryError(query);
    const message = error ? getQueryErrorMessage(query) : undefined;
    const retryable = error ? isQueryErrorRetryable(query) : false;

    return {
      error,
      message,
      retryable,
      hasError: !!error,
    };
  }, [query.error]);
}

/**
 * Hook to extract and handle errors from React Query mutations
 */
export function useMutationError<TData, TError, TVariables>(
  mutation: Pick<UseMutationResult<TData, TError, TVariables>, "error">,
) {
  return useMemo(() => {
    const error = getMutationError(mutation);
    const message = error ? getMutationErrorMessage(mutation) : undefined;
    const retryable = error ? isMutationErrorRetryable(mutation) : false;

    return {
      error,
      message,
      retryable,
      hasError: !!error,
    };
  }, [mutation.error]);
}

