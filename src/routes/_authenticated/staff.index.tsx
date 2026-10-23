import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";\nimport { useQueryClient } from "@tanstack/react-query";\nimport { toast } from "sonner";\nimport { supabase } from "@/integrations/supabase/client";

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
  const { profiles, summaries, loading } = useClockitData();\n  const queryClient = useQueryClient();\n  const [adding, setAdding] = useState(false);\n  const [staffId, setStaffId] = useState("");\n  const [fullName, setFullName] = useState("");\n  const [email, setEmail] = useState("");\n  const [departmentName, setDepartmentName] = useState("Computer Science");\n  const [designation, setDesignation] = useState("Staff");
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

      <Panel title="Staff management" subtitle="Add and maintain staff profile records">
        <button onClick={() => setAdding((value) => !value)} className="rounded-2xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          {adding ? "Cancel" : "Add staff"}
        </button>
        {adding ? (
          <form onSubmit={(event) => void addStaff(event)} className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <input required value={staffId} onChange={(e) => setStaffId(e.target.value)} placeholder="Staff ID" className={selectClass} />
            <input required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name" className={selectClass} />
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="College email" className={selectClass} />
            <input required value={departmentName} onChange={(e) => setDepartmentName(e.target.value)} placeholder="Department" className={selectClass} />
            <input required value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="Designation" className={selectClass} />
            <button type="submit" className="rounded-2xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Save staff profile</button>
          </form>
        ) : null}
        <div className="mt-5 space-y-2">
          {profiles.map((profile) => (
            <div key={profile.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-muted/50 px-3 py-2 text-sm">
              <span className="font-medium">{profile.full_name}</span>
              <span className="mono-label">{profile.staff_id} · {profile.email} · {profile.department}</span>
              <span className="ml-auto mono-label">{profile.account_status}</span>
              <button onClick={() => void editStaff(profile)} className="rounded-lg bg-muted px-3 py-1 text-xs">Edit</button>
              <button onClick={() => void toggleStaff(profile)} className="rounded-lg bg-muted px-3 py-1 text-xs">{profile.account_status === "active" ? "Deactivate" : "Reactivate"}</button>
            </div>
          ))}
        </div>
      </Panel>

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
