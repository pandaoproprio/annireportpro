import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { AppDataProvider } from "@/contexts/AppDataContext";
import { AppRoutes } from "@/routes/AppRoutes";
import { FormsOnlyRoutes } from "@/routes/FormsOnlyRoutes";
import { OfflineBadge } from "@/components/OfflineBadge";
import { isFormsOnlyHost } from "@/lib/hostMode";

const queryClient = new QueryClient();

const App = () => {
  const formsOnly = isFormsOnlyHost();
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <AppDataProvider>
            <Toaster />
            <Sonner />
            <OfflineBadge />
            <BrowserRouter>
              {formsOnly ? <FormsOnlyRoutes /> : <AppRoutes />}
            </BrowserRouter>
          </AppDataProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
