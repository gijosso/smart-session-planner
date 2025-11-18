import { useCallback } from "react";
import ErrorBoundary from "react-native-error-boundary";
import { reloadAppAsync } from "expo";
import { QueryClientProvider } from "@tanstack/react-query";

import { queryClient } from "~/utils/api";

export const Providers = ({ children }: { children: React.ReactNode }) => {
  const handleError = useCallback((error: Error, stackTrace: string) => {
    console.error(error, stackTrace);
    void reloadAppAsync();
  }, []);

  return (
    <ErrorBoundary onError={handleError}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </ErrorBoundary>
  );
};
