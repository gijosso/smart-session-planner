import type {
  UseMutationOptions,
  UseMutationResult,
} from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";

import { createMutationErrorHandler } from "./use-mutation-with-error-handling";
import { useMutationError } from "./use-query-error";
import { useToast } from "./use-toast";

/**
 * Standardized mutation configuration
 */
export interface StandardizedMutationConfig<TData, TVariables> {
  /**
   * Custom error message for the mutation
   */
  errorMessage?: string;
  /**
   * Custom success message (will show toast)
   */
  successMessage?: string;
  /**
   * Whether to show success toast
   * Defaults to true if successMessage is provided
   */
  showSuccessToast?: boolean;
  /**
   * Custom success callback
   */
  onSuccess?: (data: TData, variables: TVariables) => void;
  /**
   * Custom error callback
   */
  onError?: (error: unknown) => void;
  /**
   * Whether to log errors in development
   * Defaults to true
   */
  logError?: boolean;
}

/**
 * Hook for standardized mutations with consistent error handling
 *
 * This hook provides:
 * - Consistent error handling with toast notifications
 * - Success toast notifications
 * - Error extraction utilities
 * - Standardized error messages
 *
 * @example
 * ```tsx
 * const mutation = useStandardizedMutation(
 *   trpc.session.create.mutationOptions(),
 *   {
 *     successMessage: "Session created successfully",
 *     errorMessage: "Failed to create session. Please try again.",
 *   }
 * );
 * ```
 */
export function useStandardizedMutation<TData, TError, TVariables>(
  mutationOptions: UseMutationOptions<TData, TError, TVariables>,
  config: StandardizedMutationConfig<TData, TVariables> = {},
): UseMutationResult<TData, TError, TVariables> {
  const toast = useToast();
  const {
    errorMessage,
    successMessage,
    showSuccessToast = successMessage !== undefined,
    onSuccess,
    onError,
    logError = true,
  } = config;

  return useMutation<TData, TError, TVariables>({
    ...mutationOptions,
    onSuccess: (data, variables, context, mutation) => {
      // Call original onSuccess if provided
      mutationOptions.onSuccess?.(data, variables, context, mutation);

      // Show success toast if configured
      if (showSuccessToast && successMessage) {
        toast.success(successMessage);
      }

      // Call custom success callback
      onSuccess?.(data, variables);
    },
    onError: (error, variables, context, mutation) => {
      // Call original onError if provided
      mutationOptions.onError?.(error, variables, context, mutation);

      // Use standardized error handler
      const errorHandler = createMutationErrorHandler({
        errorMessage,
        onError,
        logError,
      });
      errorHandler(error);
    },
  });
}

/**
 * Hook to extract error information from a mutation
 * Provides consistent error handling utilities
 */
export function useMutationErrorInfo<TData, TError, TVariables>(
  mutation: Pick<UseMutationResult<TData, TError, TVariables>, "error">,
) {
  return useMutationError(mutation);
}
