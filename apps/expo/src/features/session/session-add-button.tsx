import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Button } from "~/components";
import { COLORS_BACKGROUND_LIGHT } from "~/constants/colors";

export const SessionAddButton: React.FC = () => {
  return (
    <Button
      size="icon"
      accessibilityLabel="Create new session"
      accessibilityRole="button"
      disabled
    >
      <View className="bg-primary flex items-center justify-center rounded-full p-2">
        <Ionicons
          name="add-outline"
          size={22}
          color={COLORS_BACKGROUND_LIGHT}
          accessibilityLabel="Add icon"
        />
      </View>
    </Button>
  );
};
