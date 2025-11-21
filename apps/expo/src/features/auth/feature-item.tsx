import React from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { COLORS_MUTED } from "~/constants/colors";

interface FeatureItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}

export const FeatureItem = React.memo<FeatureItemProps>(
  ({ icon, title, description }) => {
    return (
      <View className="flex-row items-start gap-4">
        <View className="bg-primary/10 mt-1 h-10 w-10 items-center justify-center rounded-xl">
          <Ionicons name={icon} size={20} color={COLORS_MUTED} />
        </View>
        <View className="flex-1 gap-1">
          <Text className="text-foreground font-semibold">{title}</Text>
          <Text className="text-muted-foreground text-sm leading-relaxed">
            {description}
          </Text>
        </View>
      </View>
    );
  },
);

FeatureItem.displayName = "FeatureItem";
