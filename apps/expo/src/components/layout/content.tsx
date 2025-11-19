import type { ViewProps } from "react-native";
import { View } from "react-native";

import { cn } from "~/utils/cn";

export interface ContentProps extends ViewProps {
  children: React.ReactNode;
  className?: string;
}
export const Content: React.FC<ContentProps> = ({
  children,
  className,
  ...props
}) => (
  <View className={cn("p-4", className)} {...props}>
    {children}
  </View>
);
