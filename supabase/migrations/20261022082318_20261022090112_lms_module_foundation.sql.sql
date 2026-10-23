/*
# LMS Module Foundation — Phase 1

This migration adds the Learning Management System (LMS) module for Internal Auditors
without altering existing module behavior. All changes are additive (IF NOT EXISTS).

## Modified Tables

1. **training_sessions** — two new nullable/defaulted columns:
   - `delivery_mode` TEXT NOT NULL DEFAULT 'Tatap Muka' (values: Tatap Muka | LMS | Blended)
   - `lms_course_id` TEXT (nullable, links session to an LMS course)

2. **training_evaluations** — three new nullable/defaulted columns:
   - `test_source` TEXT NOT NULL DEFAULT 'Manual' (Manual | LMS)
   - `test_attempt_id` TEXT (nullable, links to an LMS attempt if test taken via LMS)
   - `workshop_score` NUMERIC (nullable, score from LMS workshop task)

## New Tables (10 total)

1. **lms_courses** — Master kursus LMS (title, description, competency link, pass grade, status).
2. **lms_modules** — Modul dalam kursus (title, sort order, prerequisite).
3. **lms_materials** — Materi per modul (PDF/PPT/Video/Link/Teks, URL, content, doc control).
4. **lms_questions** — Bank soal (PG/BS/Isian/Esai/Kasus, options JSONB, clause tag, difficulty, points). NO answer keys stored here.
5. **lms_question_keys** — Kunci jawaban (answer JSONB + explanation). RLS enabled with NO policies — unreadable from frontend.
6. **lms_tests** — Konfigurasi tes (duration, pass grade, max attempts, shuffle, time window offsets, status).
7. **lms_test_questions** — Relasi tes ↔ soal (sort order).
8. **lms_enrollments** — Pendaftaran auditor ke kursus via sesi (progress, completed modules, status).
9. **lms_attempts** — Percobaan tes (answers JSONB, auto/manual score, final score, passed, status).
10. **lms_workshop_tasks** — Tugas workshop per sesi (brief, due date, rubric JSONB, max score).
11. **lms_submissions** — Pengumpulan tugas workshop (file URL, rubric scores, score, feedback, assessor, status).

## RPC Functions (SECURITY DEFINER, search_path = public)

1. **lms_upsert_question(p_question jsonb, p_key jsonb)** — Upsert soal + kunci jawaban atomically.
2. **lms_get_question_key(p_question_id text)** — Retrieve answer key for admin edit form. TODO: restrict to admin after Supabase Auth.
3. **lms_start_attempt(p_test_id text, p_session_id text, p_auditor_id text)** — Validate enrollment, time window, max attempts; create new attempt.
4. **lms_get_test_questions(p_attempt_id text)** — Return questions + options WITHOUT keys, shuffled per test config.
5. **lms_submit_attempt(p_attempt_id text, p_answers jsonb)** — Auto-grade PG/BS/Isian; if Esai/Kasus present, set status "Menunggu Penilaian"; else finalize score and passed flag.

## Security

- RLS enabled on all new tables.
- All policies use `TO anon, authenticated` with `USING (true)` / `WITH CHECK (true)` — single-tenant, no sign-in.
- **EXCEPTION**: `lms_question_keys` has RLS enabled but NO policies — answer keys are completely inaccessible from the frontend. Only SECURITY DEFINER functions can read/write them.
- 4 separate policies (SELECT/INSERT/UPDATE/DELETE) per table (except lms_question_keys).

## Seed Data

- 1 competency item ("Contoh: Audit Proses Produksi" under "Audit Produk") if competency_items is empty.
- 1 Published course linked to that competency item.
- 2 modules, 4 materials, 8 questions (5 PG, 1 BS, 1 Isian, 1 Esai) with answer keys.
- 1 test (30 min, pass grade 80, max 3 attempts) with all 8 questions.
- 1 workshop task with a 4-criteria rubric (total weight 100).

## Important Notes

1. All ID columns are TEXT (consistent with existing schema).
2. JSONB columns used for flexible data: options, answers, rubric, completed_modules.
3. lms_question_keys uses question_id as PRIMARY KEY (1:1 with lms_questions).
4. Time window for tests: session date + open_offset_days to session date + close_offset_days.
5. Auto-grading for Isian: case-insensitive, whitespace-trimmed, supports multiple correct answers.
*/

-- ════════════════════════════════════════════════════════════
-- 1. ALTER EXISTING TABLES (additive only)
-- ════════════════════════════════════════════════════════════
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'training_sessions' AND column_name = 'delivery_mode') THEN
    ALTER TABLE training_sessions ADD COLUMN delivery_mode TEXT NOT NULL DEFAULT 'Tatap Muka';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'training_sessions' AND column_name = 'lms_course_id') THEN
    ALTER TABLE training_sessions ADD COLUMN lms_course_id TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'training_evaluations' AND column_name = 'test_source') THEN
    ALTER TABLE training_evaluations ADD COLUMN test_source TEXT NOT NULL DEFAULT 'Manual';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'training_evaluations' AND column_name = 'test_attempt_id') THEN
    ALTER TABLE training_evaluations ADD COLUMN test_attempt_id TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'training_evaluations' AND column_name = 'workshop_score') THEN
    ALTER TABLE training_evaluations ADD COLUMN workshop_score NUMERIC;
  END IF;
END $$;

-- ════════════════════════════════════════════════════════════
-- 2. LMS_COURSES
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS lms_courses (
  id                 TEXT PRIMARY KEY,
  title              TEXT NOT NULL,
  description        TEXT DEFAULT '',
  competency_item_id TEXT,
  target_level       TEXT NOT NULL DEFAULT '◆',
  pass_grade         NUMERIC NOT NULL DEFAULT 80,
  status             TEXT NOT NULL DEFAULT 'Draft',
  created_at         timestamptz DEFAULT now()
);

ALTER TABLE lms_courses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_lms_courses" ON lms_courses;
CREATE POLICY "anon_select_lms_courses" ON lms_courses FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_lms_courses" ON lms_courses;
CREATE POLICY "anon_insert_lms_courses" ON lms_courses FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_lms_courses" ON lms_courses;
CREATE POLICY "anon_update_lms_courses" ON lms_courses FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_lms_courses" ON lms_courses;
CREATE POLICY "anon_delete_lms_courses" ON lms_courses FOR DELETE TO anon, authenticated USING (true);

-- ════════════════════════════════════════════════════════════
-- 3. LMS_MODULES
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS lms_modules (
  id                      TEXT PRIMARY KEY,
  course_id               TEXT NOT NULL,
  title                   TEXT NOT NULL,
  sort_order              INT NOT NULL DEFAULT 0,
  prerequisite_module_id  TEXT,
  created_at              timestamptz DEFAULT now()
);

ALTER TABLE lms_modules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_lms_modules" ON lms_modules;
CREATE POLICY "anon_select_lms_modules" ON lms_modules FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_lms_modules" ON lms_modules;
CREATE POLICY "anon_insert_lms_modules" ON lms_modules FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_lms_modules" ON lms_modules;
CREATE POLICY "anon_update_lms_modules" ON lms_modules FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_lms_modules" ON lms_modules;
CREATE POLICY "anon_delete_lms_modules" ON lms_modules FOR DELETE TO anon, authenticated USING (true);

-- ════════════════════════════════════════════════════════════
-- 4. LMS_MATERIALS
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS lms_materials (
  id              TEXT PRIMARY KEY,
  module_id       TEXT NOT NULL,
  title           TEXT NOT NULL,
  type            TEXT NOT NULL DEFAULT 'Teks',
  url             TEXT DEFAULT '',
  content         TEXT DEFAULT '',
  doc_number      TEXT DEFAULT '',
  revision        TEXT DEFAULT '',
  effective_date  TEXT DEFAULT '',
  sort_order      INT NOT NULL DEFAULT 0,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE lms_materials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_lms_materials" ON lms_materials;
CREATE POLICY "anon_select_lms_materials" ON lms_materials FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_lms_materials" ON lms_materials;
CREATE POLICY "anon_insert_lms_materials" ON lms_materials FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_lms_materials" ON lms_materials;
CREATE POLICY "anon_update_lms_materials" ON lms_materials FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_lms_materials" ON lms_materials;
CREATE POLICY "anon_delete_lms_materials" ON lms_materials FOR DELETE TO anon, authenticated USING (true);

-- ════════════════════════════════════════════════════════════
-- 5. LMS_QUESTIONS (NO answer keys)
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS lms_questions (
  id          TEXT PRIMARY KEY,
  course_id   TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'PG',
  text        TEXT NOT NULL,
  options     JSONB DEFAULT '[]',
  clause_tag  TEXT DEFAULT '',
  difficulty  TEXT NOT NULL DEFAULT 'Sedang',
  points      NUMERIC NOT NULL DEFAULT 1,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE lms_questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_lms_questions" ON lms_questions;
CREATE POLICY "anon_select_lms_questions" ON lms_questions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_lms_questions" ON lms_questions;
CREATE POLICY "anon_insert_lms_questions" ON lms_questions FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_lms_questions" ON lms_questions;
CREATE POLICY "anon_update_lms_questions" ON lms_questions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_lms_questions" ON lms_questions;
CREATE POLICY "anon_delete_lms_questions" ON lms_questions FOR DELETE TO anon, authenticated USING (true);

-- ════════════════════════════════════════════════════════════
-- 6. LMS_QUESTION_KEYS (RLS enabled, NO policies — unreadable from frontend)
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS lms_question_keys (
  question_id  TEXT PRIMARY KEY,
  answer       JSONB NOT NULL,
  explanation  TEXT DEFAULT '',
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE lms_question_keys ENABLE ROW LEVEL SECURITY;
-- Deliberately NO policies: the table is locked down.
-- Only SECURITY DEFINER functions (lms_upsert_question, lms_get_question_key,
-- lms_submit_attempt) can read/write this table.

-- ════════════════════════════════════════════════════════════
-- 7. LMS_TESTS
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS lms_tests (
  id                TEXT PRIMARY KEY,
  course_id         TEXT NOT NULL,
  title             TEXT NOT NULL,
  duration_minutes  INT NOT NULL DEFAULT 30,
  pass_grade        NUMERIC NOT NULL DEFAULT 80,
  max_attempts      INT NOT NULL DEFAULT 1,
  shuffle_questions BOOLEAN NOT NULL DEFAULT false,
  shuffle_options   BOOLEAN NOT NULL DEFAULT false,
  open_offset_days  INT NOT NULL DEFAULT 0,
  close_offset_days INT NOT NULL DEFAULT 7,
  status            TEXT NOT NULL DEFAULT 'Draft',
  created_at        timestamptz DEFAULT now()
);

ALTER TABLE lms_tests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_lms_tests" ON lms_tests;
CREATE POLICY "anon_select_lms_tests" ON lms_tests FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_lms_tests" ON lms_tests;
CREATE POLICY "anon_insert_lms_tests" ON lms_tests FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_lms_tests" ON lms_tests;
CREATE POLICY "anon_update_lms_tests" ON lms_tests FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_lms_tests" ON lms_tests;
CREATE POLICY "anon_delete_lms_tests" ON lms_tests FOR DELETE TO anon, authenticated USING (true);

-- ════════════════════════════════════════════════════════════
-- 8. LMS_TEST_QUESTIONS
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS lms_test_questions (
  test_id      TEXT NOT NULL,
  question_id  TEXT NOT NULL,
  sort_order   INT NOT NULL DEFAULT 0,
  PRIMARY KEY (test_id, question_id)
);

ALTER TABLE lms_test_questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_lms_test_questions" ON lms_test_questions;
CREATE POLICY "anon_select_lms_test_questions" ON lms_test_questions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_lms_test_questions" ON lms_test_questions;
CREATE POLICY "anon_insert_lms_test_questions" ON lms_test_questions FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_lms_test_questions" ON lms_test_questions;
CREATE POLICY "anon_update_lms_test_questions" ON lms_test_questions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_lms_test_questions" ON lms_test_questions;
CREATE POLICY "anon_delete_lms_test_questions" ON lms_test_questions FOR DELETE TO anon, authenticated USING (true);

-- ════════════════════════════════════════════════════════════
-- 9. LMS_ENROLLMENTS
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS lms_enrollments (
  id               TEXT PRIMARY KEY,
  session_id       TEXT NOT NULL,
  course_id        TEXT NOT NULL,
  auditor_id       TEXT NOT NULL,
  progress         NUMERIC NOT NULL DEFAULT 0,
  completed_modules JSONB NOT NULL DEFAULT '[]',
  status           TEXT NOT NULL DEFAULT 'Terdaftar',
  created_at       timestamptz DEFAULT now()
);

ALTER TABLE lms_enrollments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_lms_enrollments" ON lms_enrollments;
CREATE POLICY "anon_select_lms_enrollments" ON lms_enrollments FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_lms_enrollments" ON lms_enrollments;
CREATE POLICY "anon_insert_lms_enrollments" ON lms_enrollments FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_lms_enrollments" ON lms_enrollments;
CREATE POLICY "anon_update_lms_enrollments" ON lms_enrollments FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_lms_enrollments" ON lms_enrollments;
CREATE POLICY "anon_delete_lms_enrollments" ON lms_enrollments FOR DELETE TO anon, authenticated USING (true);

-- ════════════════════════════════════════════════════════════
-- 10. LMS_ATTEMPTS
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS lms_attempts (
  id            TEXT PRIMARY KEY,
  test_id       TEXT NOT NULL,
  session_id    TEXT NOT NULL,
  auditor_id    TEXT NOT NULL,
  attempt_no    INT NOT NULL DEFAULT 1,
  started_at    timestamptz DEFAULT now(),
  submitted_at  timestamptz,
  answers       JSONB DEFAULT '{}',
  auto_score    NUMERIC,
  manual_score  NUMERIC,
  final_score   NUMERIC,
  passed        BOOLEAN DEFAULT false,
  status        TEXT NOT NULL DEFAULT 'Berjalan',
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE lms_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_lms_attempts" ON lms_attempts;
CREATE POLICY "anon_select_lms_attempts" ON lms_attempts FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_lms_attempts" ON lms_attempts;
CREATE POLICY "anon_insert_lms_attempts" ON lms_attempts FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_lms_attempts" ON lms_attempts;
CREATE POLICY "anon_update_lms_attempts" ON lms_attempts FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_lms_attempts" ON lms_attempts;
CREATE POLICY "anon_delete_lms_attempts" ON lms_attempts FOR DELETE TO anon, authenticated USING (true);

-- ════════════════════════════════════════════════════════════
-- 11. LMS_WORKSHOP_TASKS
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS lms_workshop_tasks (
  id          TEXT PRIMARY KEY,
  session_id  TEXT NOT NULL,
  title       TEXT NOT NULL,
  brief       TEXT DEFAULT '',
  due_date    TEXT DEFAULT '',
  rubric      JSONB NOT NULL DEFAULT '[]',
  max_score   NUMERIC NOT NULL DEFAULT 100,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE lms_workshop_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_lms_workshop_tasks" ON lms_workshop_tasks;
CREATE POLICY "anon_select_lms_workshop_tasks" ON lms_workshop_tasks FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_lms_workshop_tasks" ON lms_workshop_tasks;
CREATE POLICY "anon_insert_lms_workshop_tasks" ON lms_workshop_tasks FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_lms_workshop_tasks" ON lms_workshop_tasks;
CREATE POLICY "anon_update_lms_workshop_tasks" ON lms_workshop_tasks FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_lms_workshop_tasks" ON lms_workshop_tasks;
CREATE POLICY "anon_delete_lms_workshop_tasks" ON lms_workshop_tasks FOR DELETE TO anon, authenticated USING (true);

-- ════════════════════════════════════════════════════════════
-- 12. LMS_SUBMISSIONS
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS lms_submissions (
  id            TEXT PRIMARY KEY,
  task_id       TEXT NOT NULL,
  session_id    TEXT NOT NULL,
  auditor_id    TEXT NOT NULL,
  file_url      TEXT DEFAULT '',
  note          TEXT DEFAULT '',
  submitted_at  timestamptz DEFAULT now(),
  rubric_scores JSONB DEFAULT '{}',
  score         NUMERIC,
  feedback      TEXT DEFAULT '',
  assessor      TEXT DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'Dikirim',
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE lms_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_lms_submissions" ON lms_submissions;
CREATE POLICY "anon_select_lms_submissions" ON lms_submissions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_lms_submissions" ON lms_submissions;
CREATE POLICY "anon_insert_lms_submissions" ON lms_submissions FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_lms_submissions" ON lms_submissions;
CREATE POLICY "anon_update_lms_submissions" ON lms_submissions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_lms_submissions" ON lms_submissions;
CREATE POLICY "anon_delete_lms_submissions" ON lms_submissions FOR DELETE TO anon, authenticated USING (true);

-- ════════════════════════════════════════════════════════════
-- INDEXES
-- ════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_lms_modules_course ON lms_modules(course_id);
CREATE INDEX IF NOT EXISTS idx_lms_materials_module ON lms_materials(module_id);
CREATE INDEX IF NOT EXISTS idx_lms_questions_course ON lms_questions(course_id);
CREATE INDEX IF NOT EXISTS idx_lms_tests_course ON lms_tests(course_id);
CREATE INDEX IF NOT EXISTS idx_lms_test_questions_test ON lms_test_questions(test_id);
CREATE INDEX IF NOT EXISTS idx_lms_enrollments_session ON lms_enrollments(session_id);
CREATE INDEX IF NOT EXISTS idx_lms_enrollments_auditor ON lms_enrollments(auditor_id);
CREATE INDEX IF NOT EXISTS idx_lms_attempts_test ON lms_attempts(test_id);
CREATE INDEX IF NOT EXISTS idx_lms_attempts_auditor ON lms_attempts(auditor_id);
CREATE INDEX IF NOT EXISTS idx_lms_attempts_session ON lms_attempts(session_id);
CREATE INDEX IF NOT EXISTS idx_lms_workshop_tasks_session ON lms_workshop_tasks(session_id);
CREATE INDEX IF NOT EXISTS idx_lms_submissions_task ON lms_submissions(task_id);
CREATE INDEX IF NOT EXISTS idx_lms_submissions_auditor ON lms_submissions(auditor_id);

-- ════════════════════════════════════════════════════════════
-- RPC FUNCTIONS (SECURITY DEFINER, search_path = public)
-- ════════════════════════════════════════════════════════════

-- 1. lms_upsert_question: atomically upsert a question + its answer key
CREATE OR REPLACE FUNCTION lms_upsert_question(p_question jsonb, p_key jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id       TEXT;
  v_course   TEXT;
  v_type     TEXT;
  v_text     TEXT;
  v_options  JSONB;
  v_clause   TEXT;
  v_diff     TEXT;
  v_points   NUMERIC;
  v_answer   JSONB;
  v_explain  TEXT;
BEGIN
  v_id      := p_question->>'id';
  v_course   := p_question->>'course_id';
  v_type     := p_question->>'type';
  v_text     := p_question->>'text';
  v_options  := COALESCE((p_question->'options')::jsonb, '[]'::jsonb);
  v_clause   := COALESCE(p_question->>'clause_tag', '');
  v_diff     := COALESCE(p_question->>'difficulty', 'Sedang');
  v_points   := COALESCE((p_question->>'points')::numeric, 1);

  IF v_id IS NULL OR v_id = '' THEN
    v_id := 'q-' || extract(epoch from now())::text || '-' || (random() * 1000)::int::text;
  END IF;

  v_answer  := p_key->'answer';
  v_explain := COALESCE(p_key->>'explanation', '');

  -- Upsert question
  INSERT INTO lms_questions (id, course_id, type, text, options, clause_tag, difficulty, points)
  VALUES (v_id, v_course, v_type, v_text, v_options, v_clause, v_diff, v_points)
  ON CONFLICT (id) DO UPDATE SET
    course_id  = EXCLUDED.course_id,
    type       = EXCLUDED.type,
    text       = EXCLUDED.text,
    options    = EXCLUDED.options,
    clause_tag = EXCLUDED.clause_tag,
    difficulty = EXCLUDED.difficulty,
    points     = EXCLUDED.points;

  -- Upsert answer key
  INSERT INTO lms_question_keys (question_id, answer, explanation)
  VALUES (v_id, v_answer, v_explain)
  ON CONFLICT (question_id) DO UPDATE SET
    answer      = EXCLUDED.answer,
    explanation = EXCLUDED.explanation;

  RETURN jsonb_build_object('id', v_id, 'success', true);
END;
$$;

-- 2. lms_get_question_key: retrieve answer key for admin edit form
-- TODO: restrict to admin role after Supabase Auth is implemented
CREATE OR REPLACE FUNCTION lms_get_question_key(p_question_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row RECORD;
BEGIN
  SELECT answer, explanation INTO v_row FROM lms_question_keys WHERE question_id = p_question_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('answer', null, 'explanation', '');
  END IF;
  RETURN jsonb_build_object('answer', v_row.answer, 'explanation', v_row.explanation);
END;
$$;

-- 3. lms_start_attempt: validate and create a new test attempt
CREATE OR REPLACE FUNCTION lms_start_attempt(p_test_id text, p_session_id text, p_auditor_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_test        RECORD;
  v_session     RECORD;
  v_enrollment  RECORD;
  v_attempt_cnt INT;
  v_attempt_id  TEXT;
  v_session_date DATE;
  v_open_time   timestamptz;
  v_close_time  timestamptz;
  v_now         timestamptz := now();
BEGIN
  -- Load test
  SELECT * INTO v_test FROM lms_tests WHERE id = p_test_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tes tidak ditemukan';
  END IF;
  IF v_test.status != 'Published' THEN
    RAISE EXCEPTION 'Tes belum dipublikasikan';
  END IF;

  -- Load session
  SELECT * INTO v_session FROM training_sessions WHERE id = p_session_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sesi training tidak ditemukan';
  END IF;

  -- Validate enrollment: auditor must be in session participants
  SELECT * INTO v_enrollment FROM lms_enrollments
    WHERE session_id = p_session_id AND auditor_id = p_auditor_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Auditor tidak terdaftar untuk sesi ini';
  END IF;

  -- Validate time window
  v_session_date := v_session.date::date;
  v_open_time    := (v_session_date + v_test.open_offset_days * interval '1 day')::timestamptz;
  v_close_time   := (v_session_date + v_test.close_offset_days * interval '1 day')::timestamptz;
  IF v_now < v_open_time THEN
    RAISE EXCEPTION 'Tes belum dibuka';
  END IF;
  IF v_now > v_close_time THEN
    RAISE EXCEPTION 'Tes sudah ditutup';
  END IF;

  -- Validate max attempts
  SELECT count(*) INTO v_attempt_cnt FROM lms_attempts
    WHERE test_id = p_test_id AND session_id = p_session_id AND auditor_id = p_auditor_id;
  IF v_attempt_cnt >= v_test.max_attempts THEN
    RAISE EXCEPTION 'Maksimum percobaan tercapai';
  END IF;

  -- Create attempt
  v_attempt_id := 'att-' || extract(epoch from now())::text || '-' || (random() * 1000)::int::text;
  INSERT INTO lms_attempts (id, test_id, session_id, auditor_id, attempt_no, started_at, status)
  VALUES (v_attempt_id, p_test_id, p_session_id, p_auditor_id, v_attempt_cnt + 1, v_now, 'Berjalan');

  RETURN jsonb_build_object('attempt_id', v_attempt_id, 'success', true);
END;
$$;

-- 4. lms_get_test_questions: return questions + options WITHOUT answer keys, optionally shuffled
CREATE OR REPLACE FUNCTION lms_get_test_questions(p_attempt_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempt    RECORD;
  v_test       RECORD;
  v_questions  jsonb;
BEGIN
  SELECT * INTO v_attempt FROM lms_attempts WHERE id = p_attempt_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Attempt tidak ditemukan';
  END IF;

  SELECT * INTO v_test FROM lms_tests WHERE id = v_attempt.test_id;

  -- Fetch questions joined with test_questions for sort order
  IF v_test.shuffle_questions THEN
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', q.id,
        'type', q.type,
        'text', q.text,
        'options', CASE WHEN v_test.shuffle_options AND q.type IN ('PG','BS')
                        THEN (SELECT jsonb_agg(elem ORDER BY random())
                              FROM jsonb_array_elements(q.options) elem)
                        ELSE q.options END,
        'clause_tag', q.clause_tag,
        'difficulty', q.difficulty,
        'points', q.points
      ) ORDER BY random()
    ), '[]'::jsonb) INTO v_questions
    FROM lms_questions q
    JOIN lms_test_questions tq ON tq.question_id = q.id
    WHERE tq.test_id = v_test.id;
  ELSE
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', q.id,
        'type', q.type,
        'text', q.text,
        'options', q.options,
        'clause_tag', q.clause_tag,
        'difficulty', q.difficulty,
        'points', q.points
      ) ORDER BY tq.sort_order
    ), '[]'::jsonb) INTO v_questions
    FROM lms_questions q
    JOIN lms_test_questions tq ON tq.question_id = q.id
    WHERE tq.test_id = v_test.id;
  END IF;

  RETURN v_questions;
END;
$$;

-- 5. lms_submit_attempt: auto-grade and optionally finalize
CREATE OR REPLACE FUNCTION lms_submit_attempt(p_attempt_id text, p_answers jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempt       RECORD;
  v_test          RECORD;
  v_question      RECORD;
  v_key           RECORD;
  v_answer_val    TEXT;
  v_user_answer   TEXT;
  v_correct_count INT := 0;
  v_total_points  NUMERIC := 0;
  v_earned        NUMERIC := 0;
  v_has_manual    BOOLEAN := false;
  v_auto_pct      NUMERIC;
  v_final_score   NUMERIC;
  v_passed        BOOLEAN;
BEGIN
  SELECT * INTO v_attempt FROM lms_attempts WHERE id = p_attempt_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Attempt tidak ditemukan';
  END IF;
  IF v_attempt.status != 'Berjalan' THEN
    RAISE EXCEPTION 'Attempt sudah disubmit';
  END IF;

  SELECT * INTO v_test FROM lms_tests WHERE id = v_attempt.test_id;

  -- Iterate over all questions in this test
  FOR v_question IN
    SELECT q.* FROM lms_questions q
    JOIN lms_test_questions tq ON tq.question_id = q.id
    WHERE tq.test_id = v_test.id
  LOOP
    v_total_points := v_total_points + v_question.points;

    -- Get answer key
    SELECT * INTO v_key FROM lms_question_keys WHERE question_id = v_question.id;

    -- Only auto-grade if answer was provided
    v_user_answer := p_answers->>v_question.id;

    IF v_question.type IN ('PG', 'BS') THEN
      -- Compare exact match
      IF v_user_answer IS NOT NULL AND v_key.answer->>0 = v_user_answer THEN
        v_earned := v_earned + v_question.points;
        v_correct_count := v_correct_count + 1;
      END IF;

    ELSIF v_question.type = 'Isian' THEN
      -- Case-insensitive, whitespace-trimmed, supports multiple correct answers
      IF v_user_answer IS NOT NULL THEN
        v_user_answer := lower(btrim(v_user_answer));
        PERFORM 1
          FROM jsonb_array_elements_text(v_key.answer) AS ans
          WHERE lower(btrim(ans)) = v_user_answer;
        IF FOUND THEN
          v_earned := v_earned + v_question.points;
          v_correct_count := v_correct_count + 1;
        END IF;
      END IF;

    ELSIF v_question.type IN ('Esai', 'Kasus') THEN
      -- Manual grading required
      v_has_manual := true;
    END IF;
  END LOOP;

  -- Store answers and auto score
  UPDATE lms_attempts
    SET answers = p_answers,
        submitted_at = now(),
        auto_score = v_earned
    WHERE id = p_attempt_id;

  IF v_has_manual THEN
    -- Needs manual grading
    UPDATE lms_attempts SET status = 'Menunggu Penilaian' WHERE id = p_attempt_id;
    RETURN jsonb_build_object(
      'success', true,
      'status', 'Menunggu Penilaian',
      'auto_score', v_earned,
      'total_points', v_total_points,
      'has_manual', true
    );
  ELSE
    -- Finalize: convert to 0-100 scale
    IF v_total_points > 0 THEN
      v_auto_pct := (v_earned / v_total_points) * 100;
    ELSE
      v_auto_pct := 0;
    END IF;
    v_final_score := round(v_auto_pct::numeric, 2);
    v_passed := v_final_score >= v_test.pass_grade;

    UPDATE lms_attempts
      SET manual_score = null,
          final_score = v_final_score,
          passed = v_passed,
          status = 'Dinilai'
      WHERE id = p_attempt_id;

    RETURN jsonb_build_object(
      'success', true,
      'status', 'Dinilai',
      'final_score', v_final_score,
      'passed', v_passed,
      'auto_score', v_earned,
      'total_points', v_total_points,
      'has_manual', false
    );
  END IF;
END;
$$;

-- ════════════════════════════════════════════════════════════
-- SEED DATA (marked "Contoh")
-- ════════════════════════════════════════════════════════════

-- Seed a competency item if none exist
INSERT INTO competency_items (id, category, item_name)
SELECT 'ci-lms-seed-01', 'Audit Produk', 'Contoh: Audit Proses Produksi'
WHERE NOT EXISTS (SELECT 1 FROM competency_items LIMIT 1);

-- 1. Course
INSERT INTO lms_courses (id, title, description, competency_item_id, target_level, pass_grade, status)
SELECT 'lms-course-seed-01', 'Contoh: Audit Proses Produksi (LMS)',
       'Kursus contoh untuk modul LMS — Audit Proses Produksi.',
       'ci-lms-seed-01', '◆', 80, 'Published'
WHERE NOT EXISTS (SELECT 1 FROM lms_courses WHERE id = 'lms-course-seed-01');

-- 2. Modules
INSERT INTO lms_modules (id, course_id, title, sort_order, prerequisite_module_id)
SELECT 'lms-mod-seed-01', 'lms-course-seed-01', 'Modul 1: Dasar Audit Proses', 0, null
WHERE NOT EXISTS (SELECT 1 FROM lms_modules WHERE id = 'lms-mod-seed-01');

INSERT INTO lms_modules (id, course_id, title, sort_order, prerequisite_module_id)
SELECT 'lms-mod-seed-02', 'lms-course-seed-01', 'Modul 2: Teknik Audit Proses', 1, 'lms-mod-seed-01'
WHERE NOT EXISTS (SELECT 1 FROM lms_modules WHERE id = 'lms-mod-seed-02');

-- 3. Materials (4)
INSERT INTO lms_materials (id, module_id, title, type, url, content, doc_number, revision, effective_date, sort_order)
SELECT 'lms-mat-seed-01', 'lms-mod-seed-01', 'Contoh: Slide Pengantar Audit Proses', 'PPT', '', 'Materi pengantar audit proses produksi', 'Q-DOC-001', 'Rev.0', '2026-01-01', 0
WHERE NOT EXISTS (SELECT 1 FROM lms_materials WHERE id = 'lms-mat-seed-01');

INSERT INTO lms_materials (id, module_id, title, type, url, content, doc_number, revision, effective_date, sort_order)
SELECT 'lms-mat-seed-02', 'lms-mod-seed-01', 'Contoh: Checklist Audit Proses', 'PDF', '', 'Checklist dokumentasi audit proses', 'Q-DOC-002', 'Rev.0', '2026-01-01', 1
WHERE NOT EXISTS (SELECT 1 FROM lms_materials WHERE id = 'lms-mat-seed-02');

INSERT INTO lms_materials (id, module_id, title, type, url, content, doc_number, revision, effective_date, sort_order)
SELECT 'lms-mat-seed-03', 'lms-mod-seed-02', 'Contoh: Video Teknik Wawancara Audit', 'Video', 'https://example.com/video', '', '', '', '2026-01-01', 0
WHERE NOT EXISTS (SELECT 1 FROM lms_materials WHERE id = 'lms-mat-seed-03');

INSERT INTO lms_materials (id, module_id, title, type, url, content, doc_number, revision, effective_date, sort_order)
SELECT 'lms-mat-seed-04', 'lms-mod-seed-02', 'Contoh: Link Referensi ISO 9001', 'Link', 'https://example.com/iso9001', '', '', '', '2026-01-01', 1
WHERE NOT EXISTS (SELECT 1 FROM lms_materials WHERE id = 'lms-mat-seed-04');

-- 4. Questions (8: 5 PG, 1 BS, 1 Isian, 1 Esai) + keys
-- Q1: PG
SELECT lms_upsert_question(
  '{"id":"lms-q-seed-01","course_id":"lms-course-seed-01","type":"PG","text":"Contoh: Apa tujuan utama audit proses produksi?","options":["Memastikan kepatuhan prosedur","Mencari kesalahan operator","Menghukum yang melanggar","Membuat laporan untuk audit eksternal"],"clause_tag":"Klausul 9.2","difficulty":"Mudah","points":1}'::jsonb,
  '{"answer":["0"],"explanation":"Audit proses produksi bertujuan memastikan kepatuhan terhadap prosedur yang telah ditetapkan."}'::jsonb
) WHERE NOT EXISTS (SELECT 1 FROM lms_questions WHERE id = 'lms-q-seed-01');

-- Q2: PG
SELECT lms_upsert_question(
  '{"id":"lms-q-seed-02","course_id":"lms-course-seed-01","type":"PG","text":"Contoh: Manakah yang bukan termasuk prinsip audit internal?","options":["Independensi","Berbasis bukti","Berorientasi pada kesimpulan","Sistematis"],"clause_tag":"Klausul 9.2.2","difficulty":"Sedang","points":1}'::jsonb,
  '{"answer":["2"],"explanation":"Prinsip audit tidak berorientasi pada kesimpulan, melainkan pada bukti dan fakta."}'::jsonb
) WHERE NOT EXISTS (SELECT 1 FROM lms_questions WHERE id = 'lms-q-seed-02');

-- Q3: PG
SELECT lms_upsert_question(
  '{"id":"lms-q-seed-03","course_id":"lms-course-seed-01","type":"PG","text":"Contoh: Dokumen apa yang wajib disiapkan sebelum audit proses?","options":["Checklist audit","Surat pengunduran diri","Laporan keuangan","Daftar gaji karyawan"],"clause_tag":"Klausul 9.2.3","difficulty":"Mudah","points":1}'::jsonb,
  '{"answer":["0"],"explanation":"Checklist audit harus disiapkan sebelum melaksanakan audit proses."}'::jsonb
) WHERE NOT EXISTS (SELECT 1 FROM lms_questions WHERE id = 'lms-q-seed-03');

-- Q4: PG
SELECT lms_upsert_question(
  '{"id":"lms-q-seed-04","course_id":"lms-course-seed-01","type":"PG","text":"Contoh: Temuan audit diklasifikasikan menjadi?","options":["Major, Minor, OFI","Baik, Buruk, Cukup","Tinggi, Sedang, Rendah","Lulus, Tidak Lulus"],"clause_tag":"Klausul 9.2.4","difficulty":"Sedang","points":1}'::jsonb,
  '{"answer":["0"],"explanation":"Temuan audit diklasifikasikan sebagai Major, Minor, atau Opportunity for Improvement (OFI)."}'::jsonb
) WHERE NOT EXISTS (SELECT 1 FROM lms_questions WHERE id = 'lms-q-seed-04');

-- Q5: PG
SELECT lms_upsert_question(
  '{"id":"lms-q-seed-05","course_id":"lms-course-seed-01","type":"PG","text":"Contoh: Berapa lama maksimum tindakan korektif harus diselesaikan?","options":["7 hari","30 hari","90 hari","180 hari"],"clause_tag":"Klausul 10.2","difficulty":"Sulit","points":1}'::jsonb,
  '{"answer":["2"],"explanation":"Tindakan korektif umumnya harus diselesaikan dalam 90 hari sesuai prosedur."}'::jsonb
) WHERE NOT EXISTS (SELECT 1 FROM lms_questions WHERE id = 'lms-q-seed-05');

-- Q6: BS (Benar/Salah)
SELECT lms_upsert_question(
  '{"id":"lms-q-seed-06","course_id":"lms-course-seed-01","type":"BS","text":"Contoh: Auditor internal boleh mengaudit area kerjanya sendiri.","options":["Benar","Salah"],"clause_tag":"Klausul 9.2.2","difficulty":"Mudah","points":1}'::jsonb,
  '{"answer":["1"],"explanation":"Auditor harus independen dan tidak boleh mengaudit area kerjanya sendiri."}'::jsonb
) WHERE NOT EXISTS (SELECT 1 FROM lms_questions WHERE id = 'lms-q-seed-06');

-- Q7: Isian
SELECT lms_upsert_question(
  '{"id":"lms-q-seed-07","course_id":"lms-course-seed-01","type":"Isian","text":"Contoh: Sebutkan tahapan pertama dalam proses audit internal (satu kata).","options":[],"clause_tag":"Klausul 9.2.3","difficulty":"Sedang","points":1}'::jsonb,
  '{"answer":["perencanaan","persiapan"],"explanation":"Tahapan pertama audit internal adalah perencanaan/persiapan."}'::jsonb
) WHERE NOT EXISTS (SELECT 1 FROM lms_questions WHERE id = 'lms-q-seed-07');

-- Q8: Esai
SELECT lms_upsert_question(
  '{"id":"lms-q-seed-08","course_id":"lms-course-seed-01","type":"Esai","text":"Contoh: Jelaskan bagaimana cara menentukan efektivitas tindakan korektif hasil audit proses produksi.","options":[],"clause_tag":"Klausul 10.2.2","difficulty":"Sulit","points":2}'::jsonb,
  '{"answer":["verifikasi tindakan korektif dilakukan dengan memeriksa apakah akar masalah telah diatasi, prosedur diperbaiki, dan tidak ada rekuren temuan"],"explanation":"Penilaian esai: cek pemahaman konsep verifikasi efektivitas tindakan korektif."}'::jsonb
) WHERE NOT EXISTS (SELECT 1 FROM lms_questions WHERE id = 'lms-q-seed-08');

-- 5. Test (30 min, pass 80, max 3 attempts)
INSERT INTO lms_tests (id, course_id, title, duration_minutes, pass_grade, max_attempts, shuffle_questions, shuffle_options, open_offset_days, close_offset_days, status)
SELECT 'lms-test-seed-01', 'lms-course-seed-01', 'Contoh: Tes Akhir Audit Proses Produksi',
       30, 80, 3, false, false, 0, 7, 'Published'
WHERE NOT EXISTS (SELECT 1 FROM lms_tests WHERE id = 'lms-test-seed-01');

-- 6. Test-Questions (link all 8)
INSERT INTO lms_test_questions (test_id, question_id, sort_order)
SELECT 'lms-test-seed-01', 'lms-q-seed-01', 0
WHERE NOT EXISTS (SELECT 1 FROM lms_test_questions WHERE test_id = 'lms-test-seed-01' AND question_id = 'lms-q-seed-01');

INSERT INTO lms_test_questions (test_id, question_id, sort_order)
SELECT 'lms-test-seed-01', 'lms-q-seed-02', 1
WHERE NOT EXISTS (SELECT 1 FROM lms_test_questions WHERE test_id = 'lms-test-seed-01' AND question_id = 'lms-q-seed-02');

INSERT INTO lms_test_questions (test_id, question_id, sort_order)
SELECT 'lms-test-seed-01', 'lms-q-seed-03', 2
WHERE NOT EXISTS (SELECT 1 FROM lms_test_questions WHERE test_id = 'lms-test-seed-01' AND question_id = 'lms-q-seed-03');

INSERT INTO lms_test_questions (test_id, question_id, sort_order)
SELECT 'lms-test-seed-01', 'lms-q-seed-04', 3
WHERE NOT EXISTS (SELECT 1 FROM lms_test_questions WHERE test_id = 'lms-test-seed-01' AND question_id = 'lms-q-seed-04');

INSERT INTO lms_test_questions (test_id, question_id, sort_order)
SELECT 'lms-test-seed-01', 'lms-q-seed-05', 4
WHERE NOT EXISTS (SELECT 1 FROM lms_test_questions WHERE test_id = 'lms-test-seed-01' AND question_id = 'lms-q-seed-05');

INSERT INTO lms_test_questions (test_id, question_id, sort_order)
SELECT 'lms-test-seed-01', 'lms-q-seed-06', 5
WHERE NOT EXISTS (SELECT 1 FROM lms_test_questions WHERE test_id = 'lms-test-seed-01' AND question_id = 'lms-q-seed-06');

INSERT INTO lms_test_questions (test_id, question_id, sort_order)
SELECT 'lms-test-seed-01', 'lms-q-seed-07', 6
WHERE NOT EXISTS (SELECT 1 FROM lms_test_questions WHERE test_id = 'lms-test-seed-01' AND question_id = 'lms-q-seed-07');

INSERT INTO lms_test_questions (test_id, question_id, sort_order)
SELECT 'lms-test-seed-01', 'lms-q-seed-08', 7
WHERE NOT EXISTS (SELECT 1 FROM lms_test_questions WHERE test_id = 'lms-test-seed-01' AND question_id = 'lms-q-seed-08');

-- 7. Workshop task with 4-criteria rubric (total weight 100)
INSERT INTO lms_workshop_tasks (id, session_id, title, brief, due_date, rubric, max_score)
SELECT 'lms-ws-seed-01', '',
       'Contoh: Tugas Workshop — Rencana Audit Proses Produksi',
       'Buatlah rencana audit proses produksi untuk satu area di departemen Anda, lengkap dengan checklist dan jadwal.',
       '',
       '[{"criterion":"Kelengkapan rencana audit","weight":30,"maxScore":30},{"criterion":"Ketepatan checklist dengan proses aktual","weight":25,"maxScore":25},{"criterion":"Kelayakan jadwal audit","weight":20,"maxScore":20},{"criterion":"Identifikasi risiko dan kontrol","weight":25,"maxScore":25}]'::jsonb,
       100
WHERE NOT EXISTS (SELECT 1 FROM lms_workshop_tasks WHERE id = 'lms-ws-seed-01');
