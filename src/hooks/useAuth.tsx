import { useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";
import type { Profile } from "@/lib/clockit";

type Role = "admin" | "staff";

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  role: Role | null;
  loading: boolean;
  isAdmin: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadAccount(activeSession: Session | null) {
    if (!activeSession) {
      setProfile(null);
      setRole(null);
      setLoading(false);
      return;
    }
    // Links the signed-in account to its invited staff record and grants its role.
    await supabase.rpc("bootstrap_account");

    const [{ data: profileRow }, { data: roleRows }] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", activeSession.user.id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", activeSession.user.id),
    ]);

    setProfile((profileRow as unknown as Profile) ?? null);
    const roles = (roleRows ?? []).map((r) => r.role as Role);
    setRole(roles.includes("admin") ? "admin" : roles.length > 0 ? "staff" : null);
    setLoading(false);
  }

  useEffect(() => {
    let active = true;

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setLoading(true);
      void loadAccount(nextSession);
    });

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      void loadAccount(data.session);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      session,
      profile,
      role,
      loading,
      isAdmin: role === "admin",
      refresh: () => loadAccount(session),
      signOut: async () => {
        await supabase.auth.signOut();
        queryClient.clear();
        setProfile(null);
        setRole(null);
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session, profile, role, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
