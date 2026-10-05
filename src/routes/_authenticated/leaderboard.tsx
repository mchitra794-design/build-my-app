import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/clockit/AppShell";
import { Panel } from "@/components/clockit/StatCard";
import { useAuth } from "@/hooks/useAuth";
import { useClockitData } from "@/hooks/useClockitData";
import { initials } from "@/lib/clockit";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/leaderboard")({
  head: () => ({
    meta: [
      { title: "Leaderboard — ClockIt" },
      { name: "description", content: "Staff ranked by attendance engagement points." },
      { property: "og:title", content: "Leaderboard — ClockIt" },
      { property: "og:description", content: "Staff ranked by engagement points." },
    ],
  }),
  component: LeaderboardPage,
});

function LeaderboardPage() {
  const { profile } = useAuth();
  const { summaries } = useClockitData();
  const ranked = [...summaries].sort((a, b) => b.profile.points - a.profile.points);

  return (
    <AppShell title="Leaderboard" subtitle="Ranked by points">
      <Panel>
        <ol className="space-y-2 text-sm">
          {ranked.map((s, i) => (
            <li key={s.profile.id} className={cn("flex items-center gap-3 rounded-2xl px-3 py-2", s.profile.id === profile?.id ? "bg-primary/10 ring-1 ring-primary/20" : "bg-muted")}>
              <span className="mono-label w-6">{i + 1}</span>
              <span className="grid size-8 place-items-center rounded-xl bg-card text-xs font-semibold text-primary">{initials(s.profile.full_name)}</span>
              <span className="min-w-0 truncate font-medium">{s.profile.full_name}</span>
              <span className="mono-label hidden sm:inline">{s.profile.department}</span>
              <span className="ml-auto font-mono text-xs">{s.streak}d streak</span>
              <span className="w-14 text-right font-mono font-semibold">{s.profile.points}</span>
            </li>
          ))}
        </ol>
      </Panel>
    </AppShell>
  );
}
