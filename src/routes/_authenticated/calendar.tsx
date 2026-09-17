import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

import { AppShell } from "@/components/clockit/AppShell";
import { Panel } from "@/components/clockit/StatCard";
import { Pill, StatusPill } from "@/components/clockit/StatusPill";
import { useAuth } from "@/hooks/useAuth";
import { useClockitData } from "@/hooks/useClockitData";
import {
  EVENT_TYPE_LABEL,
  STATUS_META,
  formatDate,
  formatTime,
  todayISO,
  type AttendanceRow,
} from "@/lib/clockit";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({
    meta: [
      { title: "Calendar — ClockIt" },
      { name: "description", content: "Monthly attendance calendar with events, meetings and holidays." },
      { property: "og:title", content: "Calendar — ClockIt" },
      { property: "og:description", content: "Attendance calendar with events and holidays." },
    ],
  }),
  component: CalendarPage,
});

function monthKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function CalendarPage() {
  const { profile, isAdmin } = useAuth();
  const { attendance, events, profiles } = useClockitData();
  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [selected, setSelected] = useState(todayISO());

  const myRows = attendance.filter((row) => isAdmin || row.profile_id === profile?.id);
  const rowsByDate = myRows.reduce<Record<string, AttendanceRow[]>>((acc, row) => {
    (acc[row.date] ??= []).push(row);
    return acc;
  }, {});

  const firstWeekday = new Date(cursor.year, cursor.month, 1).getDay();
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  const cells: (string | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => monthKey(cursor.year, cursor.month, index + 1)),
  ];

  const selectedEvents = events.filter(
    (event) => event.start_date <= selected && event.end_date >= selected,
  );
  const selectedRows = rowsByDate[selected] ?? [];

  function shift(delta: number) {
    const next = new Date(cursor.year, cursor.month + delta, 1);
    setCursor({ year: next.getFullYear(), month: next.getMonth() });
  }

  return (
    <AppShell
      title={isAdmin ? "Organisation calendar" : "My calendar"}
      subtitle="Attendance and scheduled events"
    >
      <div className="grid gap-6 xl:grid-cols-3">
        <Panel
          className="xl:col-span-2"
          title={monthLabel}
          subtitle="Attendance status per day"
          action={
            <div className="flex gap-2">
              <button
                onClick={() => shift(-1)}
                aria-label="Previous month"
                className="grid size-9 place-items-center rounded-xl bg-muted"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                onClick={() => shift(1)}
                aria-label="Next month"
                className="grid size-9 place-items-center rounded-xl bg-muted"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          }
        >
          <div className="grid grid-cols-7 gap-1 text-center">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="mono-label pb-2">
                {day}
              </div>
            ))}
            {cells.map((iso, index) => {
              if (!iso) return <div key={`empty-${index}`} />;
              const dayRows = rowsByDate[iso] ?? [];
              const hasEvent = events.some(
                (event) => event.start_date <= iso && event.end_date >= iso,
              );
              const status = isAdmin ? undefined : dayRows[0]?.status;
              const tone = status ? STATUS_META[status].tone : "muted";
              return (
                <button
                  key={iso}
                  onClick={() => setSelected(iso)}
                  className={cn(
                    "relative aspect-square rounded-xl p-1 text-xs font-medium transition-colors",
                    selected === iso ? "ring-2 ring-primary" : "",
                    dayRows.length === 0
                      ? "bg-muted/60 text-muted-foreground"
                      : tone === "ok"
                        ? "bg-ok/15 text-ok"
                        : tone === "warn"
                          ? "bg-warn/15 text-warn"
                          : tone === "crit"
                            ? "bg-crit/15 text-crit"
                            : tone === "brand"
                              ? "bg-primary/15 text-primary"
                              : "bg-muted",
                  )}
                >
                  {Number(iso.slice(8))}
                  {isAdmin && dayRows.length > 0 ? (
                    <span className="mono-label block">{dayRows.length}</span>
                  ) : null}
                  {hasEvent ? (
                    <span className="absolute bottom-1 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-primary" />
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {Object.entries(STATUS_META).map(([key, meta]) => (
              <Pill key={key} tone={meta.tone}>
                {meta.label}
              </Pill>
            ))}
            <Pill tone="brand">• Event day</Pill>
          </div>
        </Panel>

        <div className="space-y-6">
          <Panel title={formatDate(selected)} subtitle="Selected day">
            {isAdmin ? (
              <p className="text-sm">
                <span className="font-mono">{selectedRows.length}</span> of {profiles.length} staff
                records marked.
              </p>
            ) : selectedRows.length > 0 ? (
              <div className="space-y-2 text-sm">
                {selectedRows.map((row) => (
                  <div key={row.id} className="flex items-center gap-3">
                    <StatusPill status={row.status} />
                    <span className="ml-auto font-mono text-xs text-muted-foreground">
                      {formatTime(row.check_in)} – {formatTime(row.check_out)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No attendance recorded for this day.</p>
            )}
          </Panel>

          <Panel title="Events on this day">
            <ul className="space-y-2 text-sm">
              {selectedEvents.map((event) => (
                <li key={event.id} className="rounded-2xl bg-muted px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{event.title}</span>
                    <Pill tone="brand" className="ml-auto">
                      {EVENT_TYPE_LABEL[event.event_type]}
                    </Pill>
                  </div>
                  <div className="mono-label mt-1">
                    {formatTime(event.start_time)} – {formatTime(event.end_time)} ·{" "}
                    {event.location ?? "TBC"}
                  </div>
                  {event.description ? (
                    <p className="mt-1 text-xs text-muted-foreground">{event.description}</p>
                  ) : null}
                </li>
              ))}
              {selectedEvents.length === 0 ? (
                <li className="text-xs text-muted-foreground">Nothing scheduled.</li>
              ) : null}
            </ul>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
