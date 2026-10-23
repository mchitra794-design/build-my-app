-- Limit profile visibility and prevent self-service changes to privileged profile fields.
DROP POLICY IF EXISTS "profiles_read_all" ON public.profiles;
CREATE POLICY "profiles_read_admin_or_own" ON public.profiles FOR SELECT TO authenticated USING (public.is_admin() OR user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.protect_self_profile_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() AND OLD.user_id = auth.uid() THEN
    IF NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.staff_id IS DISTINCT FROM OLD.staff_id
      OR NEW.email IS DISTINCT FROM OLD.email OR NEW.department IS DISTINCT FROM OLD.department
      OR NEW.designation IS DISTINCT FROM OLD.designation OR NEW.joining_date IS DISTINCT FROM OLD.joining_date
      OR NEW.account_status IS DISTINCT FROM OLD.account_status OR NEW.points IS DISTINCT FROM OLD.points
      OR NEW.streak IS DISTINCT FROM OLD.streak OR NEW.avatar_url IS DISTINCT FROM OLD.avatar_url
      OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Staff may update only their own name and phone number';
    END IF;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS protect_self_profile_fields ON public.profiles;
CREATE TRIGGER protect_self_profile_fields BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.protect_self_profile_fields();

DROP POLICY IF EXISTS "attendance_read" ON public.attendance;
CREATE POLICY "attendance_read" ON public.attendance FOR SELECT TO authenticated
USING (public.is_admin() OR (profile_id = public.current_profile_id() AND EXISTS
  (SELECT 1 FROM public.profiles p WHERE p.id = attendance.profile_id AND p.account_status = 'active')));

DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own" ON public.notifications FOR UPDATE TO authenticated
USING (public.is_admin() OR profile_id = public.current_profile_id())
WITH CHECK (public.is_admin() OR profile_id = public.current_profile_id());

CREATE OR REPLACE FUNCTION public.protect_notification_updates()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() AND (
    NEW.profile_id IS DISTINCT FROM OLD.profile_id OR NEW.audience IS DISTINCT FROM OLD.audience
    OR NEW.title IS DISTINCT FROM OLD.title OR NEW.message IS DISTINCT FROM OLD.message
    OR NEW.notification_type IS DISTINCT FROM OLD.notification_type OR NEW.priority IS DISTINCT FROM OLD.priority
    OR NEW.created_at IS DISTINCT FROM OLD.created_at) THEN
    RAISE EXCEPTION 'Staff may only mark their own notification as read';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS protect_notification_updates ON public.notifications;
CREATE TRIGGER protect_notification_updates BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.protect_notification_updates();
