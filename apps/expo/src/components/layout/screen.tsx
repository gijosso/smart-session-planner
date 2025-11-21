import React, { useMemo } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { cn } from "~/utils/cn";

export const Screen = React.memo<{
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}>(({ children, className, contentClassName }) => {
  const { top, bottom } = useSafeAreaInsets();

  const contentContainerStyle = useMemo(
    () => ({
      paddingTop: top,
      paddingBottom: bottom,
      flexGrow: 1,
    }),
    [top, bottom],
  );

  return (
    <View className={cn("bg-background flex-1", className)}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={contentContainerStyle}
      >
        <View className={cn("mt-8 flex-1 gap-4", contentClassName)}>
          {children}
        </View>
      </ScrollView>
    </View>
  );
});
