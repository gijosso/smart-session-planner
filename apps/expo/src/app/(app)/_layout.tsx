import { useEffect } from "react";
import { Redirect, Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useQuery } from "@tanstack/react-query";

import { trpc } from "~/utils/api";
import { useRefreshAccessToken } from "../hooks/use-refresh-access-token";

const screenOptions = {
  headerShown: false,
};

export default function AppLayout() {
  const { data: session, isLoading } = useQuery(
    trpc.auth.getSession.queryOptions(),
  );

  useRefreshAccessToken();

  useEffect(() => {
    if (!isLoading) {
      void SplashScreen.hideAsync();
    }
  }, [isLoading]);

  if (isLoading) {
    return null;
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
