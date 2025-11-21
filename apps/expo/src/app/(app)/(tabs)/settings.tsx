import { Text } from "react-native";
import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Button, Card, Content, Screen } from "~/components";
import { ClearAllSessionsButton } from "~/components/settings/DEV_clear-all-sessions";
import { CreateSessionsForSuggestionsButton } from "~/components/settings/DEV_create-sessions-for-suggestions";
import { COLORS_MUTED } from "~/constants/colors";
import { SignOutButton } from "~/features/auth";

export default function Settings() {
  return (
    <Screen>
      <Content>
        <Text className="text-foreground text-3xl font-semibold">Settings</Text>
      </Content>

      <Content className="flex-1">
        <Link href="/settings/availability" asChild>
          <Button
            variant="ghost"
            accessibilityLabel="Navigate to availability settings"
            accessibilityRole="button"
          >
            <Card className="flex flex-1 flex-row items-center justify-between">
              <Text
                className="text-foreground font-semibold"
                accessibilityRole="text"
              >
                Availability
              </Text>
              <Ionicons
                name="chevron-forward-outline"
                size={20}
                color={COLORS_MUTED}
                accessibilityLabel="Navigate to availability settings"
              />
            </Card>
          </Button>
        </Link>
      </Content>

      <Content>
        <SignOutButton />
        {process.env.NODE_ENV === "development" && (
          <>
            <CreateSessionsForSuggestionsButton />
            <ClearAllSessionsButton />
          </>
        )}
      </Content>
    </Screen>
  );
}
