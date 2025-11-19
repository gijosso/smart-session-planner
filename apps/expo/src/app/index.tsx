import { useEffect } from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect, Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useQuery } from "@tanstack/react-query";

import { SignInButton } from "~/features/auth/sign-in-button";
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
    <SafeAreaView className="bg-background">
      <Stack.Screen options={{ title: "Dashboard" }} />
      <View className="bg-background h-full w-full p-4">
        <Text className="text-foreground pb-2 text-center text-5xl font-bold">
          Create <Text className="text-primary">T3</Text> Turbo
        </Text>
        <SignInButton />
      </View>
    </SafeAreaView>
  );
}
