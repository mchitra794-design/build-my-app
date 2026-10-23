import { useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

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
  const requestId = useRef(0);

  async function loadAccount(activeSession: Session | null) {
    const currentRequest = ++requestId.current;
    queryClient.clear();
    if (!activeSession) {
      queryClient.clear();
      setProfile(null);
      setRole(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { error: bootstrapError } = await supabase.rpc("bootstrap_account");
      if (bootstrapError) throw bootstrapError;
      const [{ data: profileRow, error: profileError }, { data: roleRows, error: roleError }] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", activeSession.user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", activeSession.user.id),
      ]);
      if (profileError) throw profileError;
      if (roleError) throw roleError;
      if (currentRequest !== requestId.current) return;
      const nextProfile = (profileRow as unknown as Profile | null) ?? null;
      if (nextProfile && nextProfile.account_status.toLowerCase() !== "active") {
        await supabase.auth.signOut();
        setSession(null);
        setProfile(null);
        setRole(null);
        queryClient.clear();
        return;
      }
      setProfile(nextProfile);
      const roles = (roleRows ?? []).map((row) => row.role as Role);
      setRole(roles.includes("admin") ? "admin" : roles.includes("staff") ? "staff" : null);
    } catch (error) {
      if (currentRequest === requestId.current) {
        console.error("Unable to load the signed-in account", error);
        setProfile(null);
        setRole(null);
      }
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      void loadAccount(nextSession);
    });
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) {
        console.error("Unable to restore the sign-in session", error);
        setLoading(false);
        return;
      }
      setSession(data.session);
      void loadAccount(data.session);
    });
    return () => {
      active = false;
      requestId.current += 1;
      subscription.subscription.unsubscribe();
    };
    // Auth state is initialized once; subscription events refresh account state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<AuthState>(() => ({
    session,
    profile,
    role,
    loading,
    isAdmin: role === "admin",
    refresh: () => loadAccount(session),
    signOut: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      queryClient.clear();
      setSession(null);
      setProfile(null);
      setRole(null);
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [session, profile, role, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
