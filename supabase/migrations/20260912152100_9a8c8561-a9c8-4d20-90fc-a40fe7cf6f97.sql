-- ENUMS
CREATE TYPE public.app_role AS ENUM ('admin','staff');
CREATE TYPE public.attendance_status AS ENUM ('present','absent','late','half_day','leave');
CREATE TYPE public.event_type AS ENUM ('meeting','training','workshop','seminar','conference','holiday','department_event','institutional_event','leave','other');

-- PROFILES (staff directory; user_id is null for staff who have not signed up yet)
CREATE TABLE public.profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid UNIQUE,
  staff_id text NOT NULL UNIQUE,
  full_name text NOT NULL,
  email text NOT NULL UNIQUE,
  phone text,
  department text NOT NULL DEFAULT 'General',
  designation text NOT NULL DEFAULT 'Staff',
  joining_date date NOT NULL DEFAULT current_date,
  account_status text NOT NULL DEFAULT 'active',
  avatar_url text,
  points integer NOT NULL DEFAULT 0,
  streak integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ROLES
CREATE TABLE public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;

CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.profiles WHERE user_id = auth.uid()
$$;

-- ROLE INVITES (controls which role an email gets on signup)
CREATE TABLE public.role_invites (
  email text NOT NULL PRIMARY KEY,
  role public.app_role NOT NULL DEFAULT 'staff',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.role_invites TO service_role;
ALTER TABLE public.role_invites ENABLE ROW LEVEL SECURITY;

-- ATTENDANCE
CREATE TABLE public.attendance (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date date NOT NULL,
  status public.attendance_status NOT NULL DEFAULT 'present',
  check_in time,
  check_out time,
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance TO authenticated;
GRANT ALL ON public.attendance TO service_role;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- EVENTS
CREATE TABLE public.events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  event_type public.event_type NOT NULL DEFAULT 'meeting',
  start_date date NOT NULL,
  end_date date NOT NULL,
  start_time time,
  end_time time,
  location text,
  department text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.event_assignees (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  UNIQUE (event_id, profile_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_assignees TO authenticated;
GRANT ALL ON public.event_assignees TO service_role;
ALTER TABLE public.event_assignees ENABLE ROW LEVEL SECURITY;

-- NOTIFICATIONS
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  audience text NOT NULL DEFAULT 'staff',
  title text NOT NULL,
  message text NOT NULL,
  notification_type text NOT NULL DEFAULT 'system_announcement',
  priority text NOT NULL DEFAULT 'normal',
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- BADGES
CREATE TABLE public.badges (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  icon text NOT NULL DEFAULT 'award',
  awarded_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.badges TO authenticated;
GRANT ALL ON public.badges TO service_role;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

-- SETTINGS
CREATE TABLE public.org_settings (
  id integer NOT NULL PRIMARY KEY DEFAULT 1,
  organization_name text NOT NULL DEFAULT 'ClockIt Institute',
  required_percentage numeric NOT NULL DEFAULT 80,
  warning_percentage numeric NOT NULL DEFAULT 75,
  critical_percentage numeric NOT NULL DEFAULT 75,
  working_days text NOT NULL DEFAULT 'Mon-Fri',
  working_hours text NOT NULL DEFAULT '09:00 - 17:00',
  alert_shortage boolean NOT NULL DEFAULT true,
  alert_late boolean NOT NULL DEFAULT true,
  alert_events boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);
GRANT SELECT, INSERT, UPDATE ON public.org_settings TO authenticated;
GRANT ALL ON public.org_settings TO service_role;
ALTER TABLE public.org_settings ENABLE ROW LEVEL SECURITY;

-- POLICIES
CREATE POLICY "profiles_read_all" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_admin_write" ON public.profiles FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "roles_read_own" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "attendance_read" ON public.attendance FOR SELECT TO authenticated USING (public.is_admin() OR profile_id = public.current_profile_id());
CREATE POLICY "attendance_admin_write" ON public.attendance FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "events_read" ON public.events FOR SELECT TO authenticated USING (true);
CREATE POLICY "events_admin_write" ON public.events FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "assignees_read" ON public.event_assignees FOR SELECT TO authenticated USING (true);
CREATE POLICY "assignees_admin_write" ON public.event_assignees FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "notifications_read" ON public.notifications FOR SELECT TO authenticated USING (
  public.is_admin() OR profile_id = public.current_profile_id() OR profile_id IS NULL
);
CREATE POLICY "notifications_update_own" ON public.notifications FOR UPDATE TO authenticated USING (
  public.is_admin() OR profile_id = public.current_profile_id()
) WITH CHECK (true);
CREATE POLICY "notifications_admin_write" ON public.notifications FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "badges_read" ON public.badges FOR SELECT TO authenticated USING (true);
CREATE POLICY "badges_admin_write" ON public.badges FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "settings_read" ON public.org_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "settings_admin_write" ON public.org_settings FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ACCOUNT BOOTSTRAP: links the signed-in user to an invited staff record and grants the invited role
CREATE OR REPLACE FUNCTION public.bootstrap_account()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_role public.app_role;
  v_profile uuid;
BEGIN
  IF v_uid IS NULL OR v_email = '' THEN RETURN; END IF;

  SELECT role INTO v_role FROM public.role_invites WHERE lower(email) = v_email;
  IF v_role IS NULL THEN v_role := 'staff'; END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (v_uid, v_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  SELECT id INTO v_profile FROM public.profiles WHERE user_id = v_uid;
  IF v_profile IS NOT NULL THEN RETURN; END IF;

  UPDATE public.profiles SET user_id = v_uid, updated_at = now()
  WHERE lower(email) = v_email AND user_id IS NULL
  RETURNING id INTO v_profile;

  IF v_profile IS NULL THEN
    INSERT INTO public.profiles (user_id, staff_id, full_name, email, department, designation)
    VALUES (v_uid, 'STF-' || upper(substr(replace(v_uid::text,'-',''),1,6)), split_part(v_email,'@',1), v_email, 'General',
            CASE WHEN v_role = 'admin' THEN 'Administrator' ELSE 'Staff' END);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER attendance_touch BEFORE UPDATE ON public.attendance FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ================= SEED =================
INSERT INTO public.org_settings (id) VALUES (1);

INSERT INTO public.role_invites (email, role) VALUES
  ('admin@clockit.demo','admin'),
  ('staff@clockit.demo','staff');

INSERT INTO public.profiles (staff_id, full_name, email, phone, department, designation, joining_date, account_status, points, streak) VALUES
  ('STF-1001','Priya Nair','staff@clockit.demo','+91 98400 11221','Computer Science','Assistant Professor','2021-06-14','active',1310,9),
  ('STF-1002','Arun Krishnan','arun.krishnan@clockit.demo','+91 98400 11222','Computer Science','Associate Professor','2019-01-08','active',1420,12),
  ('STF-1003','Lena Ortiz','lena.ortiz@clockit.demo','+91 98400 11223','Mathematics','Professor','2017-07-03','active',1385,7),
  ('STF-1004','Kofi Mensah','kofi.mensah@clockit.demo','+91 98400 11224','Physics','Lab Instructor','2022-08-22','active',940,3),
  ('STF-1005','Dana Reyes','dana.reyes@clockit.demo','+91 98400 11225','Administration','Office Executive','2020-03-16','active',720,0),
  ('STF-1006','Marcus Bell','marcus.bell@clockit.demo','+91 98400 11226','Mathematics','Assistant Professor','2023-01-09','active',880,5),
  ('STF-1007','Sofia Lindqvist','sofia.lindqvist@clockit.demo','+91 98400 11227','Physics','Assistant Professor','2018-11-05','active',1265,11),
  ('STF-1008','Rahul Menon','rahul.menon@clockit.demo','+91 98400 11228','Computer Science','Lab Instructor','2021-09-27','active',1050,6),
  ('STF-1009','Aisha Bano','aisha.bano@clockit.demo','+91 98400 11229','Administration','HR Coordinator','2019-05-20','active',1120,8),
  ('STF-1010','Tom Okafor','tom.okafor@clockit.demo','+91 98400 11230','Mathematics','Visiting Faculty','2024-02-12','active',610,2),
  ('STF-1011','Meera Iyer','meera.iyer@clockit.demo','+91 98400 11231','Physics','Professor','2016-06-01','active',1480,14),
  ('STF-1012','Daniel Cruz','daniel.cruz@clockit.demo','+91 98400 11232','Administration','Accounts Officer','2022-04-18','inactive',430,0);

-- Attendance history: weekdays for the last 90 days, weighted per staff member
INSERT INTO public.attendance (profile_id, date, status, check_in, check_out, remarks)
SELECT p.id,
       d::date,
       CASE
         WHEN r.v < w.absent_w THEN 'absent'::public.attendance_status
         WHEN r.v < w.absent_w + 0.10 THEN 'late'::public.attendance_status
         WHEN r.v < w.absent_w + 0.13 THEN 'leave'::public.attendance_status
         WHEN r.v < w.absent_w + 0.15 THEN 'half_day'::public.attendance_status
         ELSE 'present'::public.attendance_status
       END,
       CASE WHEN r.v < w.absent_w OR (r.v >= w.absent_w + 0.10 AND r.v < w.absent_w + 0.13)
            THEN NULL
            ELSE (time '08:45' + (floor(r.v * 60) || ' minutes')::interval)::time END,
       CASE WHEN r.v < w.absent_w OR (r.v >= w.absent_w + 0.10 AND r.v < w.absent_w + 0.13)
            THEN NULL ELSE time '17:10' END,
       NULL
FROM generate_series(current_date - interval '90 days', current_date, interval '1 day') d
CROSS JOIN public.profiles p
CROSS JOIN LATERAL (SELECT CASE p.staff_id
    WHEN 'STF-1005' THEN 0.22 WHEN 'STF-1010' THEN 0.19 WHEN 'STF-1012' THEN 0.17
    WHEN 'STF-1004' THEN 0.12 WHEN 'STF-1006' THEN 0.11 ELSE 0.05 END AS absent_w) w
CROSS JOIN LATERAL (SELECT abs(hashtext(p.staff_id || d::text)) % 1000 / 1000.0 AS v) r
WHERE extract(isodow FROM d) < 6;

INSERT INTO public.events (title, description, event_type, start_date, end_date, start_time, end_time, location, department) VALUES
  ('Monthly Staff Meeting','Departmental updates, academic calendar review and open floor.','meeting', current_date + 2, current_date + 2, '09:30','11:00','Main Auditorium', NULL),
  ('AI in Education Workshop','Hands-on workshop on using AI tools for teaching and assessment.','workshop', current_date + 5, current_date + 5, '10:00','16:00','CS Lab 3','Computer Science'),
  ('Faculty Development Training','Certified training programme on modern pedagogy.','training', current_date + 9, current_date + 10, '09:00','17:00','Seminar Hall B', NULL),
  ('Research Seminar: Quantum Optics','Guest lecture followed by a Q&A session.','seminar', current_date + 12, current_date + 12, '14:00','16:00','Physics Block','Physics'),
  ('Founders Day','Institution-wide holiday and celebration.','institutional_event', current_date + 16, current_date + 16, NULL, NULL,'Campus Grounds', NULL),
  ('Accreditation Review Conference','External review panel visit and documentation walkthrough.','conference', current_date - 6, current_date - 5, '09:00','17:00','Board Room', NULL),
  ('Mathematics Department Retreat','Curriculum planning and team building.','department_event', current_date - 12, current_date - 12, '10:00','15:00','Hill View Resort','Mathematics');

INSERT INTO public.event_assignees (event_id, profile_id)
SELECT e.id, p.id FROM public.events e JOIN public.profiles p
  ON e.department IS NULL OR e.department = p.department;

INSERT INTO public.notifications (profile_id, audience, title, message, notification_type, priority, is_read)
SELECT p.id,'staff','Attendance requires attention',
  'Your attendance is currently below the required threshold and requires attention.','attendance_shortage','high',false
FROM public.profiles p WHERE p.staff_id IN ('STF-1005','STF-1010','STF-1012');

INSERT INTO public.notifications (profile_id, audience, title, message, notification_type, priority, is_read)
SELECT p.id,'staff','Low attendance warning',
  'Attendance Warning: your current attendance is close to the required minimum.','low_attendance_warning','normal',false
FROM public.profiles p WHERE p.staff_id IN ('STF-1004','STF-1006');

INSERT INTO public.notifications (profile_id, audience, title, message, notification_type, priority, is_read)
SELECT p.id,'staff','Repeated late arrival',
  'You have been marked late multiple times in the last two weeks.','repeated_late','normal',true
FROM public.profiles p WHERE p.staff_id IN ('STF-1004','STF-1008');

INSERT INTO public.notifications (profile_id, audience, title, message, notification_type, priority, is_read)
SELECT p.id,'staff','Streak achievement unlocked',
  'Congratulations! You reached a 7-day attendance streak and earned 70 points.','streak_achievement','low',false
FROM public.profiles p WHERE p.streak >= 7;

INSERT INTO public.notifications (profile_id, audience, title, message, notification_type, priority, is_read) VALUES
  (NULL,'all','New event: AI in Education Workshop','A new workshop has been added to the calendar. Check your calendar for details.','new_event','normal',false),
  (NULL,'all','Upcoming: Monthly Staff Meeting','The monthly staff meeting takes place in two days at 09:30 in the Main Auditorium.','upcoming_event','normal',false),
  (NULL,'all','Attendance policy update','The required attendance threshold remains 80%. Warnings are issued between 75% and 79%.','system_announcement','low',true);

INSERT INTO public.badges (profile_id, name, description, icon)
SELECT p.id,'Perfect Week','Full attendance for an entire working week.','calendar-check'
FROM public.profiles p WHERE p.streak >= 5;
INSERT INTO public.badges (profile_id, name, description, icon)
SELECT p.id,'7-Day Streak','Seven consecutive days of on-time attendance.','flame'
FROM public.profiles p WHERE p.streak >= 7;
INSERT INTO public.badges (profile_id, name, description, icon)
SELECT p.id,'Attendance Star','Maintained attendance above 90% this term.','star'
FROM public.profiles p WHERE p.points >= 1100;
INSERT INTO public.badges (profile_id, name, description, icon)
SELECT p.id,'Consistency Master','No unplanned absences in the last 30 days.','shield-check'
FROM public.profiles p WHERE p.points >= 1300;
INSERT INTO public.badges (profile_id, name, description, icon)
SELECT p.id,'Attendance Champion','Top of the reliability leaderboard.','trophy'
FROM public.profiles p WHERE p.points >= 1450;