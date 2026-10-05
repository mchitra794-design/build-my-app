import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/clockit/AppShell";
import { Panel } from "@/components/clockit/StatCard";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, initials } from "@/lib/clockit";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "My profile — ClockIt" },
      { name: "description", content: "View and update your ClockIt staff profile." },
      { property: "og:title", content: "My profile — ClockIt" },
      { property: "og:description", content: "View and update your staff profile." },
    ],
  }),
  component: ProfilePage,
});

const inputClass =
  "w-full rounded-2xl border border-border bg-card px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

function ProfilePage() {
  const { profile, refresh, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    setName(profile?.full_name ?? "");
    setPhone(profile?.phone ?? "");
  }, [profile]);

  if (!profile) return <AppShell title="My profile"><p className="text-sm text-muted-foreground">No staff profile linked to this account.</p></AppShell>;

  async function saveProfile() {
    const { error } = await supabase.from("profiles").update({ full_name: name, phone }).eq("id", profile!.id);
    if (error) { toast.error(error.message); return; }
    await refresh();
    void queryClient.invalidateQueries({ queryKey: ["profiles"] });
    toast.success("Profile updated");
  }

  async function changePassword() {
    if (password.length < 8) { toast.error("Use at least 8 characters"); return; }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) { toast.error(error.message); return; }
    setPassword("");
    toast.success("Password changed");
  }

  return (
    <AppShell title="My profile" subtitle={isAdmin ? "Administrator" : "Staff"}>
      <Panel>
        <div className="flex flex-wrap items-center gap-4">
          <span className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-lg font-semibold text-primary">{initials(profile.full_name)}</span>
          <div>
            <div className="text-lg font-semibold">{profile.full_name}</div>
            <div className="mono-label mt-1">{profile.staff_id} · {profile.department} · {profile.designation} · joined {formatDate(profile.joining_date)}</div>
          </div>
        </div>
      </Panel>
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Personal details">
          <div className="space-y-4">
            <label className="block space-y-1 text-sm"><span className="mono-label">Full name</span><input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} /></label>
            <label className="block space-y-1 text-sm"><span className="mono-label">Email</span><input className={inputClass} value={profile.email} disabled /></label>
            <label className="block space-y-1 text-sm"><span className="mono-label">Phone</span><input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
            <button onClick={() => void saveProfile()} className="rounded-2xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Save changes</button>
          </div>
        </Panel>
        <Panel title="Change password">
          <div className="space-y-4">
            <label className="block space-y-1 text-sm"><span className="mono-label">New password</span><input type="password" className={inputClass} value={password} onChange={(e) => setPassword(e.target.value)} /></label>
            <button onClick={() => void changePassword()} className="rounded-2xl bg-muted px-4 py-2 text-sm font-medium">Update password</button>
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
