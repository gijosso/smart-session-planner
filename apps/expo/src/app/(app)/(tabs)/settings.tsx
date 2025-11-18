import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMutation, useQueryClient } from "@tanstack/react-query";

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

  return (
    <SafeAreaView className="bg-background flex-1">
      <View className="flex flex-col gap-4 p-4">
        <Text className="text-foreground text-2xl font-bold">Settings</Text>

        <View className="flex flex-col gap-4">
          <Pressable
            onPress={() => signOutMutation.mutate()}
            className="bg-destructive flex items-center rounded-sm p-3"
            disabled={signOutMutation.isPending}
          >
            <Text className="text-destructive-foreground font-semibold">
              {signOutMutation.isPending ? "Signing Out..." : "Sign Out"}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
