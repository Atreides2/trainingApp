-- ─────────────────────────────────────────────
-- Exercise library
-- ─────────────────────────────────────────────
create table public.exercises (
  id            uuid primary key default gen_random_uuid(),
  name          text not null unique,
  notes         text,
  is_bodyweight boolean not null default false,
  created_at    timestamptz default now()
);

-- ─────────────────────────────────────────────
-- PPL day definitions
-- ─────────────────────────────────────────────
create table public.training_days (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  sort_order integer not null default 0,
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────────
-- Template: exercises per training day
-- ─────────────────────────────────────────────
create table public.day_exercises (
  id              uuid primary key default gen_random_uuid(),
  training_day_id uuid not null references public.training_days on delete cascade,
  exercise_id     uuid not null references public.exercises on delete cascade,
  sort_order      integer not null default 0,
  planned_sets    integer not null default 3,
  planned_reps    integer not null default 10,
  planned_weight  numeric(6,2) not null default 0,
  created_at      timestamptz default now(),
  unique (training_day_id, exercise_id)
);

-- ─────────────────────────────────────────────
-- A logged training session
-- ─────────────────────────────────────────────
create table public.workout_sessions (
  id              uuid primary key default gen_random_uuid(),
  training_day_id uuid not null references public.training_days on delete restrict,
  date            date not null default current_date,
  status          text not null default 'active'
                  check (status in ('active', 'done', 'cancelled')),
  completed_at    timestamptz,
  created_at      timestamptz default now()
);

create index on public.workout_sessions (date desc);
create index on public.workout_sessions (training_day_id);

-- ─────────────────────────────────────────────
-- Individual sets within a session
-- ─────────────────────────────────────────────
create table public.session_sets (
  id             uuid primary key default gen_random_uuid(),
  session_id     uuid not null references public.workout_sessions on delete cascade,
  exercise_id    uuid not null references public.exercises on delete restrict,
  set_number     integer not null,
  planned_reps   integer not null,
  planned_weight numeric(6,2) not null,
  actual_reps    integer,
  actual_weight  numeric(6,2),
  completed      boolean not null default false,
  is_planned     boolean not null default true,
  created_at     timestamptz default now()
);

create index on public.session_sets (session_id);
create index on public.session_sets (exercise_id);

-- ─────────────────────────────────────────────
-- Volume view (used by progress graph)
-- ─────────────────────────────────────────────
create view public.exercise_volume as
  select
    ss.exercise_id,
    ws.date,
    ws.id as session_id,
    sum(ss.actual_reps * ss.actual_weight) as total_volume
  from public.session_sets ss
  join public.workout_sessions ws on ws.id = ss.session_id
  where ss.completed = true
    and ss.actual_reps is not null
    and ss.actual_weight is not null
    and ss.actual_weight > 0
  group by ss.exercise_id, ws.date, ws.id
  order by ws.date;

-- ─────────────────────────────────────────────
-- RLS: allow anon key full access (no auth)
-- ─────────────────────────────────────────────
alter table public.exercises enable row level security;
create policy "public all" on public.exercises for all using (true) with check (true);

alter table public.training_days enable row level security;
create policy "public all" on public.training_days for all using (true) with check (true);

alter table public.day_exercises enable row level security;
create policy "public all" on public.day_exercises for all using (true) with check (true);

alter table public.workout_sessions enable row level security;
create policy "public all" on public.workout_sessions for all using (true) with check (true);

alter table public.session_sets enable row level security;
create policy "public all" on public.session_sets for all using (true) with check (true);
