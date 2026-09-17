import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { AppShell } from "@/components/clockit/AppShell";
import { Panel, StatCard } from "@/components/clockit/StatCard";
import { StaffTable } from "@/routes/_authenticated/dashboard";
import { departmentList, useClockitData } from "@/hooks/useClockitData";
import { TIER_META, type Tier } from "@/lib/clockit";

export const Route = createFileRoute("/_authenticated/staff/")({
  head: () => ({
    meta: [
      { title: "Staff directory — ClockIt" },
      { name: "description", content: "Search, filter and review every staff member's attendance." },
      { property: "og:title", content: "Staff directory — ClockIt" },
      { property: "og:description", content: "Search and filter staff attendance records." },
    ],
  }),
  component: StaffDirectory,
});

const selectClass =
  "rounded-2xl border border-border bg-card px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

function StaffDirectory() {
  const { profiles, summaries, loading } = useClockitData();
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("all");
  const [tier, setTier] = useState("all");

  const visible = summaries.filter((summary) => {
    const matchesSearch =
      search.trim() === "" ||
      `${summary.profile.full_name} ${summary.profile.staff_id} ${summary.profile.email} ${summary.profile.designation}`
        .toLowerCase()
        .includes(search.toLowerCase());
    const matchesDepartment = department === "all" || summary.profile.department === department;
    const matchesTier = tier === "all" || summary.tier === tier;
    return matchesSearch && matchesDepartment && matchesTier;
  });

  return (
    <AppShell title="Staff directory" subtitle={`${profiles.length} records`}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Staff" value={profiles.length} />
        <StatCard
          label="Normal"
          value={summaries.filter((s) => s.tier === "normal").length}
          tone="ok"
        />
        <StatCard
          label="Warning"
          value={summaries.filter((s) => s.tier === "warning").length}
          tone="warn"
        />
        <StatCard
          label="Critical"
          value={summaries.filter((s) => s.tier === "critical").length}
          tone="crit"
        />
      </div>

      <Panel title="All staff" subtitle="Click a name for the full attendance profile">
        <div className="mb-5 flex flex-wrap gap-3">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, staff ID, email"
            className={`${selectClass} min-w-52 flex-1`}
          />
          <select
            value={department}
            onChange={(event) => setDepartment(event.target.value)}
            className={selectClass}
          >
            <option value="all">All departments</option>
            {departmentList(profiles).map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select value={tier} onChange={(event) => setTier(event.target.value)} className={selectClass}>
            <option value="all">All tiers</option>
            {(Object.keys(TIER_META) as Tier[]).map((item) => (
              <option key={item} value={item}>
                {TIER_META[item].label}
              </option>
            ))}
          </select>
        </div>

        {loading ? <p className="text-sm text-muted-foreground">Loading directory…</p> : null}
        <StaffTable summaries={visible} />
        {!loading && visible.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">No staff match these filters.</p>
        ) : null}
      </Panel>
    </AppShell>
  );
}
