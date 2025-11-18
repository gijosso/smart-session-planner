import { useCallback } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";

export const SessionAddButton: React.FC = () => {
  const router = useRouter();

  const handleAddSession = useCallback(() => {
    router.push("/session/create");
  }, [router]);

  return (
    <Pressable onPress={handleAddSession} className="active:opacity-70">
      <View className="bg-foreground flex h-10 w-10 items-center justify-center rounded-full">
        <Text className="text-background text-2xl leading-none font-bold">
          +
        </Text>
      </View>
    </Pressable>
  );
};
