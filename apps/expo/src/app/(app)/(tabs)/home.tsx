import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ProgressCard } from "~/features/progress/progress-card";
import { SessionAddButton } from "~/features/session/session-add-button";
import { SessionRecap } from "~/features/session/session-recap";
import { SessionTodaysList } from "~/features/session/session-todays-list";
import { SuggestionsCard } from "~/features/suggestions/suggestions-card";

export default function Home() {
  return (
    <SafeAreaView className="bg-background">
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="px-4 pt-6">
          {/* Header */}
          <View className="mb-6">
            <Text className="text-foreground text-3xl font-bold">
              Dashboard
            </Text>
          </View>

          {/* Session Recap */}
          <View className="mb-6">
            <SessionRecap />
          </View>

          {/* Suggestions */}
          <View className="mb-6">
            <SuggestionsCard
              sessionType="DEEP_WORK"
              durationMinutes={60}
              priority={3}
            />
          </View>

          {/* Today's Sessions */}
          <View className="mb-4">
            <View className="mb-4 flex flex-row items-center justify-between">
              <Text className="text-foreground text-xl font-bold">
                Today's Sessions
              </Text>
              <SessionAddButton />
            </View>
            <SessionTodaysList />
          </View>

          {/* Progress Card */}
          <View className="mb-6">
            <ProgressCard />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
