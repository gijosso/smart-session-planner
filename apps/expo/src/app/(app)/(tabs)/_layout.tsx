import { Text } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { cn } from "~/utils/cn";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#1F104A",
        tabBarInactiveTintColor: "#71717A",
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarLabel: ({ focused }) => (
            <Text
              className={cn(
                "text-foreground text-sm",
                focused ? "text-primary" : "text-muted-foreground",
              )}
            >
              Home
            </Text>
          ),
          tabBarIcon: ({ size, color }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarLabel: ({ focused }) => (
            <Text
              className={cn(
                "text-foreground text-sm",
                focused ? "text-primary" : "text-muted-foreground",
              )}
            >
              Settings
            </Text>
          ),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
