import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AppShell } from "@/components/clockit/AppShell";
import { Panel, StatCard } from "@/components/clockit/StatCard";
import { Pill, RiskPill, StatusPill, TierPill } from "@/components/clockit/StatusPill";
import { useAuth } from "@/hooks/useAuth";
import { useClockitData, type StaffSummary } from "@/hooks/useClockitData";
import {
  EVENT_TYPE_LABEL,
  computeStats,
  formatShortDate,
  formatTime,
  initials,
  todayISO,
  type AttendanceRow,
} from "@/lib/clockit";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — ClockIt" },
      { name: "description", content: "Attendance KPIs, trends, risk analysis and upcoming events." },
      { property: "og:title", content: "Dashboard — ClockIt" },
      { property: "og:description", content: "Attendance KPIs, trends and risk analysis." },
    ],
  }),
  component: DashboardPage,
});

function trendSeries(rows: AttendanceRow[], days = 14) {
  const byDate = new Map<string, AttendanceRow[]>();
  for (const row of rows) {
    const list = byDate.get(row.date);
    if (list) list.push(row);
    else byDate.set(row.date, [row]);
  }
  return Array.from(byDate.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .slice(-days)
    .map(([date, dayRows]) => ({
      date: formatShortDate(date),
      percentage: computeStats(dayRows).percentage,
    }));
}

function DashboardPage() {
  const { isAdmin } = useAuth();
  return isAdmin ? <AdminDashboard /> : <StaffDashboard />;
}

function AdminDashboard() {
  const { summaries, attendance, events, notifications, settings, loading } = useClockitData();
  const today = todayISO();
  const todayRows = attendance.filter((row) => row.date === today);
  const org = computeStats(attendance);
  const trend = trendSeries(attendance);

  const critical = summaries.filter((s) => s.tier === "critical");
  const warning = summaries.filter((s) => s.tier === "warning");
  const atRisk = [...summaries]
    .sort((a, b) => a.prediction.predicted - b.prediction.predicted)
    .slice(0, 4);
  const leaders = [...summaries].sort((a, b) => b.profile.points - a.profile.points).slice(0, 5);
  const upcoming = events.filter((event) => event.end_date >= today).slice(0, 5);

  const breakdown = [
    { name: "Present", value: org.present, color: "var(--ok)" },
    { name: "Late", value: org.late, color: "var(--warn)" },
    { name: "Half day", value: org.halfDay, color: "var(--primary)" },
    { name: "Leave", value: org.leave, color: "var(--muted-foreground)" },
    { name: "Absent", value: org.absent, color: "var(--crit)" },
  ];

  const byDepartment = Object.entries(
    summaries.reduce<Record<string, { total: number; sum: number }>>((acc, s) => {
      const bucket = (acc[s.profile.department] ??= { total: 0, sum: 0 });
      bucket.total += 1;
      bucket.sum += s.stats.percentage;
      return acc;
    }, {}),
  ).map(([department, { total, sum }]) => ({
    department,
    percentage: Math.round((sum / total) * 10) / 10,
  }));

  return (
    <AppShell
      title="Organisation overview"
      subtitle={settings?.organization_name ?? "ClockIt"}
      actions={
        <Link
          to="/attendance"
          className="hidden rounded-2xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 sm:inline-block"
        >
          Mark attendance
        </Link>
      }
    >
      {loading ? <p className="text-sm text-muted-foreground">Loading attendance data…</p> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Staff" value={summaries.length} hint="Active directory records" />
        <StatCard
          label="Present today"
          value={todayRows.filter((r) => r.status === "present" || r.status === "late").length}
          hint={`${todayRows.length} records marked`}
          tone="ok"
        />
        <StatCard label="Org attendance" value={`${org.percentage}%`} hint="Last 120 days" tone="brand" />
        <StatCard label="Warning" value={warning.length} hint="Below required threshold" tone="warn" />
        <StatCard label="Critical" value={critical.length} hint="Shortage action needed" tone="crit" />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Panel title="Attendance trend" subtitle="Daily organisation attendance" className="xl:col-span-2">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ left: -20, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis domain={[50, 100]} tickLine={false} axisLine={false} fontSize={11} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 14,
                    border: "1px solid var(--border)",
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="percentage"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  fill="url(#trendFill)"
                  name="Attendance %"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Status breakdown" subtitle="All records in range">
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={breakdown} dataKey="value" nameKey="name" innerRadius={44} outerRadius={72}>
                  {breakdown.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 14, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-4 space-y-2 text-xs">
            {breakdown.map((entry) => (
              <li key={entry.name} className="flex items-center gap-2">
                <span className="size-2 rounded-full" style={{ background: entry.color }} />
                <span className="text-muted-foreground">{entry.name}</span>
                <span className="ml-auto font-mono">{entry.value}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Panel
          title="AI absence risk"
          subtitle="Prototype projection from attendance history"
          brand
          className="xl:col-span-2"
        >
          <div className="space-y-3">
            {atRisk.map((summary) => (
              <div key={summary.profile.id} className="rounded-2xl bg-card p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-semibold">{summary.profile.full_name}</span>
                  <span className="mono-label">{summary.profile.department}</span>
                  <span className="ml-auto font-mono text-sm">{summary.prediction.predicted}%</span>
                  <RiskPill risk={summary.prediction.risk} />
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {summary.prediction.explanation}
                </p>
              </div>
            ))}
          </div>
          <Link to="/ai-insights" className="mt-4 inline-block text-xs font-medium text-primary">
            View all insights →
          </Link>
        </Panel>

        <Panel title="Leaderboard" subtitle="Engagement points">
          <ol className="space-y-3 text-sm">
            {leaders.map((summary, index) => (
              <li key={summary.profile.id} className="flex items-center gap-3">
                <span className="mono-label w-4">{index + 1}</span>
                <span className="grid size-8 place-items-center rounded-xl bg-primary/10 text-xs font-semibold text-primary">
                  {initials(summary.profile.full_name)}
                </span>
                <span className="min-w-0 truncate">{summary.profile.full_name}</span>
                <span className="ml-auto font-mono text-xs">{summary.profile.points}</span>
              </li>
            ))}
          </ol>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Panel title="Department attendance" subtitle="Average per department" className="xl:col-span-2">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byDepartment} margin={{ left: -20, right: 8 }}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="department" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis domain={[0, 100]} tickLine={false} axisLine={false} fontSize={11} />
                <Tooltip contentStyle={{ borderRadius: 14, fontSize: 12 }} />
                <Bar dataKey="percentage" fill="var(--primary)" radius={[8, 8, 0, 0]} name="Attendance %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Upcoming events" subtitle="Next scheduled activities">
          <ul className="space-y-3 text-sm">
            {upcoming.map((event) => (
              <li key={event.id} className="rounded-2xl bg-muted p-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{event.title}</span>
                  <Pill tone="brand" className="ml-auto">
                    {EVENT_TYPE_LABEL[event.event_type]}
                  </Pill>
                </div>
                <div className="mono-label mt-1">
                  {formatShortDate(event.start_date)} · {formatTime(event.start_time)} ·{" "}
                  {event.location ?? "TBC"}
                </div>
              </li>
            ))}
            {upcoming.length === 0 ? (
              <li className="text-xs text-muted-foreground">No upcoming events.</li>
            ) : null}
          </ul>
          <Link to="/calendar" className="mt-4 inline-block text-xs font-medium text-primary">
            Open calendar →
          </Link>
        </Panel>
      </div>

      <Panel
        title="Staff attendance"
        subtitle="Shortage tiers across the directory"
        action={
          <Link to="/staff" className="text-xs font-medium text-primary">
            Full directory →
          </Link>
        }
      >
        <StaffTable summaries={summaries.slice(0, 8)} />
      </Panel>

      <Panel title="Recent alerts" subtitle="Shortage and event notifications">
        <ul className="space-y-3 text-sm">
          {notifications.slice(0, 5).map((note) => (
            <li key={note.id} className="rounded-2xl bg-muted p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{note.title}</span>
                <Pill
                  tone={note.priority === "high" ? "crit" : note.priority === "medium" ? "warn" : "muted"}
                  className="ml-auto"
                >
                  {note.priority}
                </Pill>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{note.message}</p>
            </li>
          ))}
        </ul>
      </Panel>
    </AppShell>
  );
}

export function StaffTable({ summaries }: { summaries: StaffSummary[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            {["Staff", "Department", "Attendance", "Streak", "Points", "Tier"].map((head) => (
              <th key={head} className="mono-label pb-3 font-medium">
                {head}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {summaries.map((summary) => (
            <tr key={summary.profile.id} className="border-b border-border/60 last:border-0">
              <td className="py-3">
                <Link
                  to="/staff/$id"
                  params={{ id: summary.profile.id }}
                  className="flex items-center gap-3 font-medium hover:text-primary"
                >
                  <span className="grid size-8 place-items-center rounded-xl bg-primary/10 text-xs font-semibold text-primary">
                    {initials(summary.profile.full_name)}
                  </span>
                  <span>
                    {summary.profile.full_name}
                    <span className="mono-label block">{summary.profile.staff_id}</span>
                  </span>
                </Link>
              </td>
              <td className="py-3 text-muted-foreground">{summary.profile.department}</td>
              <td className="py-3 font-mono">{summary.stats.percentage}%</td>
              <td className="py-3 font-mono">{summary.streak}</td>
              <td className="py-3 font-mono">{summary.profile.points}</td>
              <td className="py-3">
                <TierPill tier={summary.tier} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StaffDashboard() {
  const { profile } = useAuth();
  const { summaries, events, notifications, badges, settings, loading } = useClockitData();
  const me = summaries.find((s) => s.profile.id === profile?.id);
  const today = todayISO();
  const myBadges = badges.filter((badge) => badge.profile_id === profile?.id);
  const upcoming = events.filter((event) => event.end_date >= today).slice(0, 4);
  const trend = me ? trendSeries(me.rows, 20) : [];
  const rank = [...summaries]
    .sort((a, b) => b.profile.points - a.profile.points)
    .findIndex((s) => s.profile.id === profile?.id);

  return (
    <AppShell
      title={`Welcome back, ${profile?.full_name?.split(" ")[0] ?? "there"}`}
      subtitle={`${profile?.designation ?? ""} · ${profile?.department ?? ""}`}
    >
      {loading ? <p className="text-sm text-muted-foreground">Loading your records…</p> : null}
      {!loading && !me ? (
        <Panel title="No attendance record yet">
          <p className="text-sm text-muted-foreground">
            Your staff profile is not linked to attendance records yet. An administrator can add you to
            the directory and start marking attendance.
          </p>
        </Panel>
      ) : null}

      {me ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard
              label="My attendance"
              value={`${me.stats.percentage}%`}
              hint={`Required ${settings?.required_percentage ?? 80}%`}
              tone={me.tier === "normal" ? "ok" : me.tier === "warning" ? "warn" : "crit"}
            />
            <StatCard label="Present" value={me.stats.present} hint={`of ${me.stats.total} records`} />
            <StatCard label="Absent" value={me.stats.absent} tone="crit" />
            <StatCard label="Streak" value={`${me.streak} days`} hint="Consecutive attendance" tone="brand" />
            <StatCard
              label="Points"
              value={me.profile.points}
              hint={rank >= 0 ? `Rank #${rank + 1}` : undefined}
              tone="brand"
            />
          </div>

          {me.tier !== "normal" ? (
            <Panel className="border-l-4 border-l-warn">
              <div className="flex flex-wrap items-center gap-3">
                <TierPill tier={me.tier} />
                <p className="text-sm">
                  Your attendance is {me.stats.percentage}%, below the required{" "}
                  {settings?.required_percentage ?? 80}%. Attending the next{" "}
                  {Math.max(1, Math.ceil(me.stats.absent * 0.8))} sessions will bring you back on track.
                </p>
              </div>
            </Panel>
          ) : null}

          <div className="grid gap-6 xl:grid-cols-3">
            <Panel title="My attendance trend" subtitle="Recent records" className="xl:col-span-2">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trend} margin={{ left: -20, right: 8, top: 8 }}>
                    <defs>
                      <linearGradient id="myTrend" x1="0" y1="0" x2="0" y2="1">
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
                      fill="url(#myTrend)"
                      name="Attendance %"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <Panel title="AI projection" subtitle="Prototype decision support" brand>
              <div className="flex items-center gap-3">
                <span className="text-3xl font-semibold">{me.prediction.predicted}%</span>
                <RiskPill risk={me.prediction.risk} />
              </div>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                {me.prediction.explanation}
              </p>
            </Panel>
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <Panel title="Recent attendance" subtitle="Last 10 records" className="xl:col-span-2">
              <ul className="space-y-2 text-sm">
                {me.rows.slice(0, 10).map((row) => (
                  <li key={row.id} className="flex items-center gap-3 rounded-2xl bg-muted px-3 py-2">
                    <span className="font-mono text-xs">{formatShortDate(row.date)}</span>
                    <StatusPill status={row.status} />
                    <span className="ml-auto font-mono text-xs text-muted-foreground">
                      {formatTime(row.check_in)} – {formatTime(row.check_out)}
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>

            <div className="space-y-6">
              <Panel title="My badges" subtitle={`${myBadges.length} earned`}>
                <ul className="space-y-2 text-sm">
                  {myBadges.map((badge) => (
                    <li key={badge.id} className="flex items-center gap-3 rounded-2xl bg-muted px-3 py-2">
                      <span className="text-lg">{badge.icon}</span>
                      <span>
                        {badge.name}
                        <span className="mono-label block">{badge.description}</span>
                      </span>
                    </li>
                  ))}
                  {myBadges.length === 0 ? (
                    <li className="text-xs text-muted-foreground">
                      No badges yet — keep your streak going.
                    </li>
                  ) : null}
                </ul>
              </Panel>

              <Panel title="Upcoming events">
                <ul className="space-y-2 text-sm">
                  {upcoming.map((event) => (
                    <li key={event.id} className="rounded-2xl bg-muted px-3 py-2">
                      <div className="font-medium">{event.title}</div>
                      <div className="mono-label mt-1">
                        {formatShortDate(event.start_date)} · {EVENT_TYPE_LABEL[event.event_type]}
                      </div>
                    </li>
                  ))}
                </ul>
              </Panel>
            </div>
          </div>

          <Panel title="My notifications">
            <ul className="space-y-2 text-sm">
              {notifications.slice(0, 5).map((note) => (
                <li key={note.id} className="rounded-2xl bg-muted px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{note.title}</span>
                    {!note.is_read ? (
                      <Pill tone="brand" className="ml-auto">
                        New
                      </Pill>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{note.message}</p>
                </li>
              ))}
            </ul>
          </Panel>
        </>
      ) : null}
    </AppShell>
  );
}
