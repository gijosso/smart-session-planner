import { useCallback } from "react";
import { Pressable, Text, View } from "react-native";
import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Button, Card, Screen } from "~/components";
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
            <Pressable>
              <Card
                variant="outline"
                className="flex flex-row items-center justify-between"
              >
                <Text className="text-foreground font-semibold">
                  Availability
                </Text>
                <Ionicons
                  name="chevron-forward-outline"
                  size={20}
                  color="#71717A"
                />
              </Card>
            </Pressable>
          </Link>

          <Button
            variant="destructive"
            onPress={handleSignOut}
            disabled={signOutMutation.isPending}
          >
            {signOutMutation.isPending ? "Signing Out..." : "Sign Out"}
          </Button>
        </View>
      </View>
    </Screen>
  );
}
