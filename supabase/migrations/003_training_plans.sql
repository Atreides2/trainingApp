-- Create training_plans table
CREATE TABLE training_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add plan_id to training_days
ALTER TABLE training_days ADD COLUMN plan_id UUID REFERENCES training_plans(id) ON DELETE CASCADE;

-- Create default "3er Split" plan and link existing days to it
INSERT INTO training_plans (id, name, is_active)
VALUES ('00000000-0000-0000-0000-000000000001', '3er Split', true);

UPDATE training_days SET plan_id = '00000000-0000-0000-0000-000000000001';

-- Make plan_id required
ALTER TABLE training_days ALTER COLUMN plan_id SET NOT NULL;
