import { Pressable, Text, View } from "react-native";

interface SessionRecapFilterProps {
  filter: "today" | "week";
  onFilterChange: (filter: "today" | "week") => void;
}

export const SessionRecapFilter: React.FC<SessionRecapFilterProps> = ({
  filter,
  onFilterChange,
}) => {
  return (
    <View className="flex flex-row gap-2">
      <Pressable
        onPress={() => onFilterChange("today")}
        className={`rounded-full px-4 py-2 ${
          filter === "today" ? "bg-muted" : "bg-background border-border border"
        }`}
      >
        <Text
          className={`text-sm font-medium ${
            filter === "today" ? "text-foreground" : "text-muted-foreground"
          }`}
        >
          Today
        </Text>
      </Pressable>
      <Pressable
        onPress={() => onFilterChange("week")}
        className={`rounded-full px-4 py-2 ${
          filter === "week" ? "bg-muted" : "bg-background border-border border"
        }`}
      >
        <Text
          className={`text-sm font-medium ${
            filter === "week" ? "text-foreground" : "text-muted-foreground"
          }`}
        >
          Week
        </Text>
      </Pressable>
    </View>
  );
};
