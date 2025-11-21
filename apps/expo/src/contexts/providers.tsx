import { QueryClientProvider } from "@tanstack/react-query";

import { AppErrorBoundary } from "~/components/error";
import { queryClient } from "~/utils/api";

export const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </AppErrorBoundary>
  );
};
