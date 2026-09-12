import { cn } from "@/lib/utils";
import { STATUS_META, TIER_META, RISK_META, toneClasses, type AttendanceStatus, type Tier } from "@/lib/clockit";

export function Pill({
  children,
  tone = "muted",
  className,
}: {
  children: React.ReactNode;
  tone?: "ok" | "warn" | "crit" | "muted" | "brand";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-block rounded-full px-2.5 py-1 text-[11px] font-medium",
        toneClasses(tone),
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatusPill({ status }: { status: AttendanceStatus }) {
  const meta = STATUS_META[status];
  return <Pill tone={meta.tone}>{meta.label}</Pill>;
}

export function TierPill({ tier }: { tier: Tier }) {
  const meta = TIER_META[tier];
  return <Pill tone={meta.tone}>{meta.label}</Pill>;
}

export function RiskPill({ risk }: { risk: "low" | "medium" | "high" }) {
  const meta = RISK_META[risk];
  return <Pill tone={meta.tone}>{meta.label}</Pill>;
}
