import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type StaffMember = { user_id: string; email: string; roles: string[] };

export function useMyRoles(userId: string | undefined) {
  const [roles, setRoles] = useState<string[] | null>(null);
  useEffect(() => {
    if (!userId) return;
    supabase.from("user_roles").select("role").eq("user_id", userId).then(({ data }) => setRoles((data ?? []).map((r) => r.role)));
  }, [userId]);
  return roles;
}

export function useStaffDirectory(enabled: boolean) {
  const [list, setList] = useState<StaffMember[]>([]);
  useEffect(() => {
    if (!enabled) return;
    supabase.rpc("staff_directory").then(({ data }) => setList(data ?? []));
  }, [enabled]);
  return list;
}

/** Hours worked between two timestamps, rounded to 0.1h. Open shift counts until `now`. */
export function hoursWorked(clockIn: string, clockOut: string | null, now = new Date()): number {
  const end = clockOut ? new Date(clockOut) : now;
  return Math.round(((end.getTime() - new Date(clockIn).getTime()) / 36e5) * 10) / 10;
}
