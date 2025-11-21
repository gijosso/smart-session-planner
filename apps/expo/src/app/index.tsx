import { useEffect } from "react";
import { Text } from "react-native";
import { Redirect, Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useQuery } from "@tanstack/react-query";

import { Card, CardContent, Content, Screen } from "~/components";
import { FeatureItem, SignInButton } from "~/features/auth";
import { trpc } from "~/utils/api";

export default function Index() {
  const { data: session, isLoading } = useQuery(
    trpc.auth.getSession.queryOptions(),
  );

  useEffect(() => {
    if (!isLoading) {
      void SplashScreen.hideAsync();
    }
  }, [isLoading]);

  if (isLoading) {
    return null;
  }

  if (session?.user) {
    return <Redirect href="/home" />;
  }

  return (
    <Screen className="flex-1 items-center justify-center">
      <Stack.Screen options={{ title: "Welcome" }} />

      <Content className="flex-1 items-center justify-center">
        <Text className="text-foreground text-center text-5xl leading-tight font-bold">
          Smart Session Planner
        </Text>
      </Content>

      <Content>
        <Card className="bg-suggestion-card w-full">
          <CardContent className="gap-4">
            <Text className="text-primary text-center text-lg leading-relaxed font-semibold">
              Unlock your productivity potential, start planning smarter today!
            </Text>
            <Text className="text-muted-foreground text-center text-base leading-relaxed">
              Try Smart Session Planner PRO for even more insights and features.
            </Text>
          </CardContent>
        </Card>
      </Content>

      <Content className="flex-1 items-center justify-center">
        <Card className="bg-progress-card w-full">
          <CardContent className="gap-4">
            <FeatureItem
              icon="time-outline"
              title="Smart Suggestions"
              description="AI-powered time slot recommendations based on your patterns"
            />
            <FeatureItem
              icon="stats-chart-outline"
              title="Track Progress"
              description="Monitor your session completion and productivity trends"
            />
            <FeatureItem
              icon="calendar-outline"
              title="Flexible Planning"
              description="Set your availability and let the system work around it"
            />
          </CardContent>
        </Card>
      </Content>

      <Content>
        <SignInButton />
        <Text className="text-muted-foreground text-center text-sm">
          Get started in seconds. No email required.
        </Text>
      </Content>
    </Screen>
  );
}
