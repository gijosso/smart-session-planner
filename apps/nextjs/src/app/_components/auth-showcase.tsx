"use client";

import { Button } from "@ssp/ui/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { authClient } from "~/auth/client";
import { useTRPC } from "~/trpc/react";

export function AuthShowcase() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data: session } = useQuery(trpc.auth.getSession.queryOptions());

  const signInMutation = useMutation(
    trpc.auth.signUpAnonymously.mutationOptions({
      async onSuccess(data: {
        user: { id: string; email: string; emailVerified: boolean };
        accessToken: string;
      }) {
        // Store the access token securely
        await authClient.setAccessToken(data.accessToken);
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

  const isSignedIn = session?.user;

  if (!isSignedIn) {
    return (
      <Button
        size="lg"
        onClick={() => signInMutation.mutate()}
        disabled={signInMutation.isPending}
      >
        {signInMutation.isPending ? "Loading..." : "Sign in Anonymously"}
      </Button>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <p className="text-center text-2xl">
        <span>Logged in as {session.user.email}</span>
      </p>

      <Button
        size="lg"
        onClick={() => signOutMutation.mutate()}
        disabled={signOutMutation.isPending}
      >
        {signOutMutation.isPending ? "Loading..." : "Sign out"}
      </Button>
    </div>
  );
}
