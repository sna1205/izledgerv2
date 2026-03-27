import { lazy, Suspense } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
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
import { AppLayout } from "@/layouts/AppLayout";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ProtectedRoute } from "@/features/auth/components/ProtectedRoute";
import { PublicOnlyRoute } from "@/features/auth/components/PublicOnlyRoute";
import { AuthProvider, useAuth } from "@/features/auth/auth-context";
import { createAppQueryClient } from "@/services/query-client";

const Landing = lazy(() => import("./pages/Landing"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Trades = lazy(() => import("./pages/Trades"));
const TradeDetail = lazy(() => import("./pages/TradeDetail"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Accounts = lazy(() => import("./pages/Accounts"));
const Setups = lazy(() => import("./pages/Setups"));
const Reviews = lazy(() => import("./pages/Reviews"));
const EconomicCalendar = lazy(() => import("./pages/EconomicCalendar"));
const EconomicCalendarEventDetail = lazy(() => import("./pages/EconomicCalendarEventDetail"));
const LotCalculator = lazy(() => import("./pages/LotCalculator"));
const Login = lazy(() => import("./pages/Login"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Register = lazy(() => import("./pages/Register"));
const Settings = lazy(() => import("./pages/Settings"));
const SharedTradePage = lazy(() => import("./pages/SharedTradePage"));

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

  if (pathname.startsWith("/economic-calendar")) {
    return {
      pageTitleWidth: "w-40",
      content: <DashboardSkeleton />,
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
    pathname.startsWith("/economic-calendar") ||
    pathname.startsWith("/trades") ||
    pathname.startsWith("/analytics") ||
    pathname.startsWith("/calculator") ||
    pathname.startsWith("/settings")
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

  const routeFallback = isAuthRoute
    ? <AuthPageSkeleton />
    : isProtectedRoute
      ? (
          <AppShellSkeleton pageTitleWidth={getProtectedBootFallback(pathname).pageTitleWidth}>
            {getProtectedBootFallback(pathname).content}
          </AppShellSkeleton>
        )
      : null;

  return (
    <Suspense fallback={routeFallback}>
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
            <Route path="/economic-calendar" element={<EconomicCalendar />} />
            <Route path="/economic-calendar/:eventId" element={<EconomicCalendarEventDetail />} />
            <Route path="/trades" element={<Trades />} />
            <Route path="/trades/:id" element={<TradeDetail />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/calculator" element={<LotCalculator />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/settings/checklist" element={<Navigate to="/setups" replace />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
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
