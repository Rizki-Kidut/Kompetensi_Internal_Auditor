-- Add LMS integration columns to training_evaluations
ALTER TABLE training_evaluations
  ADD COLUMN IF NOT EXISTS test_source      TEXT NOT NULL DEFAULT 'Manual',
  ADD COLUMN IF NOT EXISTS test_attempt_id  TEXT,
  ADD COLUMN IF NOT EXISTS workshop_score   NUMERIC;
