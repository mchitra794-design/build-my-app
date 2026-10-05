import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/clockit/AppShell";
import { Panel, StatCard } from "@/components/clockit/StatCard";
import { useAuth } from "@/hooks/useAuth";
import { useClockitData } from "@/hooks/useClockitData";
import { formatDate } from "@/lib/clockit";

export const Route = createFileRoute("/_authenticated/achievements")({
  head: () => ({
    meta: [
      { title: "Achievements — ClockIt" },
      { name: "description", content: "Your points, badges and attendance streak." },
      { property: "og:title", content: "Achievements — ClockIt" },
      { property: "og:description", content: "Your points, badges and attendance streak." },
    ],
  }),
  component: AchievementsPage,
});

function AchievementsPage() {
  const { profile } = useAuth();
  const { summaries, badges } = useClockitData();
  const me = summaries.find((s) => s.profile.id === profile?.id);
  const mine = badges.filter((b) => b.profile_id === profile?.id);

  return (
    <AppShell title="Achievements" subtitle="Rewards for consistent attendance">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Points" value={me?.profile.points ?? 0} tone="brand" />
        <StatCard label="Streak" value={`${me?.streak ?? 0} days`} tone="ok" />
        <StatCard label="Badges" value={mine.length} />
      </div>
      <Panel title="My badges">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {mine.map((b) => (
            <div key={b.id} className="rounded-2xl bg-muted p-4">
              <div className="text-2xl">{b.icon}</div>
              <div className="mt-2 font-semibold">{b.name}</div>
              <p className="text-xs text-muted-foreground">{b.description}</p>
              <div className="mono-label mt-2">{formatDate(b.awarded_at.slice(0, 10))}</div>
            </div>
          ))}
          {mine.length === 0 ? <p className="text-xs text-muted-foreground">No badges yet — keep showing up!</p> : null}
        </div>
      </Panel>
    </AppShell>
  );
}
