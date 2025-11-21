import type React from "react";
import { Text, View } from "react-native";

import { BackButton } from "./back-button";

interface BackButtonTitleProps {
  title: string;
  children?: React.ReactNode;
  className?: string;
}

/**
 * BackButtonTitle component
 * Combines a back button with a title, commonly used in screen headers
 */
export const BackButtonTitle: React.FC<BackButtonTitleProps> = ({
  title,
  children,
  className = "",
}) => {
  return (
    <View className={`flex flex-row items-center gap-2 ${className}`}>
      <BackButton />
      <Text className="text-foreground text-2xl" accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );
};
