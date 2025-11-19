import { useCallback } from "react";
import { Pressable, Text, View } from "react-native";
import { Link } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Screen } from "~/components";
import { trpc } from "~/utils/api";
import { authClient } from "~/utils/auth";

export default function Settings() {
  const queryClient = useQueryClient();

  const signOutMutation = useMutation({
    mutationFn: async () => {
      await authClient.removeAccessToken();
      await queryClient.invalidateQueries(trpc.auth.getSession.queryFilter());
    },
  });

  const handleSignOut = useCallback(() => {
    signOutMutation.mutate();
  }, [signOutMutation]);

  return (
    <Screen>
      <View className="flex flex-col gap-4 p-4">
        <Text className="text-foreground text-2xl font-bold">Settings</Text>

        <View className="flex flex-col gap-4">
          <Link href="/settings/availability" asChild>
            <Pressable className="bg-primary flex items-center rounded-sm p-3">
              <Text className="text-primary-foreground font-semibold">
                Availability
              </Text>
            </Pressable>
          </Link>

          <Pressable
            onPress={handleSignOut}
            className="bg-destructive flex items-center rounded-sm p-3"
            disabled={signOutMutation.isPending}
          >
            <Text className="text-destructive-foreground font-semibold">
              {signOutMutation.isPending ? "Signing Out..." : "Sign Out"}
            </Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}
