import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SessionAddButton } from "~/features/session/session-add-button";
import { SessionRecap } from "~/features/session/session-recap";
import { SessionTodaysList } from "~/features/session/session-todays-list";

export default function Home() {
  return (
    <SafeAreaView className="bg-background flex-1">
      <View className="flex flex-col gap-4 p-4">
        <Text className="text-foreground text-2xl font-bold">Dashboard</Text>

        <SessionRecap />

        <View className="flex flex-col gap-2">
          <View className="flex flex-row items-center justify-between">
            <Text className="text-foreground text-xl font-bold">
              Today's Sessions
            </Text>
            <SessionAddButton />
          </View>
        </View>
        <SessionTodaysList />
      </View>
    </SafeAreaView>
  );
}
