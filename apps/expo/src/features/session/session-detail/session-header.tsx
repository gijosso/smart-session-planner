import { Text, View } from "react-native";

import { PriorityIndicator, SessionTypeIcon } from "~/components/session";
import { SESSION_TYPES_DISPLAY } from "~/constants/session";

interface SessionHeaderProps {
  type: string;
  priority: number;
}

export function SessionHeader({ type, priority }: SessionHeaderProps) {
  const sessionTypeLabel = SESSION_TYPES_DISPLAY[type as keyof typeof SESSION_TYPES_DISPLAY]?.label ?? SESSION_TYPES_DISPLAY.OTHER.label;

  return (
    <>
      <View className="flex flex-1 flex-row items-center justify-end">
        <PriorityIndicator priority={priority} />
      </View>

      <View className="flex flex-1 flex-row items-center gap-4">
        <SessionTypeIcon type={type} iconSize={22} />
        <Text
          className="text-foreground text-xl font-semibold"
          accessibilityRole="header"
        >
          {sessionTypeLabel}
        </Text>
      </View>
    </>
  );
}

