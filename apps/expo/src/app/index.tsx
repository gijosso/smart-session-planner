import { useCallback, useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect, Stack } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as SplashScreen from "expo-splash-screen";

import { trpc } from "~/utils/api";
import { authClient } from "~/utils/auth";

function MobileAuth() {
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
}

export default function Index() {
  const { data: session, isLoading } = useQuery(
    trpc.auth.getSession.queryOptions(),
  );

  useEffect(() => {
    // Hide splash screen once auth check is complete
    if (!isLoading) {
      void SplashScreen.hideAsync();
    }
  }, [isLoading]);

  if (isLoading) {
    // Return null to keep splash screen visible
    return null;
  }

  if (session?.user) {
    return <Redirect href="/home" />;
  }

  return (
    <SafeAreaView className="bg-background">
      <Stack.Screen options={{ title: "Dashboard" }} />
      <View className="bg-background h-full w-full p-4">
        <Text className="text-foreground pb-2 text-center text-5xl font-bold">
          Create <Text className="text-primary">T3</Text> Turbo
        </Text>
        <MobileAuth />
      </View>
    </SafeAreaView>
  );
}
