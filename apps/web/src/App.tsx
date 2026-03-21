import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { AppShellSkeleton } from "@/components/skeletons/AppShellSkeleton";
import { AuthPageSkeleton } from "@/components/skeletons/AuthPageSkeleton";
import { AccountsSkeleton } from "@/components/skeletons/AccountsSkeleton";
import { AnalyticsSkeleton } from "@/components/skeletons/AnalyticsSkeleton";
import { DashboardSkeleton } from "@/components/skeletons/DashboardSkeleton";
import { ReviewsSkeleton } from "@/components/skeletons/ReviewsSkeleton";
import { SetupsSkeleton } from "@/components/skeletons/SetupsSkeleton";
import { TradeDetailSkeleton } from "@/components/skeletons/TradeDetailSkeleton";
import { TradesSkeleton } from "@/components/skeletons/TradesSkeleton";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PublicOnlyRoute } from "@/components/PublicOnlyRoute";
import { FounderRoute } from "@/components/FounderRoute";
import { AuthProvider, useAuth } from "@/lib/auth";
import { createAppQueryClient } from "@/lib/react-query";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import Trades from "./pages/Trades";
import TradeDetail from "./pages/TradeDetail";
import Analytics from "./pages/Analytics";
import Accounts from "./pages/Accounts";
import Setups from "./pages/Setups";
import Reviews from "./pages/Reviews";
import LotCalculator from "./pages/LotCalculator";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Register from "./pages/Register";
import Settings from "./pages/Settings";
import SharedTradePage from "./pages/SharedTradePage";
import FounderDashboard from "./pages/FounderDashboard";

const queryClient = createAppQueryClient();

function getProtectedBootFallback(pathname: string) {
  if (pathname.startsWith("/trades/")) {
    return {
      pageTitleWidth: "w-36",
      content: <TradeDetailSkeleton />,
    };
  }

  if (pathname.startsWith("/trades")) {
    return {
      pageTitleWidth: "w-16",
      content: <TradesSkeleton />,
    };
  }

  if (pathname.startsWith("/analytics")) {
    return {
      pageTitleWidth: "w-20",
      content: <AnalyticsSkeleton />,
    };
  }

  if (pathname.startsWith("/accounts")) {
    return {
      pageTitleWidth: "w-24",
      content: <AccountsSkeleton />,
    };
  }

  if (pathname.startsWith("/setups")) {
    return {
      pageTitleWidth: "w-20",
      content: <SetupsSkeleton />,
    };
  }

  if (pathname.startsWith("/reviews")) {
    return {
      pageTitleWidth: "w-20",
      content: <ReviewsSkeleton />,
    };
  }

  return {
    pageTitleWidth: "w-24",
    content: <DashboardSkeleton />,
  };
}

function AppRoutes() {
  const location = useLocation();
  const { isReady } = useAuth();
  const { pathname } = location;
  const isAuthRoute = pathname === "/login" || pathname === "/register";
  const isProtectedRoute = (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/accounts") ||
    pathname.startsWith("/setups") ||
    pathname.startsWith("/reviews") ||
    pathname.startsWith("/trades") ||
    pathname.startsWith("/analytics") ||
    pathname.startsWith("/calculator") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/founder")
  );

  if (!isReady && isAuthRoute) {
    return <AuthPageSkeleton />;
  }

  if (!isReady && isProtectedRoute) {
    const fallback = getProtectedBootFallback(pathname);

    return (
      <AppShellSkeleton pageTitleWidth={fallback.pageTitleWidth}>
        {fallback.content}
      </AppShellSkeleton>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/shared/trade/:shareId" element={<SharedTradePage />} />
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/accounts" element={<Accounts />} />
          <Route path="/setups" element={<Setups />} />
          <Route path="/reviews" element={<Reviews />} />
          <Route path="/trades" element={<Trades />} />
          <Route path="/trades/:id" element={<TradeDetail />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/calculator" element={<LotCalculator />} />
          <Route path="/settings" element={<Settings />} />
          <Route element={<FounderRoute />}>
            <Route path="/founder" element={<FounderDashboard />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
