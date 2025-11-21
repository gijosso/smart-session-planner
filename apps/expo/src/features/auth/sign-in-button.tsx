import { useCallback } from "react";
import { Text } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "~/components";
import { createMutationErrorHandler } from "~/hooks/use-mutation-with-error-handling";
import { trpc } from "~/utils/api";
import { authClient } from "~/utils/auth";

export const SignInButton = () => {
  const { data: session } = useQuery(trpc.auth.getSession.queryOptions());
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
      onError: createMutationErrorHandler({
        errorMessage: "Failed to sign in. Please try again.",
      }),
    }),
  );

  const signOutMutation = useMutation({
    mutationFn: async () => {
      await authClient.removeAccessToken();
      await queryClient.invalidateQueries(trpc.auth.getSession.queryFilter());
    },
    onError: createMutationErrorHandler({
      errorMessage: "Failed to sign out. Please try again.",
    }),
  });

  const handleSignIn = useCallback(() => {
    signInMutation.mutate({
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
  }, [signInMutation]);

  const isSignedIn = session?.user;

  return (
    <>
      <Text className="text-foreground pb-2 text-center text-xl font-semibold">
        {isSignedIn && session.user.email
          ? `Hello, ${session.user.email}`
          : "Not logged in"}
      </Text>
      <Button
        variant="default"
        onPress={handleSignIn}
        disabled={signInMutation.isPending || signOutMutation.isPending}
      >
        {signInMutation.isPending || signOutMutation.isPending
          ? "Loading..."
          : isSignedIn
            ? "Sign Out"
            : "Sign Up Anonymously"}
      </Button>
    </>
  );
};
