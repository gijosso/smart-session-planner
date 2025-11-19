import { useMemo } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { cn } from "~/utils/cn";

export const Screen = ({
  children,
  className,
  contentClassName,
}: {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}) => {
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
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className={cn("flex-1", contentClassName)} style={style}>
          {children}
        </View>
      </ScrollView>
    </View>
  );
};
