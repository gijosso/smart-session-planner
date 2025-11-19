import { ActivityIndicator, View } from "react-native";

export const LoadingScreen = () => {
  return (
    <View className="flex-1 items-center justify-center">
      <ActivityIndicator size="large" />
    </View>
  );
};
