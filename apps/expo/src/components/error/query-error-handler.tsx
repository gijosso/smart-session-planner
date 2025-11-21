import React from "react";
import type { UseQueryResult } from "@tanstack/react-query";

import { ErrorScreen } from "./error-screen";
import { useQueryError } from "~/hooks/use-query-error";

interface QueryErrorHandlerProps<TData, TError> {
  query: UseQueryResult<TData, TError>;
  title?: string;
  onRetry?: () => void;
  onReset?: () => void;
  children: (data: TData) => React.ReactNode;
  fallback?: (error: ReturnType<typeof useQueryError<TData, TError>>) => React.ReactNode;
}

/**
 * Component that handles query errors consistently
 * Renders children only when data is available, shows error screen otherwise
 */
export function QueryErrorHandler<TData, TError>({
  query,
  title,
  onRetry,
  onReset,
  children,
  fallback,
}: QueryErrorHandlerProps<TData, TError>) {
  const queryError = useQueryError(query);

  if (query.isLoading) {
    return null; // Let parent handle loading state
  }

  if (queryError.hasError && queryError.error) {
    if (fallback) {
      return <>{fallback(queryError)}</>;
    }

    return (
      <ErrorScreen
        error={queryError.error}
        onRetry={onRetry ?? (() => void query.refetch())}
        onReset={onReset}
        title={title}
      />
    );
  }

  if (!query.data) {
    return (
      <ErrorScreen
        error={{
          code: "NOT_FOUND",
          message: "No data available",
          retryable: false,
        }}
        onReset={onReset}
        title={title ?? "Not found"}
      />
    );
  }

  return <>{children(query.data)}</>;
}

