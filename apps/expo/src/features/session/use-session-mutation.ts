import type { QueryClient, UseMutationOptions } from "@tanstack/react-query";

import type { RouterOutputs } from "~/utils/api";
import { createMutationErrorHandler } from "~/hooks/use-mutation-with-error-handling";
import { trpc } from "~/utils/api";
import {
  invalidateSessionQueries,
  invalidateSessionQueriesForUpdate,
} from "~/utils/sessions/session-cache";

type Session = RouterOutputs["session"]["byId"];

/**
 * Context captured during optimistic updates
 */
interface SessionMutationContext {
  oldSession: Session | undefined;
}

/**
 * Options for session mutations
 */
export interface SessionMutationOptions {
  /**
   * Whether to invalidate stats queries
   * Defaults to true - set to false if the mutation doesn't affect stats
   */
  invalidateStats?: boolean;
  /**
   * Custom error message for the mutation
   */
  errorMessage?: string;
  /**
   * Callback called on successful mutation
   */
  onSuccess?: (data: Session) => void;
  /**
   * Callback called on error
   */
  onError?: (error: unknown) => void;
}

/**
 * Get mutation options for session mutations with optimistic updates
 * This standardizes the pattern of capturing session data before mutation
 * and invalidating relevant queries after success
 */
export function getSessionMutationOptions(
  queryClient: QueryClient,
  options: SessionMutationOptions = {},
) {
  const {
    invalidateStats = true,
    errorMessage = "Failed to update session. Please try again.",
    onSuccess,
    onError,
  } = options;

  return {
    onMutate: (variables: { id: string }) => {
      // Capture current session data before mutation (React Query optimistic update pattern)
      const queryOptions = trpc.session.byId.queryOptions({
        id: variables.id,
      });
      const oldSession = queryClient.getQueryData<Session>(
        queryOptions.queryKey,
      );
      return { oldSession } satisfies SessionMutationContext;
    },
    onSuccess: (
      data: Session | undefined,
      _variables: { id: string },
      _onMutateResult: SessionMutationContext | undefined,
      _mutation: unknown,
    ) => {
      if (!data) return;
      // Invalidate queries based on session date (granular invalidation)
      invalidateSessionQueries(
        queryClient,
        {
          startTime: data.startTime,
          id: data.id,
        },
        { invalidateStats },
      );

      onSuccess?.(data);
    },
    onError: (
      error: unknown,
      _variables: { id: string },
      _onMutateResult: SessionMutationContext | undefined,
      _mutation: unknown,
    ) => {
      const errorHandler = createMutationErrorHandler({
        errorMessage,
        onError,
      });
      errorHandler(error);
    },
  } satisfies Partial<UseMutationOptions<Session, unknown, { id: string }>>;
}

/**
 * Get mutation options for session update mutations
 * Handles both old and new session states for proper cache invalidation
 */
export function getSessionUpdateMutationOptions(
  queryClient: QueryClient,
  options: SessionMutationOptions = {},
) {
  const {
    invalidateStats = true,
    errorMessage = "Failed to update session. Please try again.",
    onSuccess,
    onError,
  } = options;

  return {
    onMutate: (variables: { id: string }) => {
      // Capture current session data before update
      const queryOptions = trpc.session.byId.queryOptions({
        id: variables.id,
      });
      const oldSession = queryClient.getQueryData<Session>(
        queryOptions.queryKey,
      );
      return { oldSession } satisfies SessionMutationContext;
    },
    onSuccess: (
      data: Session | undefined,
      _variables: { id: string },
      onMutateResult: unknown,
      _mutation: unknown,
    ) => {
      if (!data) return;
      const context = onMutateResult as SessionMutationContext | undefined;
      const oldSession = context?.oldSession;
      if (oldSession) {
        // Use update-specific invalidation that handles date changes
        invalidateSessionQueriesForUpdate(
          queryClient,
          {
            startTime: oldSession.startTime,
            id: oldSession.id,
          },
          {
            startTime: data.startTime,
            id: data.id,
          },
          { invalidateStats },
        );
      } else {
        // Fallback to standard invalidation if old session not available
        invalidateSessionQueries(
          queryClient,
          {
            startTime: data.startTime,
            id: data.id,
          },
          { invalidateStats },
        );
      }

      onSuccess?.(data);
    },
    onError: (
      error: unknown,
      _variables: { id: string },
      _onMutateResult: unknown,
      _mutation: unknown,
    ) => {
      const errorHandler = createMutationErrorHandler({
        errorMessage,
        onError,
      });
      errorHandler(error);
    },
  } satisfies Partial<UseMutationOptions<Session, unknown, { id: string }>>;
}

/**
 * Get mutation options for session delete mutations
 * Handles cleanup of deleted session queries
 */
export function getSessionDeleteMutationOptions(
  queryClient: QueryClient,
  options: SessionMutationOptions = {},
) {
  const {
    invalidateStats = true,
    errorMessage = "Failed to delete session. Please try again.",
    onSuccess,
    onError,
  } = options;

  return {
    onMutate: (variables: { id: string }) => {
      // Capture current session data before deletion
      const queryOptions = trpc.session.byId.queryOptions({
        id: variables.id,
      });
      const sessionData = queryClient.getQueryData<Session>(
        queryOptions.queryKey,
      );
      return { sessionData } satisfies { sessionData: Session | undefined };
    },
    onSuccess: (
      _data: unknown,
      variables: { id: string },
      onMutateResult: unknown,
      _mutation: unknown,
    ) => {
      // Remove the specific session query
      queryClient.removeQueries(
        trpc.session.byId.queryFilter({ id: variables.id }),
      );

      // Invalidate related queries if we have session data
      const context = onMutateResult as
        | { sessionData: Session | undefined }
        | undefined;
      if (context?.sessionData) {
        invalidateSessionQueries(
          queryClient,
          {
            startTime: context.sessionData.startTime,
          },
          { invalidateStats },
        );
        onSuccess?.(context.sessionData);
      }
    },
    onError: (
      error: unknown,
      _variables: { id: string },
      _onMutateResult: unknown,
      _mutation: unknown,
    ) => {
      const errorHandler = createMutationErrorHandler({
        errorMessage,
        onError,
      });
      errorHandler(error);
    },
  } satisfies Partial<UseMutationOptions<unknown, unknown, { id: string }>>;
}

/**
 * Get mutation options for session create mutations
 * Handles cache invalidation for newly created sessions
 */
export function getSessionCreateMutationOptions<TVariables>(
  queryClient: QueryClient,
  options: SessionMutationOptions = {},
) {
  const {
    invalidateStats = true,
    errorMessage = "Failed to create session. Please try again.",
    onSuccess,
    onError,
  } = options;

  return {
    onSuccess: (
      data: Session | undefined,
      _variables: TVariables,
      _onMutateResult: unknown,
      _mutation: unknown,
    ) => {
      if (!data) return;
      // Invalidate queries based on the new session's date
      invalidateSessionQueries(
        queryClient,
        {
          startTime: data.startTime,
          id: data.id,
        },
        { invalidateStats },
      );

      onSuccess?.(data);
    },
    onError: (
      error: unknown,
      _variables: TVariables,
      _onMutateResult: unknown,
      _mutation: unknown,
    ) => {
      const errorHandler = createMutationErrorHandler({
        errorMessage,
        onError,
      });
      errorHandler(error);
    },
  };
}
