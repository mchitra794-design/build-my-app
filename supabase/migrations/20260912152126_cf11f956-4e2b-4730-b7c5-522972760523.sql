REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.current_profile_id() FROM anon;
REVOKE EXECUTE ON FUNCTION public.bootstrap_account() FROM anon;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM anon, authenticated;

GRANT SELECT ON public.role_invites TO authenticated;
CREATE POLICY "invites_admin_read" ON public.role_invites FOR SELECT TO authenticated USING (public.is_admin());