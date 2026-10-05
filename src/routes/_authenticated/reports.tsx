import { createFileRoute } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/clockit/AppShell";
import { Panel } from "@/components/clockit/StatCard";
import { TierPill } from "@/components/clockit/StatusPill";
import { departmentList, useClockitData } from "@/hooks/useClockitData";
import { computeStats, tierFor } from "@/lib/clockit";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "Reports — ClockIt" },
      { name: "description", content: "Generate and export attendance, shortage and department reports." },
      { property: "og:title", content: "Reports — ClockIt" },
      { property: "og:description", content: "Export attendance and shortage reports as CSV." },
    ],
  }),
  component: ReportsPage,
});

const selectClass =
  "rounded-2xl border border-border bg-card px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

function downloadCsv(name: string, rows: (string | number)[][]) {
  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
  toast.success(`${name} downloaded`);
}

function ReportsPage() {
  const { profiles, summaries, settings } = useClockitData();
  const [department, setDepartment] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const rows = summaries
    .filter((s) => department === "all" || s.profile.department === department)
    .map((s) => {
      const ranged = s.rows.filter((r) => (!from || r.date >= from) && (!to || r.date <= to));
      const stats = computeStats(ranged);
      return { s, stats, tier: tierFor(stats.percentage, settings ?? undefined) };
    });

  const header = ["Staff ID", "Name", "Department", "Present", "Late", "Half day", "Leave", "Absent", "Attendance %", "Tier"];
  const toCsv = (list: typeof rows) => [
    header,
    ...list.map(({ s, stats, tier }) => [
      s.profile.staff_id, s.profile.full_name, s.profile.department,
      stats.present, stats.late, stats.halfDay, stats.leave, stats.absent, stats.percentage, tier,
    ]),
  ];

  return (
    <AppShell title="Reports" subtitle="Filter, preview and export">
      <Panel title="Report filters">
        <div className="flex flex-wrap gap-3">
          <select value={department} onChange={(e) => setDepartment(e.target.value)} className={selectClass}>
            <option value="all">All departments</option>
            {departmentList(profiles).map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={selectClass} aria-label="From" />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={selectClass} aria-label="To" />
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <button onClick={() => downloadCsv("attendance-report.csv", toCsv(rows))} className="flex items-center gap-2 rounded-2xl bg-primary px-4 py-2 text-xs font-medium text-primary-foreground">
            <Download className="size-4" /> Attendance report
          </button>
          <button onClick={() => downloadCsv("shortage-report.csv", toCsv(rows.filter((r) => r.tier !== "normal")))} className="flex items-center gap-2 rounded-2xl bg-muted px-4 py-2 text-xs font-medium">
            <Download className="size-4" /> Shortage report
          </button>
          <button onClick={() => window.print()} className="flex items-center gap-2 rounded-2xl bg-muted px-4 py-2 text-xs font-medium">
            Print / save as PDF
          </button>
        </div>
      </Panel>

      <Panel title="Preview" subtitle={`${rows.length} staff`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                {["Staff", "Department", "Present", "Absent", "Attendance", "Tier"].map((h) => (
                  <th key={h} className="mono-label pb-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ s, stats, tier }) => (
                <tr key={s.profile.id} className="border-b border-border/60 last:border-0">
                  <td className="py-3 font-medium">{s.profile.full_name}</td>
                  <td className="py-3 text-muted-foreground">{s.profile.department}</td>
                  <td className="py-3 font-mono">{stats.present}</td>
                  <td className="py-3 font-mono">{stats.absent}</td>
                  <td className="py-3 font-mono">{stats.percentage}%</td>
                  <td className="py-3"><TierPill tier={tier} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </AppShell>
  );
}
