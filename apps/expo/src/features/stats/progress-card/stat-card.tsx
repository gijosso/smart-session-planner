import type React from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Card, CardContent } from "~/components";

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
    <Card className="p-4">
      <CardContent>
        <View className="flex flex-row gap-4">
          <Ionicons name={iconName} size={22} />

          <View className="gap-1">
            <Text className="text-foreground text-xl">{title}</Text>
            <Text className="text-muted-foreground text-md">{description}</Text>
          </View>
        </View>
      </CardContent>
    </Card>
  );
};
