export type AttendanceStatus = "present" | "absent" | "late" | "half_day" | "leave";

export type EventType =
  | "meeting"
  | "training"
  | "workshop"
  | "seminar"
  | "conference"
  | "holiday"
  | "department_event"
  | "institutional_event"
  | "leave"
  | "other";

export interface Profile {
  id: string;
  user_id: string | null;
  staff_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  department: string;
  designation: string;
  joining_date: string;
  account_status: string;
  points: number;
  streak: number;
}

export interface AttendanceRow {
  id: string;
  profile_id: string;
  date: string;
  status: AttendanceStatus;
  check_in: string | null;
  check_out: string | null;
  remarks: string | null;
}

export interface EventRow {
  id: string;
  title: string;
  description: string | null;
  event_type: EventType;
  start_date: string;
  end_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  department: string | null;
}

export interface NotificationRow {
  id: string;
  profile_id: string | null;
  audience: string;
  title: string;
  message: string;
  notification_type: string;
  priority: string;
  is_read: boolean;
  created_at: string;
}

export interface BadgeRow {
  id: string;
  profile_id: string;
  name: string;
  description: string | null;
  icon: string;
  awarded_at: string;
}

export interface OrgSettings {
  id: number;
  organization_name: string;
  required_percentage: number;
  warning_percentage: number;
  critical_percentage: number;
  working_days: string;
  working_hours: string;
  alert_shortage: boolean;
  alert_late: boolean;
  alert_events: boolean;
}

export const STATUS_META: Record<
  AttendanceStatus,
  { label: string; tone: "ok" | "warn" | "crit" | "muted" | "brand" }
> = {
  present: { label: "Present", tone: "ok" },
  late: { label: "Late", tone: "warn" },
  half_day: { label: "Half day", tone: "brand" },
  leave: { label: "Leave", tone: "muted" },
  absent: { label: "Absent", tone: "crit" },
};

export const EVENT_TYPE_LABEL: Record<EventType, string> = {
  meeting: "Meeting",
  training: "Training",
  workshop: "Workshop",
  seminar: "Seminar",
  conference: "Conference",
  holiday: "Holiday",
  department_event: "Department event",
  institutional_event: "Institutional event",
  leave: "Leave",
  other: "Other",
};

export const EVENT_TYPES = Object.keys(EVENT_TYPE_LABEL) as EventType[];
export const ATTENDANCE_STATUSES = Object.keys(STATUS_META) as AttendanceStatus[];

export interface AttendanceStats {
  total: number;
  present: number;
  absent: number;
  late: number;
  halfDay: number;
  leave: number;
  percentage: number;
}

/** Attendance percentage counts present + late as full days and half-days as 0.5. */
export function computeStats(rows: AttendanceRow[]): AttendanceStats {
  const stats: AttendanceStats = {
    total: rows.length,
    present: 0,
    absent: 0,
    late: 0,
    halfDay: 0,
    leave: 0,
    percentage: 0,
  };
  for (const row of rows) {
    if (row.status === "present") stats.present += 1;
    else if (row.status === "absent") stats.absent += 1;
    else if (row.status === "late") stats.late += 1;
    else if (row.status === "half_day") stats.halfDay += 1;
    else stats.leave += 1;
  }
  const working = stats.total - stats.leave;
  const credited = stats.present + stats.late + stats.halfDay * 0.5;
  stats.percentage = working > 0 ? Math.round((credited / working) * 1000) / 10 : 0;
  return stats;
}

export type Tier = "normal" | "warning" | "critical";

export function tierFor(percentage: number, settings?: Pick<OrgSettings, "required_percentage" | "warning_percentage">): Tier {
  const required = Number(settings?.required_percentage ?? 80);
  const warning = Number(settings?.warning_percentage ?? 75);
  if (percentage >= required) return "normal";
  if (percentage >= warning) return "warning";
  return "critical";
}

export const TIER_META: Record<Tier, { label: string; tone: "ok" | "warn" | "crit" }> = {
  normal: { label: "Normal", tone: "ok" },
  warning: { label: "Warning", tone: "warn" },
  critical: { label: "Critical", tone: "crit" },
};

export function toneClasses(tone: "ok" | "warn" | "crit" | "muted" | "brand") {
  switch (tone) {
    case "ok":
      return "bg-ok/15 text-ok";
    case "warn":
      return "bg-warn/15 text-warn";
    case "crit":
      return "bg-crit/15 text-crit";
    case "brand":
      return "bg-primary/15 text-primary";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export function toneText(tone: "ok" | "warn" | "crit" | "muted" | "brand") {
  switch (tone) {
    case "ok":
      return "text-ok";
    case "warn":
      return "text-warn";
    case "crit":
      return "text-crit";
    case "brand":
      return "text-primary";
    default:
      return "text-muted-foreground";
  }
}

/** Consecutive most-recent days counted backwards where attendance was present or late. */
export function currentStreak(rows: AttendanceRow[]): number {
  const sorted = [...rows].sort((a, b) => (a.date < b.date ? 1 : -1));
  let streak = 0;
  for (const row of sorted) {
    if (row.status === "present" || row.status === "late") streak += 1;
    else if (row.status === "leave") continue;
    else break;
  }
  return streak;
}

export interface Prediction {
  predicted: number;
  risk: "low" | "medium" | "high";
  explanation: string;
}

/**
 * Decision-support prediction: blends the long-run percentage with the recent
 * 20-day trend, then adjusts for consecutive absences and late arrivals.
 */
export function predictAttendance(rows: AttendanceRow[], name = "This staff member"): Prediction {
  const sorted = [...rows].sort((a, b) => (a.date < b.date ? -1 : 1));
  if (sorted.length < 5) {
    return {
      predicted: 0,
      risk: "low",
      explanation: "Not enough attendance history yet to produce a reliable projection.",
    };
  }
  const overall = computeStats(sorted).percentage;
  const recent = computeStats(sorted.slice(-20)).percentage;
  const previous = computeStats(sorted.slice(-40, -20)).percentage || overall;
  const trend = Math.round((recent - previous) * 10) / 10;

  const lastTen = sorted.slice(-10);
  const lateCount = lastTen.filter((r) => r.status === "late").length;
  let consecutiveAbsences = 0;
  for (let i = sorted.length - 1; i >= 0; i -= 1) {
    if (sorted[i].status === "absent") consecutiveAbsences += 1;
    else break;
  }

  let predicted = recent * 0.6 + overall * 0.4 + trend * 0.4 - consecutiveAbsences * 1.5 - lateCount * 0.4;
  predicted = Math.max(0, Math.min(100, Math.round(predicted * 10) / 10));

  let risk: Prediction["risk"] = "low";
  if (predicted < 75 || consecutiveAbsences >= 3) risk = "high";
  else if (predicted < 82 || trend <= -4 || lateCount >= 4) risk = "medium";

  const direction = trend > 1.5 ? "improved" : trend < -1.5 ? "declined" : "stayed stable";
  const explanation =
    `${name}'s attendance has ${direction} from ${previous}% to ${recent}% over the recent period. ` +
    `With ${lateCount} late arrival${lateCount === 1 ? "" : "s"} in the last 10 records` +
    (consecutiveAbsences > 0 ? ` and ${consecutiveAbsences} consecutive absence${consecutiveAbsences === 1 ? "" : "s"}` : "") +
    `, the projected attendance is ${predicted}% with ${risk} absence risk.`;

  return { predicted, risk, explanation };
}

export const RISK_META = {
  low: { label: "Low risk", tone: "ok" as const },
  medium: { label: "Medium risk", tone: "warn" as const },
  high: { label: "High risk", tone: "crit" as const },
};

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatShortDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

export function formatTime(value: string | null) {
  if (!value) return "—";
  return value.slice(0, 5);
}

export function todayISO() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10);
}

export function isoDaysAgo(days: number) {
  const now = new Date();
  now.setDate(now.getDate() - days);
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10);
}
