import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/clockit/AppShell";
import { Panel, StatCard } from "@/components/clockit/StatCard";
import { Pill } from "@/components/clockit/StatusPill";
import { useClockitData } from "@/hooks/useClockitData";
import { initials } from "@/lib/clockit";

export const Route = createFileRoute("/_authenticated/gamification")({
  head: () => ({
    meta: [
      { title: "Gamification — ClockIt" },
      { name: "description", content: "Points, badges, streaks and the organisation attendance leaderboard." },
      { property: "og:title", content: "Gamification — ClockIt" },
      { property: "og:description", content: "Points, badges, streaks and the leaderboard." },
    ],
  }),
  component: GamificationPage,
});

function GamificationPage() {
  const { summaries, badges, loading } = useClockitData();
  const leaderboard = [...summaries].sort((a, b) => b.profile.points - a.profile.points);
  const streaks = [...summaries].sort((a, b) => b.streak - a.streak).slice(0, 5);
  const totalPoints = summaries.reduce((sum, s) => sum + s.profile.points, 0);

  const badgeTypes = Object.entries(
    badges.reduce<Record<string, { icon: string; count: number; description: string }>>((acc, badge) => {
      const bucket = (acc[badge.name] ??= {
        icon: badge.icon,
        count: 0,
        description: badge.description ?? "",
      });
      bucket.count += 1;
      return acc;
    }, {}),
  );

  return (
    <AppShell title="Gamification" subtitle="Engagement points, badges and streaks">
      {loading ? <p className="text-sm text-muted-foreground">Loading engagement data…</p> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Points awarded" value={totalPoints} tone="brand" />
        <StatCard label="Badges earned" value={badges.length} />
        <StatCard label="Longest streak" value={`${streaks[0]?.streak ?? 0} days`} tone="ok" />
        <StatCard label="Participants" value={summaries.length} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Panel title="Leaderboard" subtitle="Ranked by points" className="xl:col-span-2">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  {["#", "Staff", "Department", "Attendance", "Streak", "Badges", "Points"].map((head) => (
                    <th key={head} className="mono-label pb-3 font-medium">
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((summary, index) => (
                  <tr key={summary.profile.id} className="border-b border-border/60 last:border-0">
                    <td className="py-3 font-mono text-xs">{index + 1}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-3 font-medium">
                        <span className="grid size-8 place-items-center rounded-xl bg-primary/10 text-xs font-semibold text-primary">
                          {initials(summary.profile.full_name)}
                        </span>
                        {summary.profile.full_name}
                      </div>
                    </td>
                    <td className="py-3 text-muted-foreground">{summary.profile.department}</td>
                    <td className="py-3 font-mono">{summary.stats.percentage}%</td>
                    <td className="py-3 font-mono">{summary.streak}</td>
                    <td className="py-3 font-mono">{summary.badgeCount}</td>
                    <td className="py-3 font-mono font-semibold">{summary.profile.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <div className="space-y-6">
          <Panel title="Top streaks">
            <ul className="space-y-3 text-sm">
              {streaks.map((summary) => (
                <li key={summary.profile.id} className="flex items-center gap-3">
                  <span className="min-w-0 truncate">{summary.profile.full_name}</span>
                  <span className="ml-auto font-mono text-xs">{summary.streak} days</span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Badge catalogue">
            <ul className="space-y-2 text-sm">
              {badgeTypes.map(([name, info]) => (
                <li key={name} className="flex items-center gap-3 rounded-2xl bg-muted px-3 py-2">
                  <span className="text-lg">{info.icon}</span>
                  <span className="min-w-0">
                    {name}
                    <span className="mono-label block truncate">{info.description}</span>
                  </span>
                  <Pill tone="brand" className="ml-auto">
                    {info.count}
                  </Pill>
                </li>
              ))}
              {badgeTypes.length === 0 ? (
                <li className="text-xs text-muted-foreground">No badges awarded yet.</li>
              ) : null}
            </ul>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
