import { useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "~/components";
import { createMutationErrorHandler } from "~/hooks/use-mutation-with-error-handling";
import { trpc } from "~/utils/api";
import { authClient } from "~/utils/auth";
import { clearRefreshQueue } from "~/utils/token-refresh-queue";

export const SignOutButton = () => {
  const queryClient = useQueryClient();

  const signOutMutation = useMutation({
    mutationFn: async () => {
      await authClient.removeAccessToken();
      await queryClient.invalidateQueries(trpc.auth.getSession.queryFilter());
      // Clear all cache to prevent stale data from previous user
      queryClient.clear();
      // Clear token refresh queue
      clearRefreshQueue();
    },
    onError: (
      error: unknown,
      _variables: void,
      _onMutateResult: unknown,
      _mutation: unknown,
    ) => {
      createMutationErrorHandler({
        errorMessage: "Failed to sign out. Please try again.",
      })(error);
    },
  });

  const handleSignOut = useCallback(() => {
    signOutMutation.mutate();
  }, [signOutMutation]);

  return (
    <Button
      variant="destructive"
      size="lg"
      onPress={handleSignOut}
      disabled={signOutMutation.isPending}
      accessibilityLabel="Sign out of your account"
      accessibilityRole="button"
    >
      {signOutMutation.isPending ? "Signing Out..." : "Sign Out"}
    </Button>
  );
};
