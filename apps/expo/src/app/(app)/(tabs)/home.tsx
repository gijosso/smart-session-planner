import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { AddSession } from "~/features/session/add-session";
import { TodaysSessions } from "~/features/session/todays-sessions";
import { trpc } from "~/utils/api";
import { authClient } from "~/utils/auth";

export default function Home() {
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
        <View className="flex flex-row items-center justify-between">
          <Text className="text-foreground text-2xl font-bold">Dashboard</Text>
          <Pressable onPress={() => signOutMutation.mutate()}>
            <Text>Sign Out</Text>
          </Pressable>
        </View>

        <View className="flex flex-col gap-2">
          <View className="flex flex-row items-center justify-between">
            <Text className="text-foreground text-xl font-bold">
              Today's Sessions
            </Text>
            <AddSession />
          </View>
        </View>
        <TodaysSessions />
      </View>
    </SafeAreaView>
  );
}
