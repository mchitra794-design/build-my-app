import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/clockit/AppShell";
import { Panel, StatCard } from "@/components/clockit/StatCard";
import { Pill } from "@/components/clockit/StatusPill";
import { useClockitData } from "@/hooks/useClockitData";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — ClockIt" },
      { name: "description", content: "Attendance shortage alerts, event reminders and announcements." },
      { property: "og:title", content: "Notifications — ClockIt" },
      { property: "og:description", content: "Shortage alerts, reminders and announcements." },
    ],
  }),
  component: NotificationsPage,
});

const FILTERS = ["all", "unread", "shortage", "event", "announcement"] as const;

function NotificationsPage() {
  const queryClient = useQueryClient();
  const { notifications, loading } = useClockitData();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");

  const visible = notifications.filter((note) => {
    if (filter === "all") return true;
    if (filter === "unread") return !note.is_read;
    return note.notification_type.includes(filter);
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
    onError: (error: Error) => toast.error(error.message),
  });

  const markAll = useMutation({
    mutationFn: async () => {
      const ids = notifications.filter((note) => !note.is_read).map((note) => note.id);
      if (ids.length === 0) return;
      const { error } = await supabase.from("notifications").update({ is_read: true }).in("id", ids);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("All notifications marked as read");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const unread = notifications.filter((note) => !note.is_read).length;

  return (
    <AppShell title="Notification centre" subtitle={`${unread} unread`}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total" value={notifications.length} />
        <StatCard label="Unread" value={unread} tone="brand" />
        <StatCard
          label="High priority"
          value={notifications.filter((n) => n.priority === "high").length}
          tone="crit"
        />
        <StatCard
          label="Shortage alerts"
          value={notifications.filter((n) => n.notification_type.includes("shortage")).length}
          tone="warn"
        />
      </div>

      <Panel
        title="Notifications"
        action={
          <button
            onClick={() => markAll.mutate()}
            className="rounded-2xl bg-muted px-4 py-2 text-xs font-medium transition-colors hover:bg-foreground/5"
          >
            Mark all read
          </button>
        }
      >
        <div className="mb-5 flex flex-wrap gap-2">
          {FILTERS.map((item) => (
            <button
              key={item}
              onClick={() => setFilter(item)}
              className={`rounded-2xl px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                filter === item ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-foreground/5"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        {loading ? <p className="text-sm text-muted-foreground">Loading notifications…</p> : null}

        <ul className="space-y-3">
          {visible.map((note) => (
            <li
              key={note.id}
              className={`rounded-2xl p-4 ${note.is_read ? "bg-muted/60" : "bg-muted ring-1 ring-primary/20"}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">{note.title}</span>
                <Pill
                  tone={
                    note.priority === "high" ? "crit" : note.priority === "medium" ? "warn" : "muted"
                  }
                >
                  {note.priority}
                </Pill>
                <Pill tone="brand">{note.notification_type.replace(/_/g, " ")}</Pill>
                <span className="mono-label ml-auto">
                  {new Date(note.created_at).toLocaleString(undefined, {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{note.message}</p>
              {!note.is_read ? (
                <button
                  onClick={() => markRead.mutate(note.id)}
                  className="mt-3 text-xs font-medium text-primary"
                >
                  Mark as read
                </button>
              ) : null}
            </li>
          ))}
          {!loading && visible.length === 0 ? (
            <li className="py-6 text-center text-xs text-muted-foreground">
              Nothing here for this filter.
            </li>
          ) : null}
        </ul>
      </Panel>
    </AppShell>
  );
}
