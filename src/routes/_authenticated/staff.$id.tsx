import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AppShell } from "@/components/clockit/AppShell";
import { Panel, StatCard } from "@/components/clockit/StatCard";
import { RiskPill, StatusPill, TierPill } from "@/components/clockit/StatusPill";
import { useClockitData } from "@/hooks/useClockitData";
import { computeStats, formatDate, formatShortDate, formatTime, initials } from "@/lib/clockit";

export const Route = createFileRoute("/_authenticated/staff/$id")({
  head: () => ({
    meta: [
      { title: "Staff profile — ClockIt" },
      { name: "description", content: "Individual attendance history, risk projection and badges." },
      { property: "og:title", content: "Staff profile — ClockIt" },
      { property: "og:description", content: "Individual attendance history and risk projection." },
    ],
  }),
  component: StaffProfilePage,
});

function StaffProfilePage() {
  const { id } = Route.useParams();
  const { summaries, badges, loading } = useClockitData();
  const summary = summaries.find((item) => item.profile.id === id);

  if (loading) {
    return (
      <AppShell title="Staff profile">
        <p className="text-sm text-muted-foreground">Loading profile…</p>
      </AppShell>
    );
  }

  if (!summary) {
    return (
      <AppShell title="Staff profile">
        <Panel title="Not found">
          <p className="text-sm text-muted-foreground">
            This staff record doesn't exist or you don't have access to it.
          </p>
          <Link to="/staff" className="mt-3 inline-block text-xs font-medium text-primary">
            Back to directory →
          </Link>
        </Panel>
      </AppShell>
    );
  }

  const { profile, stats, rows, tier, prediction, streak } = summary;
  const ownBadges = badges.filter((badge) => badge.profile_id === profile.id);

  const trend = Array.from(
    rows
      .slice()
      .sort((a, b) => (a.date < b.date ? -1 : 1))
      .reduce<Map<string, typeof rows>>((acc, row) => {
        acc.set(row.date, [row]);
        return acc;
      }, new Map()),
  )
    .slice(-30)
    .map(([date, dayRows]) => ({
      date: formatShortDate(date),
      percentage: computeStats(dayRows).percentage,
    }));

  return (
    <AppShell title={profile.full_name} subtitle={`${profile.designation} · ${profile.department}`}>
      <Panel>
        <div className="flex flex-wrap items-center gap-4">
          <span className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-lg font-semibold text-primary">
            {initials(profile.full_name)}
          </span>
          <div>
            <div className="text-lg font-semibold">{profile.full_name}</div>
            <div className="mono-label mt-1">
              {profile.staff_id} · {profile.email} · joined {formatDate(profile.joining_date)}
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <TierPill tier={tier} />
            <RiskPill risk={prediction.risk} />
          </div>
        </div>
      </Panel>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Attendance" value={`${stats.percentage}%`} tone="brand" />
        <StatCard label="Present" value={stats.present} tone="ok" />
        <StatCard label="Absent" value={stats.absent} tone="crit" />
        <StatCard label="Streak" value={`${streak} days`} />
        <StatCard label="Points" value={profile.points} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Panel title="Attendance pattern" subtitle="Last 30 recorded days" className="xl:col-span-2">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ left: -20, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="staffTrend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis domain={[0, 100]} tickLine={false} axisLine={false} fontSize={11} />
                <Tooltip contentStyle={{ borderRadius: 14, fontSize: 12 }} />
                <Area
                  type="monotone"
                  dataKey="percentage"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  fill="url(#staffTrend)"
                  name="Attendance %"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="AI projection" brand>
          <div className="flex items-center gap-3">
            <span className="text-3xl font-semibold">{prediction.predicted}%</span>
            <RiskPill risk={prediction.risk} />
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{prediction.explanation}</p>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Panel title="Attendance records" className="xl:col-span-2">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  {["Date", "Status", "Check in", "Check out"].map((head) => (
                    <th key={head} className="mono-label pb-3 font-medium">
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 20).map((row) => (
                  <tr key={row.id} className="border-b border-border/60 last:border-0">
                    <td className="py-3">{formatDate(row.date)}</td>
                    <td className="py-3">
                      <StatusPill status={row.status} />
                    </td>
                    <td className="py-3 font-mono text-xs">{formatTime(row.check_in)}</td>
                    <td className="py-3 font-mono text-xs">{formatTime(row.check_out)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Badges" subtitle={`${ownBadges.length} earned`}>
          <ul className="space-y-2 text-sm">
            {ownBadges.map((badge) => (
              <li key={badge.id} className="flex items-center gap-3 rounded-2xl bg-muted px-3 py-2">
                <span className="text-lg">{badge.icon}</span>
                <span>
                  {badge.name}
                  <span className="mono-label block">{badge.description}</span>
                </span>
              </li>
            ))}
            {ownBadges.length === 0 ? (
              <li className="text-xs text-muted-foreground">No badges earned yet.</li>
            ) : null}
          </ul>
        </Panel>
      </div>
    </AppShell>
  );
}
