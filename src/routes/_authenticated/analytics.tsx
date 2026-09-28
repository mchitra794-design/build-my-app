import { createFileRoute } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AppShell } from "@/components/clockit/AppShell";
import { Panel, StatCard } from "@/components/clockit/StatCard";
import { TierPill } from "@/components/clockit/StatusPill";
import { useClockitData } from "@/hooks/useClockitData";
import { computeStats, formatShortDate } from "@/lib/clockit";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — ClockIt" },
      { name: "description", content: "Attendance analytics by department, status and time period." },
      { property: "og:title", content: "Analytics — ClockIt" },
      { property: "og:description", content: "Attendance analytics by department and period." },
    ],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const { attendance, summaries, loading } = useClockitData();
  const org = computeStats(attendance);

  const byDate = new Map<string, typeof attendance>();
  for (const row of attendance) {
    const list = byDate.get(row.date);
    if (list) list.push(row);
    else byDate.set(row.date, [row]);
  }
  const daily = Array.from(byDate.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([date, rows]) => {
      const stats = computeStats(rows);
      return {
        date: formatShortDate(date),
        percentage: stats.percentage,
        absent: stats.absent,
        late: stats.late,
      };
    });

  const departments = Object.entries(
    summaries.reduce<Record<string, { count: number; sum: number; critical: number }>>((acc, s) => {
      const bucket = (acc[s.profile.department] ??= { count: 0, sum: 0, critical: 0 });
      bucket.count += 1;
      bucket.sum += s.stats.percentage;
      if (s.tier === "critical") bucket.critical += 1;
      return acc;
    }, {}),
  ).map(([department, value]) => ({
    department,
    percentage: Math.round((value.sum / value.count) * 10) / 10,
    staff: value.count,
    critical: value.critical,
  }));

  const tiers = [
    { name: "Normal", value: summaries.filter((s) => s.tier === "normal").length, color: "var(--ok)" },
    { name: "Warning", value: summaries.filter((s) => s.tier === "warning").length, color: "var(--warn)" },
    { name: "Critical", value: summaries.filter((s) => s.tier === "critical").length, color: "var(--crit)" },
  ];

  const best = [...summaries].sort((a, b) => b.stats.percentage - a.stats.percentage).slice(0, 5);
  const worst = [...summaries].sort((a, b) => a.stats.percentage - b.stats.percentage).slice(0, 5);

  return (
    <AppShell title="Analytics" subtitle="Attendance performance across the organisation">
      {loading ? <p className="text-sm text-muted-foreground">Crunching numbers…</p> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Overall attendance" value={`${org.percentage}%`} tone="brand" />
        <StatCard label="Records analysed" value={org.total} />
        <StatCard label="Absences" value={org.absent} tone="crit" />
        <StatCard label="Late arrivals" value={org.late} tone="warn" />
      </div>

      <Panel title="Attendance over time" subtitle="Daily percentage, absences and late arrivals">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={daily} margin={{ left: -20, right: 8, top: 8 }}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={11} />
              <YAxis tickLine={false} axisLine={false} fontSize={11} />
              <Tooltip contentStyle={{ borderRadius: 14, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="percentage" stroke="var(--primary)" strokeWidth={2} dot={false} name="Attendance %" />
              <Line type="monotone" dataKey="absent" stroke="var(--crit)" strokeWidth={2} dot={false} name="Absent" />
              <Line type="monotone" dataKey="late" stroke="var(--warn)" strokeWidth={2} dot={false} name="Late" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-3">
        <Panel title="Department comparison" className="xl:col-span-2">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={departments} margin={{ left: -20, right: 8 }}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="department" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis domain={[0, 100]} tickLine={false} axisLine={false} fontSize={11} />
                <Tooltip contentStyle={{ borderRadius: 14, fontSize: 12 }} />
                <Bar dataKey="percentage" fill="var(--primary)" radius={[8, 8, 0, 0]} name="Attendance %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Shortage tiers">
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={tiers} dataKey="value" nameKey="name" innerRadius={44} outerRadius={72}>
                  {tiers.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 14, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-4 space-y-2 text-xs">
            {tiers.map((tier) => (
              <li key={tier.name} className="flex items-center gap-2">
                <span className="size-2 rounded-full" style={{ background: tier.color }} />
                <span className="text-muted-foreground">{tier.name}</span>
                <span className="ml-auto font-mono">{tier.value}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Highest attendance" subtitle="Top 5 staff">
          <RankList items={best} />
        </Panel>
        <Panel title="Needs attention" subtitle="Lowest 5 staff">
          <RankList items={worst} />
        </Panel>
      </div>

      <Panel title="Department detail">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                {["Department", "Staff", "Average attendance", "Critical"].map((head) => (
                  <th key={head} className="mono-label pb-3 font-medium">
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {departments.map((row) => (
                <tr key={row.department} className="border-b border-border/60 last:border-0">
                  <td className="py-3 font-medium">{row.department}</td>
                  <td className="py-3 font-mono">{row.staff}</td>
                  <td className="py-3 font-mono">{row.percentage}%</td>
                  <td className="py-3 font-mono">{row.critical}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </AppShell>
  );
}

function RankList({ items }: { items: ReturnType<typeof useClockitData>["summaries"] }) {
  return (
    <ul className="space-y-3 text-sm">
      {items.map((summary) => (
        <li key={summary.profile.id} className="flex items-center gap-3">
          <span className="min-w-0 truncate font-medium">{summary.profile.full_name}</span>
          <span className="mono-label truncate">{summary.profile.department}</span>
          <span className="ml-auto font-mono text-xs">{summary.stats.percentage}%</span>
          <TierPill tier={summary.tier} />
        </li>
      ))}
    </ul>
  );
}
