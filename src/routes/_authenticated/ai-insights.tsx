import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { AppShell } from "@/components/clockit/AppShell";
import { Panel, StatCard } from "@/components/clockit/StatCard";
import { RiskPill, TierPill } from "@/components/clockit/StatusPill";
import { useClockitData } from "@/hooks/useClockitData";

export const Route = createFileRoute("/_authenticated/ai-insights")({
  head: () => ({
    meta: [
      { title: "AI insights — ClockIt" },
      {
        name: "description",
        content: "Projected attendance, absence risk levels and plain-language explanations per staff member.",
      },
      { property: "og:title", content: "AI insights — ClockIt" },
      { property: "og:description", content: "Projected attendance and absence risk explanations." },
    ],
  }),
  component: AiInsightsPage,
});

const RISKS = ["all", "high", "medium", "low"] as const;

function AiInsightsPage() {
  const { summaries, loading } = useClockitData();
  const [risk, setRisk] = useState<(typeof RISKS)[number]>("all");

  const visible = summaries
    .filter((s) => risk === "all" || s.prediction.risk === risk)
    .sort((a, b) => a.prediction.predicted - b.prediction.predicted);

  const counts = {
    high: summaries.filter((s) => s.prediction.risk === "high").length,
    medium: summaries.filter((s) => s.prediction.risk === "medium").length,
    low: summaries.filter((s) => s.prediction.risk === "low").length,
  };

  return (
    <AppShell title="AI insights" subtitle="Prototype predictions used as decision support">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Staff analysed" value={summaries.length} />
        <StatCard label="High risk" value={counts.high} tone="crit" />
        <StatCard label="Medium risk" value={counts.medium} tone="warn" />
        <StatCard label="Low risk" value={counts.low} tone="ok" />
      </div>

      <Panel brand title="How this works">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Each projection blends a staff member's long-run attendance with their recent 20-day trend, then
          adjusts for consecutive absences and repeated late arrivals. It is a prototype signal meant to
          support human decisions — not an automatic judgement about anyone's record.
        </p>
      </Panel>

      <Panel title="Predictions" subtitle="Lowest projected attendance first">
        <div className="mb-5 flex flex-wrap gap-2">
          {RISKS.map((item) => (
            <button
              key={item}
              onClick={() => setRisk(item)}
              className={`rounded-2xl px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                risk === item ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-foreground/5"
              }`}
            >
              {item === "all" ? "All" : `${item} risk`}
            </button>
          ))}
        </div>

        {loading ? <p className="text-sm text-muted-foreground">Generating insights…</p> : null}

        <div className="space-y-3">
          {visible.map((summary) => (
            <article key={summary.profile.id} className="rounded-2xl bg-muted p-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-semibold">{summary.profile.full_name}</span>
                <span className="mono-label">
                  {summary.profile.department} · {summary.profile.designation}
                </span>
                <span className="ml-auto flex items-center gap-2">
                  <span className="font-mono text-sm">{summary.stats.percentage}% now</span>
                  <span className="font-mono text-sm text-primary">
                    → {summary.prediction.predicted}%
                  </span>
                </span>
                <TierPill tier={summary.tier} />
                <RiskPill risk={summary.prediction.risk} />
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {summary.prediction.explanation}
              </p>
            </article>
          ))}
          {!loading && visible.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">
              No staff in this risk band.
            </p>
          ) : null}
        </div>
      </Panel>
    </AppShell>
  );
}
