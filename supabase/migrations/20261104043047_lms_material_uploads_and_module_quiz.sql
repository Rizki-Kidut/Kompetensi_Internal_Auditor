/*
# LMS material file uploads and per-module quizzes

1. Changes
- Creates the public storage bucket `lms-materials` for admin-uploaded course documents (PDF, PPT, video).
- Adds `module_id` to `lms_tests` so a test can be attached as the quiz of one module.

2. Security
- Storage: anon and authenticated roles may INSERT objects into `lms-materials` only. Files are readable through their public URL.
- `lms_tests.module_id` is nullable and references `lms_modules(id)` with ON DELETE SET NULL, so deleting a module keeps its test.
- No existing policies or data are changed.

3. Notes
- Migration is idempotent (IF NOT EXISTS, ON CONFLICT, DROP POLICY IF EXISTS).
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('lms-materials', 'lms-materials', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "anon_insert_lms_materials_files" ON storage.objects;
CREATE POLICY "anon_insert_lms_materials_files" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'lms-materials');

ALTER TABLE lms_tests ADD COLUMN IF NOT EXISTS module_id TEXT REFERENCES lms_modules(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_lms_tests_module ON lms_tests(module_id);
