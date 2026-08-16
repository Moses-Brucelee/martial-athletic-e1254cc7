-- 1. Sample-data markers
ALTER TABLE public.competitions ADD COLUMN IF NOT EXISTS is_synthetic boolean NOT NULL DEFAULT false;
ALTER TABLE public.athletes ADD COLUMN IF NOT EXISTS is_synthetic boolean NOT NULL DEFAULT false;

-- 2. Marketplace
INSERT INTO public.marketplace_items (category, title, description, price, currency, vendor_name, is_active, is_synthetic)
VALUES
  ('apparel', 'Sample: Grip Training Shorts', '4-way stretch, no side seams, deep zip pocket that actually holds a phone.', 749, 'ZAR', 'Martial Athletic', true, true),
  ('apparel', 'Sample: Cold Room Hoodie', 'Heavy fleece for early sessions in an unheated box. Runs true to size.', 1149, 'ZAR', 'Martial Athletic', true, true),
  ('equipment', 'Sample: Speed Rope Pro', 'Bearing handles, 2.5mm coated cable. Ships with a spare cable.', 599, 'ZAR', 'Iron Supply Co', true, true),
  ('equipment', 'Sample: Wooden Plyo Box 3-in-1', '20/24/30 inch box, sanded edges, holds a 120kg athlete jumping tired.', 2450, 'ZAR', 'Iron Supply Co', true, true)
ON CONFLICT DO NOTHING;

-- 3. Programs
DO $$
DECLARE
  owner uuid := '23b2f35c-9108-4cb8-8464-62eb96dfa6b6';
  p RECORD;
  wk_id uuid;
  d_id uuid;
  w int;
  d int;
BEGIN
  FOR p IN
    SELECT * FROM (VALUES
      ('77770001-0000-4000-8000-000000000001'::uuid, 'Sample: Six Weeks to a Bigger Squat', 'Three squat sessions a week, one heavy, one volume, one paused. Accessory work is short on purpose.', 'strength', 'intermediate', 6, 4, ARRAY['barbell','rack','plates']),
      ('77770001-0000-4000-8000-000000000002'::uuid, 'Sample: Engine Builder', 'Rowing, running and assault bike intervals. Nothing longer than 20 minutes.', 'conditioning', 'all', 4, 5, ARRAY['rower','bike','none']),
      ('77770001-0000-4000-8000-000000000003'::uuid, 'Sample: Competition Prep Block', 'Eight weeks aimed at a local throwdown. Heavy front half, sharpening in the back half.', 'competition', 'advanced', 8, 5, ARRAY['barbell','rig','dumbbells','rower'])
    ) AS t(id, title, description, category, level, weeks_count, days_per_week, equipment)
  LOOP
    INSERT INTO public.programs (id, created_by, title, description, category, level, weeks_count, days_per_week, equipment, status, is_public, is_synthetic)
    VALUES (p.id, owner, p.title, p.description, p.category, p.level, p.weeks_count, p.days_per_week, p.equipment, 'published', true, true)
    ON CONFLICT (id) DO NOTHING;

    FOR w IN 1..LEAST(p.weeks_count, 4) LOOP
      INSERT INTO public.program_weeks (program_id, week_number, name, notes)
      VALUES (p.id, w, 'Week ' || w, CASE WHEN w = 1 THEN 'Start conservative. Leave two reps in the tank.' ELSE NULL END)
      RETURNING id INTO wk_id;

      FOR d IN 1..LEAST(p.days_per_week, 4) LOOP
        INSERT INTO public.program_days (program_id, week_id, day_number, name, is_rest_day)
        VALUES (p.id, wk_id, d, 'Day ' || d, false)
        RETURNING id INTO d_id;

        INSERT INTO public.program_workouts (program_id, day_id, name, description, workout_format, est_duration_minutes, display_order, notes)
        VALUES
          (p.id, d_id, 'Warm-up', E'5 min easy bike\n2 rounds: 10 air squats, 10 band pull-aparts, 20s hang', 'standard', 10, 0, NULL),
          (p.id, d_id, CASE d WHEN 1 THEN 'Back squat' WHEN 2 THEN 'Intervals' WHEN 3 THEN 'Pull strength' ELSE 'Mixed conditioning' END,
            CASE d
              WHEN 1 THEN E'5 x 3 @ 80%\nRest 3 min between sets.'
              WHEN 2 THEN E'8 x 250m row\nRest 1:1. Hold your 2k pace minus 3 seconds.'
              WHEN 3 THEN E'4 x 6 weighted pull-ups\nStrict. Add weight only if all six are clean.'
              ELSE E'AMRAP 12\n10 dumbbell snatch\n8 burpees over the bar\n200m run'
            END,
            CASE d WHEN 4 THEN 'amrap' ELSE 'standard' END,
            CASE d WHEN 1 THEN 35 WHEN 2 THEN 25 WHEN 3 THEN 25 ELSE 12 END,
            1, NULL);
      END LOOP;
    END LOOP;
  END LOOP;
END $$;

-- 4. Competitions
DO $$
DECLARE
  owner uuid := '23b2f35c-9108-4cb8-8464-62eb96dfa6b6';
  live_id uuid := '11111111-1111-4111-8111-000000000001';
  next_id uuid := '11111111-1111-4111-8111-000000000002';
  div_rx uuid := '22220000-0000-4000-8000-000000000001';
  div_sc uuid := '22220000-0000-4000-8000-000000000002';
  div_pair uuid := '22220000-0000-4000-8000-000000000003';
  wo1 uuid := '33330000-0000-4000-8000-000000000001';
  wo2 uuid := '33330000-0000-4000-8000-000000000002';
  wo3 uuid := '33330000-0000-4000-8000-000000000003';
  names text[] := ARRAY['Thabo Mokoena','Anja de Villiers','Ruan Steyn','Lerato Ndlovu','Jaco Pretorius','Kirsten Meyer','Sipho Dlamini','Elmarie Botha','Dane Fourie','Nomsa Khumalo','Werner Lategan','Chantel Roux'];
  genders text[] := ARRAY['male','female','male','female','male','female','male','female','male','female','male','female'];
  i int;
  t_id uuid;
  heat_id uuid;
  reg_id uuid;
BEGIN
  INSERT INTO public.competitions (id, created_by, name, date, venue, host_gym, type, divisions, status, description, competition_type, max_athletes, visibility, start_date, end_date, registration_deadline, is_synthetic)
  VALUES (live_id, owner, 'Sample: Iron Circuit Open', CURRENT_DATE, 'Loftus Sports Hall, Pretoria', 'Iron Circuit CrossFit', 'individual', 'RX Male, Scaled Male', 'live',
    'Three workouts, one day, one floor. Doors at 07:00, first heat 08:30. Bring your own rope.', 'crossfit', 60, 'public',
    CURRENT_DATE::timestamptz + interval '8 hours', CURRENT_DATE::timestamptz + interval '17 hours', CURRENT_DATE::timestamptz - interval '5 days', true)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.competitions (id, created_by, name, date, venue, host_gym, type, divisions, status, description, competition_type, max_athletes, visibility, start_date, end_date, registration_deadline, is_synthetic)
  VALUES (next_id, owner, 'Sample: Winter Ladder Qualifier', CURRENT_DATE + 55, 'The Yard, Cape Town', 'The Yard Strength Club', 'pairs', 'Mixed Pairs', 'published',
    'Qualifier for the Winter Ladder final. Workouts drop the Monday before. Pairs only.', 'crossfit', 40, 'public',
    (CURRENT_DATE + 55)::timestamptz + interval '9 hours', (CURRENT_DATE + 55)::timestamptz + interval '16 hours', (CURRENT_DATE + 40)::timestamptz, true)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.competition_divisions (id, competition_id, name, sort_order, team_size, max_athletes) VALUES
    (div_rx, live_id, 'RX Male', 0, 1, 30),
    (div_sc, live_id, 'Scaled Female', 1, 1, 30),
    (div_pair, next_id, 'Mixed Pairs', 0, 2, 20)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.competition_workouts (id, competition_id, workout_number, name, description, workout_type, scoring_type, measurement_type, time_cap_seconds, display_order, visibility) VALUES
    (wo1, live_id, 1, 'Opener', E'For time:\n50 wall balls\n40 cal row\n30 toes-to-bar\n20 burpee box jump overs', 'for_time', 'time', 'time', 900, 0, 'visible'),
    (wo2, live_id, 2, 'Heavy Complex', E'Every 90 seconds x 6:\n1 clean + 1 hang clean + 1 jerk\nBuild to a heavy set. Score is the heaviest completed complex.', 'custom', 'load', 'load', NULL, 1, 'visible'),
    (wo3, live_id, 3, 'Closer', E'AMRAP 10:\n10 devil press (2 x 22.5kg)\n15 pull-ups\n20 air squats', 'amrap', 'reps', 'reps', 600, 2, 'visible')
  ON CONFLICT (id) DO NOTHING;

  -- Athletes, teams, registrations for the live competition
  FOR i IN 1..12 LOOP
    t_id := ('44440000-0000-4000-8000-0000000000' || lpad(i::text, 2, '0'))::uuid;
    INSERT INTO public.competition_teams (id, competition_id, team_name, division, division_id, is_complete)
    VALUES (t_id, live_id, names[i], CASE WHEN genders[i] = 'male' THEN 'RX Male' ELSE 'Scaled Female' END,
      CASE WHEN genders[i] = 'male' THEN div_rx ELSE div_sc END, true)
    ON CONFLICT (id) DO NOTHING;

    reg_id := ('55550000-0000-4000-8000-0000000000' || lpad(i::text, 2, '0'))::uuid;
    INSERT INTO public.athlete_registrations (id, competition_id, athlete_name, team_id, division_id, status, registration_type, gender, date_of_birth)
    VALUES (reg_id, live_id, names[i], t_id, CASE WHEN genders[i] = 'male' THEN div_rx ELSE div_sc END, 'approved', 'admin', genders[i],
      (CURRENT_DATE - ((22 + i) * 365))::date)
    ON CONFLICT (id) DO NOTHING;
  END LOOP;

  -- Heats: two per workout, six lanes
  FOR i IN 1..6 LOOP
    heat_id := ('66660000-0000-4000-8000-0000000000' || lpad(i::text, 2, '0'))::uuid;
    INSERT INTO public.heat_schedule (id, competition_id, workout_id, heat_number, lane_count, scheduled_start, status)
    VALUES (heat_id, live_id, CASE WHEN i <= 2 THEN wo1 WHEN i <= 4 THEN wo2 ELSE wo3 END,
      CASE WHEN i % 2 = 1 THEN 1 ELSE 2 END, 6,
      CURRENT_DATE::timestamptz + interval '8 hours' + ((i - 1) * interval '45 minutes'),
      CASE WHEN i <= 2 THEN 'completed' WHEN i = 3 THEN 'in_progress' ELSE 'pending' END)
    ON CONFLICT (id) DO NOTHING;
  END LOOP;

  FOR i IN 1..12 LOOP
    INSERT INTO public.heat_assignments (heat_id, team_id, lane_number, athlete_registration_id)
    VALUES (
      ('66660000-0000-4000-8000-0000000000' || lpad((CASE WHEN i <= 6 THEN 1 ELSE 2 END)::text, 2, '0'))::uuid,
      ('44440000-0000-4000-8000-0000000000' || lpad(i::text, 2, '0'))::uuid,
      CASE WHEN i <= 6 THEN i ELSE i - 6 END,
      ('55550000-0000-4000-8000-0000000000' || lpad(i::text, 2, '0'))::uuid)
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- Scores for the first two workouts
  FOR i IN 1..12 LOOP
    t_id := ('44440000-0000-4000-8000-0000000000' || lpad(i::text, 2, '0'))::uuid;
    INSERT INTO public.competition_scores (competition_id, team_id, workout_id, score, time_seconds, points_awarded, validation_status)
    VALUES (live_id, t_id, wo1, 540 + (i * 17), 540 + (i * 17), 100 - ((i - 1) * 5), 'approved')
    ON CONFLICT DO NOTHING;

    INSERT INTO public.competition_scores (competition_id, team_id, workout_id, score, load_value, points_awarded, validation_status)
    VALUES (live_id, t_id, wo2, 120 - (i * 3), 120 - (i * 3), 100 - ((12 - i) * 4), 'approved')
    ON CONFLICT DO NOTHING;
  END LOOP;

  INSERT INTO public.competition_settings (competition_id, scoring_model, setup_mode, ranking_direction, timezone)
  VALUES (live_id, 'points', 'quick', 'desc', 'Africa/Johannesburg')
  ON CONFLICT DO NOTHING;
  INSERT INTO public.competition_settings (competition_id, scoring_model, setup_mode, ranking_direction, timezone)
  VALUES (next_id, 'points', 'quick', 'desc', 'Africa/Johannesburg')
  ON CONFLICT DO NOTHING;
END $$;