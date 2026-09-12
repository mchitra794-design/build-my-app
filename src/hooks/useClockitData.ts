import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import {
  computeStats,
  currentStreak,
  predictAttendance,
  tierFor,
  todayISO,
  type AttendanceRow,
  type AttendanceStats,
  type Prediction,
  type Profile,
  type Tier,
} from "@/lib/clockit";
import {
  attendanceQuery,
  badgesQuery,
  eventsQuery,
  notificationsQuery,
  profilesQuery,
  settingsQuery,
} from "@/lib/queries";

export interface StaffSummary {
  profile: Profile;
  rows: AttendanceRow[];
  stats: AttendanceStats;
  tier: Tier;
  streak: number;
  prediction: Prediction;
  today: AttendanceRow | undefined;
  badgeCount: number;
}

export function useClockitData() {
  const profiles = useQuery(profilesQuery);
  const attendance = useQuery(attendanceQuery(120));
  const events = useQuery(eventsQuery);
  const notifications = useQuery(notificationsQuery);
  const badges = useQuery(badgesQuery);
  const settings = useQuery(settingsQuery);

  const loading =
    profiles.isLoading ||
    attendance.isLoading ||
    events.isLoading ||
    notifications.isLoading ||
    badges.isLoading ||
    settings.isLoading;

  const summaries = useMemo<StaffSummary[]>(() => {
    const rows = attendance.data ?? [];
    const badgeRows = badges.data ?? [];
    const today = todayISO();
    const byProfile = new Map<string, AttendanceRow[]>();
    for (const row of rows) {
      const list = byProfile.get(row.profile_id);
      if (list) list.push(row);
      else byProfile.set(row.profile_id, [row]);
    }
    return (profiles.data ?? []).map((profile) => {
      const own = byProfile.get(profile.id) ?? [];
      const stats = computeStats(own);
      return {
        profile,
        rows: own,
        stats,
        tier: tierFor(stats.percentage, settings.data ?? undefined),
        streak: currentStreak(own),
        prediction: predictAttendance(own, profile.full_name.split(" ")[0]),
        today: own.find((row) => row.date === today),
        badgeCount: badgeRows.filter((badge) => badge.profile_id === profile.id).length,
      };
    });
  }, [profiles.data, attendance.data, badges.data, settings.data]);

  return {
    loading,
    profiles: profiles.data ?? [],
    attendance: attendance.data ?? [],
    events: events.data ?? [],
    notifications: notifications.data ?? [],
    badges: badges.data ?? [],
    settings: settings.data ?? null,
    summaries,
  };
}

export function departmentList(profiles: Profile[]) {
  return Array.from(new Set(profiles.map((p) => p.department))).sort();
}
