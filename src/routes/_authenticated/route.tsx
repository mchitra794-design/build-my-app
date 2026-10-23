import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated")({ component: AuthenticatedLayout });
const ADMIN_ONLY_PATHS = ["/staff", "/analytics", "/reports", "/ai-insights", "/gamification", "/settings"];

function AuthenticatedLayout() {
  const { session, loading, isAdmin, role } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const requiresAdmin = ADMIN_ONLY_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));

  useEffect(() => {
    if (!loading && !session) void navigate({ to: "/" });
    else if (!loading && session && requiresAdmin && role && !isAdmin) void navigate({ to: "/dashboard", replace: true });
  }, [loading, session, requiresAdmin, role, isAdmin, navigate]);

  if (loading || !session || (requiresAdmin && !role)) return <div className="grid min-h-screen place-items-center bg-background"><p className="mono-label">Loading ClockIn…</p></div>;
  if (requiresAdmin && !isAdmin) return <div className="grid min-h-screen place-items-center bg-background"><p className="text-sm text-muted-foreground">Redirecting to your dashboard…</p></div>;
  return <Outlet />;
}
