import { useCallback } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export const SessionAddButton: React.FC = () => {
  const router = useRouter();

  const handleAddSession = useCallback(() => {
    router.push("/session/create");
  }, [router]);

  return (
    <Pressable onPress={handleAddSession} className="active:opacity-70">
      <View className="bg-primary flex h-10 w-10 items-center justify-center rounded-full">
        <Ionicons name="add-outline" size={20} color="#FFFFFF" />
      </View>
    </Pressable>
  );
};
