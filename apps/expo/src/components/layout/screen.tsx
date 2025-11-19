import React, { useMemo } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { cn } from "~/utils/cn";

const CONTENT_CONTAINER_STYLE = { flexGrow: 1 } as const;

export const Screen = React.memo<{
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}>(({ children, className, contentClassName }) => {
  const { top, bottom } = useSafeAreaInsets();

  const style = useMemo(
    () => ({
      paddingTop: top,
      paddingBottom: bottom,
    }),
    [top, bottom],
  );

  return (
    <View className={cn("bg-background flex-1", className)}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={CONTENT_CONTAINER_STYLE}
      >
        <View className={cn("flex-1", contentClassName)} style={style}>
          {children}
        </View>
      </ScrollView>
    </View>
  );
});
