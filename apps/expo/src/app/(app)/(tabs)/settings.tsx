import React from "react";
import { Text } from "react-native";
import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Button } from "~/components/button";
import { Card } from "~/components/card";
import { Content } from "~/components/layout/content";
import { Screen } from "~/components/layout/screen";
import { COLORS_MUTED } from "~/constants/colors";
import { SignOutButton } from "~/features/auth/sign-out-button";

// Conditionally import dev-only components to reduce bundle size in production
let ClearAllSessionsButton: React.ComponentType | null = null;
let CreateSessionsForSuggestionsButton: React.ComponentType | null = null;

if (process.env.NODE_ENV === "development") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const clearAllModule = require("~/components/settings/DEV_clear-all-sessions");
  ClearAllSessionsButton = clearAllModule.ClearAllSessionsButton;
  
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const createSessionsModule = require("~/components/settings/DEV_create-sessions-for-suggestions");
  CreateSessionsForSuggestionsButton = createSessionsModule.CreateSessionsForSuggestionsButton;
}

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
            {CreateSessionsForSuggestionsButton && (
              <CreateSessionsForSuggestionsButton />
            )}
            {ClearAllSessionsButton && <ClearAllSessionsButton />}
          </>
        )}
      </Content>
    </Screen>
  );
}
