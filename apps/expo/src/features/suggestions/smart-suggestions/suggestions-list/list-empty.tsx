import React from "react";
import { Text, View } from "react-native";

export const ListEmptyComponent = React.memo(() => (
  <View className="py-4">
    <Text className="text-muted-foreground text-center">
      No suggestions available. Make sure you have availability windows set up.
    </Text>
  </View>
));
ListEmptyComponent.displayName = "ListEmptyComponent";

