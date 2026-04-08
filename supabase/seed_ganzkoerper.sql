-- ─────────────────────────────────────────────
-- Ganzkörper Plan (3x pro Woche)
-- ─────────────────────────────────────────────

-- Plan erstellen
insert into public.training_plans (id, name, is_active) values
  ('00000000-0000-0000-0000-000000000002', 'Ganzkörper', false)
on conflict (id) do nothing;

-- ─────────────────────────────────────────────
-- 3 Trainingstage
-- ─────────────────────────────────────────────
insert into public.training_days (id, plan_id, name, sort_order) values
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', 'Ganzkörper A', 1),
  ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000002', 'Ganzkörper B', 2),
  ('10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000002', 'Ganzkörper C', 3)
on conflict do nothing;

-- ─────────────────────────────────────────────
-- Ganzkörper A: Squat + Drücken + Horizontales Ziehen
-- ─────────────────────────────────────────────
insert into public.day_exercises
  (training_day_id, exercise_id, sort_order, planned_sets, planned_reps, planned_weight)
values
  -- Squat         → Beine (Primär)
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-00000000000b', 1, 4, 8,  100),
  -- Bench Press   → Brust/Trizeps
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 2, 4, 8,  80),
  -- Barbell Row   → Rücken/Bizeps
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000008', 3, 4, 8,  70),
  -- Romanian DL   → Hamstrings/Gesäß
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-00000000000c', 4, 3, 10, 80),
  -- Overhead Press → Schultern
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000003', 5, 3, 10, 50)
on conflict (training_day_id, exercise_id) do nothing;

-- ─────────────────────────────────────────────
-- Ganzkörper B: Deadlift + Vertikales Drücken/Ziehen
-- ─────────────────────────────────────────────
insert into public.day_exercises
  (training_day_id, exercise_id, sort_order, planned_sets, planned_reps, planned_weight)
values
  -- Deadlift      → Rücken/Beine (Primär)
  ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000006', 1, 4, 5,  120),
  -- Pull-ups      → Rücken/Bizeps
  ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000007', 2, 4, 8,  0),
  -- Incline DB    → Obere Brust
  ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000002', 3, 3, 10, 22),
  -- Leg Press     → Beine (Volumen)
  ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-00000000000d', 4, 3, 12, 150),
  -- Lateral Raises → Schultern (Seite)
  ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000004', 5, 3, 15, 10)
on conflict (training_day_id, exercise_id) do nothing;

-- ─────────────────────────────────────────────
-- Ganzkörper C: Leichterer Tag + Arme/Waden
-- ─────────────────────────────────────────────
insert into public.day_exercises
  (training_day_id, exercise_id, sort_order, planned_sets, planned_reps, planned_weight)
values
  -- Squat (leicht) → Beine
  ('10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-00000000000b', 1, 3, 10, 90),
  -- Overhead Press  → Schultern
  ('10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000003', 2, 3, 10, 45),
  -- Barbell Row     → Rücken
  ('10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000008', 3, 3, 10, 65),
  -- Leg Curl        → Hamstrings
  ('10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-00000000000e', 4, 3, 12, 40),
  -- Bicep Curls     → Bizeps
  ('10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-00000000000a', 5, 3, 12, 15),
  -- Tricep Pushdown → Trizeps
  ('10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000005', 6, 3, 12, 20)
on conflict (training_day_id, exercise_id) do nothing;
