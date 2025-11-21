import React from "react";
import { View } from "react-native";

interface ItemSeparatorComponentProps {
  horizontal?: boolean;
}

export const ItemSeparatorComponent = React.memo<ItemSeparatorComponentProps>(
  ({ horizontal = true }) => <View className={horizontal ? "w-4" : "h-4"} />,
);
ItemSeparatorComponent.displayName = "ItemSeparatorComponent";
