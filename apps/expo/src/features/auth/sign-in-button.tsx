import { useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "~/components";
import { createMutationErrorHandler } from "~/hooks/use-mutation-with-error-handling";
import { trpc } from "~/utils/api";
import { authClient } from "~/utils/auth";

export const SignInButton = () => {
  const queryClient = useQueryClient();

  const signInMutation = useMutation(
    trpc.auth.signUpAnonymously.mutationOptions({
      async onSuccess(data: {
        user: { id: string; email: string; emailVerified: boolean };
        accessToken: string;
        refreshToken: string | null;
        expiresAt: number | null;
      }) {
        // Store the session tokens securely
        await authClient.setSession({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          expiresAt: data.expiresAt,
        });
        // Invalidate session query to refetch with new token
        await queryClient.invalidateQueries(trpc.auth.getSession.queryFilter());
      },
      onError: (error: unknown) => {
        createMutationErrorHandler({
          errorMessage: "Failed to sign in. Please try again.",
        })(error);
      },
    }),
  );

  const handleSignIn = useCallback(() => {
    signInMutation.mutate({
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
  }, [signInMutation]);

  return (
    <Button
      variant="default"
      size="lg"
      onPress={handleSignIn}
      disabled={signInMutation.isPending}
    >
      {signInMutation.isPending ? "Loading..." : "Sign Up Anonymously"}
    </Button>
  );
};
