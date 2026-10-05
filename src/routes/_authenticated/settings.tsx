import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/clockit/AppShell";
import { Panel } from "@/components/clockit/StatCard";
import { useAuth } from "@/hooks/useAuth";
import { useClockitData } from "@/hooks/useClockitData";
import { supabase } from "@/integrations/supabase/client";
import type { OrgSettings } from "@/lib/clockit";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — ClockIt" },
      { name: "description", content: "Configure attendance thresholds, working hours and alerts." },
      { property: "og:title", content: "Settings — ClockIt" },
      { property: "og:description", content: "Configure attendance thresholds and alerts." },
    ],
  }),
  component: SettingsPage,
});

const inputClass =
  "w-full rounded-2xl border border-border bg-card px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

function SettingsPage() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const { settings } = useClockitData();
  const [form, setForm] = useState<OrgSettings | null>(null);

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  const save = useMutation({
    mutationFn: async (value: OrgSettings) => {
      const { id: _id, ...rest } = value;
      const { error } = await supabase.from("org_settings").update(rest).eq("id", 1);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries();
      toast.success("Settings saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!isAdmin) {
    return (
      <AppShell title="Settings">
        <Panel title="Admins only"><p className="text-sm text-muted-foreground">You don't have access to system settings.</p></Panel>
      </AppShell>
    );
  }
  if (!form) return <AppShell title="Settings"><p className="text-sm text-muted-foreground">Loading…</p></AppShell>;

  const set = <K extends keyof OrgSettings>(key: K, value: OrgSettings[K]) => setForm({ ...form, [key]: value });

  return (
    <AppShell title="System settings" subtitle={form.organization_name}>
      <form
        className="space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (Number(form.warning_percentage) > Number(form.required_percentage)) {
            toast.error("Warning threshold must be below the required percentage");
            return;
          }
          save.mutate(form);
        }}
      >
        <Panel title="Organisation">
          <div className="grid gap-4 md:grid-cols-3">
            <label className="space-y-1 text-sm"><span className="mono-label">Name</span>
              <input className={inputClass} value={form.organization_name} onChange={(e) => set("organization_name", e.target.value)} /></label>
            <label className="space-y-1 text-sm"><span className="mono-label">Working days</span>
              <input className={inputClass} value={form.working_days} onChange={(e) => set("working_days", e.target.value)} /></label>
            <label className="space-y-1 text-sm"><span className="mono-label">Working hours</span>
              <input className={inputClass} value={form.working_hours} onChange={(e) => set("working_hours", e.target.value)} /></label>
          </div>
        </Panel>

        <Panel title="Attendance thresholds" subtitle="Normal ≥ required · Warning ≥ warning · Critical below">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm"><span className="mono-label">Required %</span>
              <input type="number" min={0} max={100} className={inputClass} value={form.required_percentage} onChange={(e) => set("required_percentage", Number(e.target.value))} /></label>
            <label className="space-y-1 text-sm"><span className="mono-label">Warning %</span>
              <input type="number" min={0} max={100} className={inputClass} value={form.warning_percentage} onChange={(e) => set("warning_percentage", Number(e.target.value))} /></label>
          </div>
        </Panel>

        <Panel title="Alerts">
          <div className="space-y-3 text-sm">
            {([
              ["alert_shortage", "Attendance shortage alerts"],
              ["alert_late", "Late arrival alerts"],
              ["alert_events", "Event reminders"],
            ] as const).map(([key, label]) => (
              <label key={key} className="flex items-center gap-3">
                <input type="checkbox" checked={form[key]} onChange={(e) => set(key, e.target.checked)} className="size-4 accent-primary" />
                {label}
              </label>
            ))}
          </div>
        </Panel>

        <button type="submit" disabled={save.isPending} className="rounded-2xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground">
          {save.isPending ? "Saving…" : "Save settings"}
        </button>
      </form>
    </AppShell>
  );
}
