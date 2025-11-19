import { useCallback } from "react";
import { Pressable, Text } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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
    }),
  );

  const signOutMutation = useMutation({
    mutationFn: async () => {
      await authClient.removeAccessToken();
      await queryClient.invalidateQueries(trpc.auth.getSession.queryFilter());
    },
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
      <Pressable
        onPress={handleSignIn}
        className="bg-primary flex items-center rounded-sm p-2"
        disabled={signInMutation.isPending || signOutMutation.isPending}
      >
        <Text>
          {signInMutation.isPending || signOutMutation.isPending
            ? "Loading..."
            : isSignedIn
              ? "Sign Out"
              : "Sign Up Anonymously"}
        </Text>
      </Pressable>
    </>
  );
};
