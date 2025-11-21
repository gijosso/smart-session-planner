import { memo } from "react";
import { useColorScheme } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { getForegroundColor } from "~/constants/colors";
import { Button } from "..";

export const BackButton = memo(() => {
  const colorScheme = useColorScheme();
  const iconColor = getForegroundColor(colorScheme);

  return (
    <Button
      variant="ghost"
      size="icon"
      onPress={() => router.back()}
      accessibilityLabel="Go back"
      accessibilityRole="button"
    >
      <Ionicons
        name="chevron-back-outline"
        size={20}
        color={iconColor}
        accessibilityLabel="Back arrow"
      />
    </Button>
  );
});
