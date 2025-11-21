import { Text, View } from "react-native";

export const ListEmptyComponent = () => (
  <View className="py-4">
    <Text className="text-muted-foreground text-center">
      No sessions scheduled for today
    </Text>
  </View>
);

