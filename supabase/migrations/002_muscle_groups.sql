create table public.muscle_groups (
  id   uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique
);

create table public.exercise_muscle_groups (
  exercise_id     uuid not null references public.exercises on delete cascade,
  muscle_group_id uuid not null references public.muscle_groups on delete cascade,
  is_primary      boolean not null default true,
  primary key (exercise_id, muscle_group_id)
);

alter table public.muscle_groups enable row level security;
create policy "public all" on public.muscle_groups for all using (true) with check (true);

alter table public.exercise_muscle_groups enable row level security;
create policy "public all" on public.exercise_muscle_groups for all using (true) with check (true);
