import { useQuery } from "@tanstack/react-query";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Award,
  BarChart3,
  Bell,
  Brain,
  CalendarDays,
  ClipboardCheck,
  FileText,
  Gauge,
  LogOut,
  Medal,
  Menu,
  Settings,
  Trophy,
  UserRound,
  Users,
} from "lucide-react";
import { useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import { initials } from "@/lib/clockit";
import { notificationsQuery, settingsQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";

type NavItem = { to: string; label: string; icon: React.ComponentType<{ className?: string }> };

const ADMIN_NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: Gauge },
  { to: "/staff", label: "Staff", icon: Users },
  { to: "/attendance", label: "Attendance", icon: ClipboardCheck },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/ai-insights", label: "AI Insights", icon: Brain },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/gamification", label: "Gamification", icon: Trophy },
  { to: "/reports", label: "Reports", icon: FileText },
  { to: "/settings", label: "Settings", icon: Settings },
];

const STAFF_NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: Gauge },
  { to: "/attendance", label: "My Attendance", icon: ClipboardCheck },
  { to: "/calendar", label: "My Calendar", icon: CalendarDays },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/achievements", label: "Achievements", icon: Award },
  { to: "/leaderboard", label: "Leaderboard", icon: Medal },
  { to: "/profile", label: "Profile", icon: UserRound },
];

export function AppShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { profile, isAdmin, signOut } = useAuth();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);

  const { data: settings } = useQuery(settingsQuery);
  const { data: notifications } = useQuery(notificationsQuery);
  const unread = (notifications ?? []).filter((n) => !n.is_read).length;
  const nav = isAdmin ? ADMIN_NAV : STAFF_NAV;

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  const sidebar = (
    <div className="flex h-full flex-col gap-6 px-5 py-7">
      <Link to="/dashboard" className="flex items-center gap-3">
        <div className="grid size-9 place-items-center rounded-2xl bg-primary/15 text-lg font-semibold text-primary ring-1 ring-primary/20">
          C
        </div>
        <div>
          <div className="text-sm font-semibold leading-none">ClockIt</div>
          <div className="mono-label mt-1">
            {isAdmin ? "Admin console" : "Staff portal"}
          </div>
        </div>
      </Link>

      <nav className="flex flex-col gap-1 text-sm">
        {nav.map((item) => {
          const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-3 py-2.5 font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary ring-1 ring-primary/15"
                  : "text-muted-foreground hover:bg-foreground/5",
              )}
            >
              <Icon className="size-4 shrink-0" />
              {item.label}
              {item.to === "/notifications" && unread > 0 ? (
                <span className="ml-auto rounded-lg bg-crit px-1.5 py-0.5 font-mono text-[10px] text-primary-foreground">
                  {unread}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-3">
        <div className="clay p-4">
          <div className="mono-label">Role</div>
          <div className="mt-0.5 text-sm font-semibold">{isAdmin ? "Administrator" : "Staff"}</div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            {settings?.organization_name ?? "ClockIt Institute"}
          </div>
        </div>
        <button
          onClick={() => void signOut()}
          className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-foreground/5"
        >
          <LogOut className="size-4" />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background text-foreground antialiased">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-r border-border bg-card/60 backdrop-blur-sm md:block">
        {sidebar}
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="w-64 bg-card shadow-xl">{sidebar}</div>
          <button
            aria-label="Close menu"
            className="flex-1 bg-foreground/20"
            onClick={() => setMobileOpen(false)}
          />
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center gap-4 border-b border-border bg-background/80 px-6 py-5 backdrop-blur-sm md:px-8">
          <button
            className="grid size-10 place-items-center rounded-2xl bg-card ring-1 ring-border md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="size-4" />
          </button>
          <div className="min-w-0">
            <div className="mono-label">{today}</div>
            <h1 className="truncate text-xl font-semibold leading-tight">{title}</h1>
            {subtitle ? (
              <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
          <div className="ml-auto flex items-center gap-3">
            {actions}
            <Link
              to="/notifications"
              className="relative grid size-10 place-items-center rounded-2xl bg-card ring-1 ring-border transition-colors hover:bg-foreground/5"
              aria-label="Notifications"
            >
              <Bell className="size-4" />
              {unread > 0 ? (
                <span className="absolute right-2.5 top-2 size-2 rounded-full bg-crit" />
              ) : null}
            </Link>
            <Link
              to="/profile"
              className="grid size-10 place-items-center rounded-2xl bg-primary/15 text-sm font-semibold text-primary ring-1 ring-primary/20"
            >
              {initials(profile?.full_name ?? "ClockIt User")}
            </Link>
          </div>
        </header>

        <main className="space-y-6 p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
