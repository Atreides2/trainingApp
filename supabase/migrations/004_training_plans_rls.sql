-- RLS policy for training_plans (missing from 003_training_plans.sql)
alter table public.training_plans enable row level security;
create policy "public all" on public.training_plans for all using (true) with check (true);
