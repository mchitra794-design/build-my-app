import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CalendarDays, Flame, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sign in — ClockIt Attendance & Analytics" },
      {
        name: "description",
        content:
          "Sign in to ClockIt to manage staff attendance, shortage alerts, events, gamification and AI attendance predictions.",
      },
      { property: "og:title", content: "Sign in — ClockIt Attendance & Analytics" },
      {
        property: "og:description",
        content: "Intelligent staff attendance, engagement and predictive analytics.",
      },
    ],
  }),
  component: SignInPage,
});

const DEMO = {
  admin: { email: "admin@clockit.demo", password: "ClockIt#2026" },
  staff: { email: "staff@clockit.demo", password: "ClockIt#2026" },
};

function SignInPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [email, setEmail] = useState(DEMO.admin.email);
  const [password, setPassword] = useState(DEMO.admin.password);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && session) void navigate({ to: "/dashboard" });
  }, [loading, session, navigate]);

  async function submit(nextEmail: string, nextPassword: string) {
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: nextEmail,
      password: nextPassword,
    });
    if (error) {
      // First run for the demo accounts: create them, then sign straight in.
      const signUp = await supabase.auth.signUp({
        email: nextEmail,
        password: nextPassword,
      });
      if (signUp.error) {
        setBusy(false);
        toast.error(signUp.error.message);
        return;
      }
      if (!signUp.data.session) {
        const retry = await supabase.auth.signInWithPassword({
          email: nextEmail,
          password: nextPassword,
        });
        if (retry.error) {
          setBusy(false);
          toast.error(retry.error.message);
          return;
        }
      }
    }
    setBusy(false);
    void navigate({ to: "/dashboard" });
  }

  function useDemo(kind: "admin" | "staff") {
    setEmail(DEMO[kind].email);
    setPassword(DEMO[kind].password);
    void submit(DEMO[kind].email, DEMO[kind].password);
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <section className="flex flex-1 flex-col justify-between gap-10 bg-card/60 px-6 py-10 md:px-12 lg:py-14">
        <div className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-2xl bg-primary/15 text-lg font-semibold text-primary ring-1 ring-primary/20">
            C
          </div>
          <div>
            <div className="text-sm font-semibold leading-none">ClockIt</div>
            <div className="mono-label mt-1">Attendance intelligence</div>
          </div>
        </div>

        <div className="max-w-lg">
          <h1 className="text-3xl font-semibold leading-tight text-balance md:text-4xl">
            Staff attendance, shortage alerts and predictive analytics in one console.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground text-pretty">
            ClockIt tracks manual attendance across departments, flags shortage risk before it becomes a
            problem, keeps every staff calendar in sync with events, and rewards consistent attendance.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {[
              { icon: ShieldCheck, title: "Shortage detection", text: "Normal, warning and critical thresholds you control." },
              { icon: Sparkles, title: "AI insights", text: "Projected attendance and absence risk with explanations." },
              { icon: CalendarDays, title: "Attendance + calendar", text: "See attendance alongside meetings and training." },
              { icon: Flame, title: "Gamification", text: "Points, badges, streaks and a live leaderboard." },
            ].map((item) => (
              <div key={item.title} className="clay p-4">
                <item.icon className="size-4 text-primary" />
                <div className="mt-2 text-sm font-semibold">{item.title}</div>
                <div className="mt-1 text-xs text-muted-foreground">{item.text}</div>
              </div>
            ))}
          </div>
        </div>

        <p className="mono-label">Manual attendance · role-based access · department analytics</p>
      </section>

      <section className="flex flex-1 items-center justify-center px-6 py-12 md:px-12">
        <div className="clay w-full max-w-md p-8">
          <h2 className="text-xl font-semibold">Sign in</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Use your work email or staff email address and password.
          </p>

          <form
            className="mt-6 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void submit(email, password);
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={8}
              />
            </div>
            <Button type="submit" className="w-full rounded-2xl" disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <div className="mt-6 rounded-2xl bg-muted p-4">
            <div className="mono-label">Demo credentials</div>
            <div className="mt-2 space-y-2 text-xs">
              <button
                type="button"
                onClick={() => useDemo("admin")}
                className="flex w-full items-center justify-between rounded-xl bg-card px-3 py-2 text-left ring-1 ring-border transition-colors hover:bg-primary/5"
              >
                <span>
                  <span className="font-semibold">Admin</span>
                  <span className="ml-2 font-mono text-muted-foreground">admin@clockit.demo</span>
                </span>
                <span className="font-mono text-muted-foreground">ClockIt#2026</span>
              </button>
              <button
                type="button"
                onClick={() => useDemo("staff")}
                className="flex w-full items-center justify-between rounded-xl bg-card px-3 py-2 text-left ring-1 ring-border transition-colors hover:bg-primary/5"
              >
                <span>
                  <span className="font-semibold">Staff</span>
                  <span className="ml-2 font-mono text-muted-foreground">staff@clockit.demo</span>
                </span>
                <span className="font-mono text-muted-foreground">ClockIt#2026</span>
              </button>
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">
              Selecting a demo account signs you straight in. Staff accounts land on the personal
              dashboard; admins land on the full console.
            </p>
          </div>

          <p className="mt-4 text-[11px] text-muted-foreground">
            Any other email address creates a staff account linked to the staff directory.{" "}
            <Link to="/dashboard" className="text-primary">
              Already signed in?
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
