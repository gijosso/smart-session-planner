import type { ViewProps } from "react-native";
import React from "react";
import { View } from "react-native";

import { cn } from "~/utils/cn";

export interface ContentProps extends ViewProps {
  children: React.ReactNode;
  className?: string;
}

export const Content = React.memo<ContentProps>(
  ({ children, className, ...props }) => (
    <View className={cn("gap-2 px-8 py-6", className)} {...props}>
      {children}
    </View>
  ),
);
