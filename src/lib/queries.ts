import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type {
  AttendanceRow,
  BadgeRow,
  EventRow,
  NotificationRow,
  OrgSettings,
  Profile,
} from "@/lib/clockit";
import { isoDaysAgo } from "@/lib/clockit";

async function unwrap<T>(promise: PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await promise;
  if (error) throw new Error(error.message);
  return (data ?? []) as T;
}

export const profilesQuery = queryOptions({
  queryKey: ["profiles"],
  queryFn: () =>
    unwrap<Profile[]>(supabase.from("profiles").select("*").order("full_name", { ascending: true })),
});

export const attendanceQuery = (days = 120) =>
  queryOptions({
    queryKey: ["attendance", days],
    queryFn: () =>
      unwrap<AttendanceRow[]>(
        supabase
          .from("attendance")
          .select("*")
          .gte("date", isoDaysAgo(days))
          .order("date", { ascending: false }),
      ),
  });

export const eventsQuery = queryOptions({
  queryKey: ["events"],
  queryFn: () =>
    unwrap<EventRow[]>(supabase.from("events").select("*").order("start_date", { ascending: true })),
});

export const notificationsQuery = queryOptions({
  queryKey: ["notifications"],
  queryFn: () =>
    unwrap<NotificationRow[]>(
      supabase.from("notifications").select("*").order("created_at", { ascending: false }),
    ),
});

export const badgesQuery = queryOptions({
  queryKey: ["badges"],
  queryFn: () => unwrap<BadgeRow[]>(supabase.from("badges").select("*")),
});

export const settingsQuery = queryOptions({
  queryKey: ["org_settings"],
  queryFn: async () => {
    const { data, error } = await supabase.from("org_settings").select("*").eq("id", 1).maybeSingle();
    if (error) throw new Error(error.message);
    return data as unknown as OrgSettings | null;
  },
});
