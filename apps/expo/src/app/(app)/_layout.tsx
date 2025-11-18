import { ActivityIndicator, View } from "react-native";
import { Redirect, Stack } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import { trpc } from "~/utils/api";

const screenOptions = {
  headerShown: false,
};

export default function AppLayout() {
  const { data: session, isLoading } = useQuery(
    trpc.auth.getSession.queryOptions(),
  );

  if (isLoading) {
    return (
      <View className="bg-background flex-1 items-center justify-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!session?.user) {
    return <Redirect href="/" />;
  }

  return (
    <>
      <Stack screenOptions={screenOptions} />
    </>
  );
}
