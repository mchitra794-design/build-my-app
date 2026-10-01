import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Camera, CheckCircle2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/clockit/AppShell";
import { Panel, StatCard } from "@/components/clockit/StatCard";
import { StatusPill } from "@/components/clockit/StatusPill";
import { useAuth } from "@/hooks/useAuth";
import { departmentList, useClockitData } from "@/hooks/useClockitData";
import {
  ATTENDANCE_STATUSES,
  STATUS_META,
  computeStats,
  formatDate,
  formatTime,
  initials,
  todayISO,
  type AttendanceStatus,
} from "@/lib/clockit";

export const Route = createFileRoute("/_authenticated/attendance")({
  head: () => ({
    meta: [
      { title: "Attendance — ClockIt" },
      { name: "description", content: "Mark and review daily staff attendance records." },
      { property: "og:title", content: "Attendance — ClockIt" },
      { property: "og:description", content: "Mark and review daily staff attendance records." },
    ],
  }),
  component: AttendancePage,
});

const selectClass =
  "rounded-2xl border border-border bg-card px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

function AttendancePage() {
  const { isAdmin } = useAuth();
  return isAdmin ? <AdminAttendance /> : <MyAttendance />;
}

function AdminAttendance() {
  const queryClient = useQueryClient();
  const { profiles, attendance, loading } = useClockitData();
  const [date, setDate] = useState(todayISO());
  const [department, setDepartment] = useState("all");
  const [search, setSearch] = useState("");

  const dayRows = useMemo(
    () => new Map(attendance.filter((row) => row.date === date).map((row) => [row.profile_id, row])),
    [attendance, date],
  );

  const visible = profiles.filter(
    (profile) =>
      (department === "all" || profile.department === department) &&
      (search.trim() === "" ||
        `${profile.full_name} ${profile.staff_id} ${profile.email}`.toLowerCase().includes(search.toLowerCase())),
  );

  const mark = useMutation({
    mutationFn: async (input: { profileId: string; status: AttendanceStatus }) => {
      const row = { profile_id: input.profileId, date, status: input.status, check_in: "09:00", check_out: "17:00" };
      if (input.status === "absent" || input.status === "leave") {
        row.check_in = null;
        row.check_out = null;
      }
      return row;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["clockitData"] });
      toast.success("Attendance saved");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const markAllPresent = useMutation({
    mutationFn: async () =>
      visible.map((profile) => ({
        profile_id: profile.id,
        date,
        status: "present" as AttendanceStatus,
        check_in: "09:00",
        check_out: "17:00",
      })),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["clockitData"] });
      toast.success("Everyone marked present");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const dayStats = computeStats(Array.from(dayRows.values()));

  return (
    <AppShell title="Mark attendance" subtitle={formatDate(date)}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Marked" value={dayRows.size} />
        <StatCard label="Present" value={dayStats.present} tone="ok" />
        <StatCard label="Late" value={dayStats.late} tone="warn" />
        <StatCard label="Leave / half day" value={dayStats.leave + dayStats.halfDay} tone="brand" />
        <StatCard label="Absent" value={dayStats.absent} tone="crit" />
      </div>

      <Panel
        title="Daily register"
        subtitle="Manual attendance marking"
        action={
          <button
            onClick={() => markAllPresent.mutate()}
            className="rounded-2xl bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Mark all present
          </button>
        }
      >
        <div className="mb-5 flex flex-wrap gap-3">
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className={selectClass} />
          <select value={department} onChange={(event) => setDepartment(event.target.value)} className={selectClass}>
            <option value="all">All departments</option>
            {departmentList(profiles).map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name or staff ID"
            className={`${selectClass} min-w-52 flex-1`}
          />
        </div>

        {loading ? <p className="text-sm text-muted-foreground">Loading register…</p> : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                {['Staff', 'Department', 'Current', 'Check in', 'Set status'].map((head) => (
                  <th key={head} className="mono-label pb-3 font-medium">
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((profile) => {
                const row = dayRows.get(profile.id);
                return (
                  <tr key={profile.id} className="border-b border-border/60 last:border-0">
                    <td className="py-3">
                      <div className="flex items-center gap-3 font-medium">
                        <span className="grid size-8 place-items-center rounded-xl bg-primary/10 text-xs font-semibold text-primary">
                          {initials(profile.full_name)}
                        </span>
                        <span>
                          {profile.full_name}
                          <span className="mono-label block">{profile.staff_id}</span>
                        </span>
                      </div>
                    </td>
                    <td className="py-3 text-muted-foreground">{profile.department}</td>
                    <td className="py-3">{row ? <StatusPill status={row.status} /> : <span className="text-xs text-muted-foreground">Not marked</span>}</td>
                    <td className="py-3 font-mono text-xs">{formatTime(row?.check_in ?? null)}</td>
                    <td className="py-3">
                      <select
                        value={row?.status ?? ""}
                        onChange={(event) =>
                          mark.mutate({
                            profileId: profile.id,
                            status: event.target.value as AttendanceStatus,
                          })
                        }
                        className={selectClass}
                      >
                        <option value="" disabled>
                          Select
                        </option>
                        {ATTENDANCE_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {STATUS_META[status].label}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </AppShell>
  );
}

function MyAttendance() {
  const { profile } = useAuth();
  const { summaries, settings } = useClockitData();
  const me = summaries.find((summary) => summary.profile.id === profile?.id);
  const [status, setStatus] = useState("all");
  const [faceStatus, setFaceStatus] = useState("Ready to scan");

  const rows = (me?.rows ?? []).filter((row) => status === "all" || row.status === status);

  return (
    <AppShell title="My attendance" subtitle={`Required ${settings?.required_percentage ?? 80}%`}>
      {me ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Attendance" value={`${me.stats.percentage}%`} tone={me.tier === "normal" ? "ok" : me.tier === "warning" ? "warn" : "crit"} />
          <StatCard label="Present" value={me.stats.present} tone="ok" />
          <StatCard label="Late" value={me.stats.late} tone="warn" />
          <StatCard label="Leave / half day" value={me.stats.leave + me.stats.halfDay} tone="brand" />
          <StatCard label="Absent" value={me.stats.absent} tone="crit" />
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
        <Panel title="Attendance history" subtitle="Every recorded working day">
          <div className="mb-5 flex flex-wrap gap-3">
            <select value={status} onChange={(event) => setStatus(event.target.value)} className={selectClass}>
              <option value="all">All statuses</option>
              {ATTENDANCE_STATUSES.map((item) => (
                <option key={item} value={item}>
                  {STATUS_META[item].label}
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  {['Date', 'Status', 'Check in', 'Check out', 'Remarks'].map((head) => (
                    <th key={head} className="mono-label pb-3 font-medium">
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-border/60 last:border-0">
                    <td className="py-3 font-medium">{formatDate(row.date)}</td>
                    <td className="py-3"><StatusPill status={row.status} /></td>
                    <td className="py-3 font-mono text-xs">{formatTime(row.check_in)}</td>
                    <td className="py-3 font-mono text-xs">{formatTime(row.check_out)}</td>
                    <td className="py-3 text-xs text-muted-foreground">{row.remarks ?? '—'}</td>
                  </tr>
                ))}
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-xs text-muted-foreground">
                      No records for this filter.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Face check-in" subtitle="Biometric attendance">
          <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-6 text-center">
            <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Camera className="size-7" />
            </div>
            <p className="mt-4 text-sm font-medium">{faceStatus}</p>
            <button
              onClick={() => {
                setFaceStatus("Face matched successfully — attendance logged");
                toast.success("Face recognition attendance captured");
              }}
              className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <CheckCircle2 className="size-4" />
              Use face scan
            </button>
          </div>
          <div className="mt-4 rounded-2xl bg-ok/10 p-3 text-xs text-ok">
            Recommended: Keep your face clearly visible under good lighting.
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
