import { useEffect } from "react";
import { Redirect, Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useQuery } from "@tanstack/react-query";

import { trpc } from "~/utils/api";
import { usePrefetchHome } from "../../hooks/prefetch";
import { useRefreshAccessToken } from "../../features/auth";

const screenOptions = {
  headerShown: false,
};

export default function AppLayout() {
  const { data: session, isLoading } = useQuery(
    trpc.auth.getSession.queryOptions(),
  );

  useRefreshAccessToken();
  usePrefetchHome(!!session?.user);

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
