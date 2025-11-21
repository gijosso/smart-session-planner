import { View } from "react-native";
import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Button } from "~/components";

export const SessionAddButton: React.FC = () => {
  return (
    <Link href="/session/create" asChild>
      <Button size="icon">
        <View className="bg-primary flex items-center justify-center rounded-full p-2">
          <Ionicons name="add-outline" size={22} color="#FFFFFF" />
        </View>
      </Button>
    </Link>
  );
};
