-- RPC Functions for ClockIt

-- Bootstrap account function (links auth user to profile)
CREATE OR REPLACE FUNCTION bootstrap_account()
RETURNS TABLE (success BOOLEAN, message TEXT)
SECURITY DEFINER
LANGUAGE PLPGSQL
AS $$
DECLARE
  v_user_id UUID;
  v_profile_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'Not authenticated'::TEXT;
    RETURN;
  END IF;

  -- Check if profile already linked
  SELECT id INTO v_profile_id FROM profiles WHERE user_id = v_user_id;
  
  IF v_profile_id IS NULL THEN
    -- Try to find profile by email
    SELECT id INTO v_profile_id FROM profiles 
    WHERE email = (SELECT email FROM auth.users WHERE id = v_user_id);
    
    IF v_profile_id IS NOT NULL THEN
      -- Link profile to user
      UPDATE profiles SET user_id = v_user_id WHERE id = v_profile_id;
      
      -- Assign staff role by default
      INSERT INTO user_roles (user_id, role) VALUES (v_user_id, 'staff')
      ON CONFLICT DO NOTHING;
      
      RETURN QUERY SELECT true, 'Account bootstrapped successfully'::TEXT;
    ELSE
      RETURN QUERY SELECT false, 'No profile found for this email'::TEXT;
    END IF;
  ELSE
    RETURN QUERY SELECT true, 'Account already linked'::TEXT;
  END IF;
END;
$$;

-- Get staff summary with attendance stats
CREATE OR REPLACE FUNCTION get_staff_summary()
RETURNS TABLE (
  profile_id UUID,
  staff_id VARCHAR,
  full_name VARCHAR,
  email VARCHAR,
  department VARCHAR,
  designation VARCHAR,
  total_records INT,
  present_count INT,
  absent_count INT,
  late_count INT,
  half_day_count INT,
  leave_count INT,
  attendance_percentage NUMERIC
)
SECURITY DEFINER
LANGUAGE SQL
STABLE
AS $$
  SELECT 
    p.id,
    p.staff_id,
    p.full_name,
    p.email,
    p.department,
    p.designation,
    COUNT(a.id) as total_records,
    COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_count,
    COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent_count,
    COUNT(CASE WHEN a.status = 'late' THEN 1 END) as late_count,
    COUNT(CASE WHEN a.status = 'half_day' THEN 1 END) as half_day_count,
    COUNT(CASE WHEN a.status = 'leave' THEN 1 END) as leave_count,
    ROUND(
      (COUNT(CASE WHEN a.status IN ('present', 'late') THEN 1 END)::NUMERIC + 
       COUNT(CASE WHEN a.status = 'half_day' THEN 1 END)::NUMERIC * 0.5) /
      NULLIF(COUNT(a.id) - COUNT(CASE WHEN a.status = 'leave' THEN 1 END), 0) * 100, 1
    ) as attendance_percentage
  FROM profiles p
  LEFT JOIN attendance a ON p.id = a.profile_id 
    AND a.date >= CURRENT_DATE - INTERVAL '120 days'
  GROUP BY p.id, p.staff_id, p.full_name, p.email, p.department, p.designation
  ORDER BY p.full_name;
$$;

-- Update streak for a profile
CREATE OR REPLACE FUNCTION update_streak(profile_id UUID)
RETURNS TABLE (streak INT)
SECURITY DEFINER
LANGUAGE PLPGSQL
AS $$
DECLARE
  v_streak INT := 0;
  v_row RECORD;
BEGIN
  -- Count consecutive recent working days with present or late status
  FOR v_row IN
    SELECT status, date FROM attendance 
    WHERE profile_id = update_streak.profile_id
    ORDER BY date DESC
    LIMIT 100
  LOOP
    IF v_row.status IN ('present', 'late') THEN
      v_streak := v_streak + 1;
    ELSIF v_row.status = 'leave' THEN
      CONTINUE;
    ELSE
      EXIT;
    END IF;
  END LOOP;

  -- Update profile with new streak
  UPDATE profiles SET streak = v_streak WHERE id = update_streak.profile_id;
  
  RETURN QUERY SELECT v_streak as streak;
END;
$$;

-- Award points to profile
CREATE OR REPLACE FUNCTION award_points(profile_id UUID, points_to_award INT)
RETURNS TABLE (new_total INT)
SECURITY DEFINER
LANGUAGE PLPGSQL
AS $$
DECLARE
  v_new_total INT;
BEGIN
  UPDATE profiles 
  SET points = points + points_to_award
  WHERE id = award_points.profile_id
  RETURNING profiles.points INTO v_new_total;
  
  RETURN QUERY SELECT v_new_total as new_total;
END;
$$;
