import { memo } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Button } from "..";

export const BackButton = memo(() => {
  return (
    <Button variant="ghost" size="icon" onPress={() => router.back()}>
      <Ionicons name="chevron-back-outline" size={20} color="black" />
    </Button>
  );
});
