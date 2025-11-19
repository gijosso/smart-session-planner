import type React from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Card } from "~/components";

interface StatCardProps {
  iconName: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}

/**
 * Component displaying a card with an icon, title, and description
 */
export const StatCard: React.FC<StatCardProps> = ({
  iconName,
  title,
  description,
}) => {
  return (
    <Card variant="outline" className="bg-card">
      <View className="flex flex-row gap-2">
        <View className="p-2">
          <Ionicons name={iconName} size={22} />
        </View>

        <View>
          <Text className="text-foreground text-2xl font-bold">{title}</Text>
          <Text className="text-muted-foreground text-sm">{description}</Text>
        </View>
      </View>
    </Card>
  );
};
