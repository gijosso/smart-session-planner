import type { ComponentType, ReactNode } from "react";
import { Platform } from "react-native";
import { QueryClientProvider } from "@tanstack/react-query";

import { AppErrorBoundary } from "~/components/error";
import { queryClient } from "~/utils/api";

// Conditionally import DevTools only in development and for web platform
// React Native requires a different setup (e.g., Flipper or expo plugin)
// For native development, consider using: tanstack-query-dev-tools-expo-plugin
let ReactQueryDevtools: ComponentType<{
  initialIsOpen?: boolean;
}> | null = null;

if (process.env.NODE_ENV === "development" && Platform.OS === "web") {
  try {
    // Dynamic import for DevTools (web only)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const devtools = require("@tanstack/react-query-devtools") as {
      ReactQueryDevtools: React.ComponentType<{ initialIsOpen?: boolean }>;
    };
    ReactQueryDevtools = devtools.ReactQueryDevtools;
  } catch {
    // DevTools not available, continue without them
  }
}

export const Providers = ({ children }: { children: ReactNode }) => {
  const isDevelopment = process.env.NODE_ENV === "development";
  const isWeb = Platform.OS === "web";

  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        {children}
        {isDevelopment && isWeb && ReactQueryDevtools && (
          <ReactQueryDevtools initialIsOpen={false} />
        )}
      </QueryClientProvider>
    </AppErrorBoundary>
  );
};
