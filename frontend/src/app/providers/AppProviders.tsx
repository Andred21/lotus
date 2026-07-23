import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "@shared/ui";
import { useApplyTheme } from "./useApplyTheme";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: false },
  },
});

export function AppProviders({ children }: { children: ReactNode }) {
  // Tema global (classe dark no <html>) — vale em todas as rotas, login incluso.
  useApplyTheme();

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  );
}
