import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "ok" | "warn" | "crit" | "brand";
}) {
  const valueTone =
    tone === "ok"
      ? "text-ok"
      : tone === "warn"
        ? "text-warn"
        : tone === "crit"
          ? "text-crit"
          : tone === "brand"
            ? "text-primary"
            : "text-foreground";

  return (
    <div className="clay px-4 py-4">
      <div className="mono-label">{label}</div>
      <div className={cn("mt-1 text-2xl font-semibold leading-tight", valueTone)}>{value}</div>
      {hint ? <div className="mt-1 text-[11px] font-medium text-muted-foreground">{hint}</div> : null}
    </div>
  );
}

export function Panel({
  title,
  subtitle,
  action,
  children,
  brand = false,
  className,
}: {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  brand?: boolean;
  className?: string;
}) {
  return (
    <section className={cn(brand ? "clay-brand" : "clay", "p-6", className)}>
      {title ? (
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">{title}</h2>
            {subtitle ? <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p> : null}
          </div>
          {action}
        </div>
      ) : null}
      <div className={title ? "mt-5" : undefined}>{children}</div>
    </section>
  );
}
