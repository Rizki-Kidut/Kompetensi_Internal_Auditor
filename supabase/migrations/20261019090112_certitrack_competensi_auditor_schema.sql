/*
# CertiTrack Kompetensi & Training Internal Auditor — Full Schema

This migration creates the complete database schema for the "Kompetensi & Training Internal Auditor" module of CertiTrack.
The app is a single-tenant internal tool (no sign-in screen), so all tables use `TO anon, authenticated` policies
allowing the anon-key frontend to read and write its own data.

## New Tables (9 total)

1. **auditors** — Master data of internal auditors (NIK, name, section, position, status, scope, area permissions, join date).
2. **competency_items** — Master list of competency items grouped by 4 categories (QMS, Manufaktur/Shift, Produk, Supplier).
3. **competency_cells** — Matrix cells: one auditor × one competency item, with a level symbol (★◆●△ or empty).
4. **revision_logs** — Audit trail of changes to matrix/area/auditor data (mirrors the "Riwayat Revisi" table in source PDFs).
5. **auditor_requests** — Pengajuan tambah/non-aktif auditor with an approval chain stored as JSONB.
6. **auditor_history** — Archive of deactivated/resigned auditors (snapshot of last scope + competency level).
7. **training_plans** — Rencana training with target item, target level, target participants (JSONB array), priority, status.
8. **training_sessions** — Sesi pelaksanaan training linked to a plan, with participants (JSONB array) and status.
9. **training_evaluations** — Evaluasi hasil training: 6 standard scores (JSONB), optional special scores (JSONB),
   computed total/average, written test score, skill-map update (JSONB), conclusion, approval chain (JSONB), final status.

## Security

- RLS enabled on ALL tables.
- All policies use `TO anon, authenticated` with `USING (true)` / `WITH CHECK (true)` because this is a
  single-tenant internal application with NO sign-in screen — the data is intentionally shared/public.
- 4 separate policies (SELECT/INSERT/UPDATE/DELETE) per table.

## Important Notes

- `scope_auditor` and `area_audit_permission` on auditors are JSONB columns.
- `approval_chain` on requests and evaluations is JSONB (array of {role, name, status, date, note}).
- `target_participants` on plans and `participants`/`attendees` on sessions are JSONB arrays of auditor IDs.
- `scores_umum`, `scores_khusus`, `skill_map_update` on evaluations are JSONB.
- All ID columns are TEXT to preserve existing seed-data IDs (e.g. 'aud-001', 'ci-001').
*/

-- ════════════════════════════════════════════════════════════
-- 1. AUDITORS
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS auditors (
  id                    TEXT PRIMARY KEY,
  nik                   TEXT NOT NULL,
  name                  TEXT NOT NULL,
  section               TEXT NOT NULL,
  position              TEXT NOT NULL DEFAULT 'Staff',
  status                TEXT NOT NULL DEFAULT 'Aktif',
  scope_auditor         JSONB NOT NULL DEFAULT '{"qms":false,"manufakturShift":false,"produk":false,"supplier":false}',
  area_audit_permission JSONB NOT NULL DEFAULT '{}',
  join_as_auditor_date  TEXT,
  created_at            timestamptz DEFAULT now()
);

ALTER TABLE auditors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_auditors" ON auditors;
CREATE POLICY "anon_select_auditors" ON auditors FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_auditors" ON auditors;
CREATE POLICY "anon_insert_auditors" ON auditors FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_auditors" ON auditors;
CREATE POLICY "anon_update_auditors" ON auditors FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_auditors" ON auditors;
CREATE POLICY "anon_delete_auditors" ON auditors FOR DELETE TO anon, authenticated USING (true);

-- ════════════════════════════════════════════════════════════
-- 2. COMPETENCY ITEMS
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS competency_items (
  id          TEXT PRIMARY KEY,
  category    TEXT NOT NULL,
  item_name   TEXT NOT NULL,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE competency_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_competency_items" ON competency_items;
CREATE POLICY "anon_select_competency_items" ON competency_items FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_competency_items" ON competency_items;
CREATE POLICY "anon_insert_competency_items" ON competency_items FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_competency_items" ON competency_items;
CREATE POLICY "anon_update_competency_items" ON competency_items FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_competency_items" ON competency_items;
CREATE POLICY "anon_delete_competency_items" ON competency_items FOR DELETE TO anon, authenticated USING (true);

-- ════════════════════════════════════════════════════════════
-- 3. COMPETENCY CELLS (matrix)
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS competency_cells (
  auditor_id           TEXT NOT NULL,
  item_id              TEXT NOT NULL,
  level                TEXT NOT NULL DEFAULT '',
  last_updated         TEXT,
  updated_by           TEXT DEFAULT 'System',
  source_evaluation_id TEXT,
  created_at           timestamptz DEFAULT now(),
  PRIMARY KEY (auditor_id, item_id)
);

ALTER TABLE competency_cells ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_competency_cells" ON competency_cells;
CREATE POLICY "anon_select_competency_cells" ON competency_cells FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_competency_cells" ON competency_cells;
CREATE POLICY "anon_insert_competency_cells" ON competency_cells FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_competency_cells" ON competency_cells;
CREATE POLICY "anon_update_competency_cells" ON competency_cells FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_competency_cells" ON competency_cells;
CREATE POLICY "anon_delete_competency_cells" ON competency_cells FOR DELETE TO anon, authenticated USING (true);

-- ════════════════════════════════════════════════════════════
-- 4. REVISION LOGS
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS revision_logs (
  id               TEXT PRIMARY KEY,
  date             TEXT NOT NULL,
  type             TEXT NOT NULL,
  description      TEXT NOT NULL,
  revision_number  TEXT NOT NULL,
  created_at       timestamptz DEFAULT now()
);

ALTER TABLE revision_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_revision_logs" ON revision_logs;
CREATE POLICY "anon_select_revision_logs" ON revision_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_revision_logs" ON revision_logs;
CREATE POLICY "anon_insert_revision_logs" ON revision_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_revision_logs" ON revision_logs;
CREATE POLICY "anon_update_revision_logs" ON revision_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_revision_logs" ON revision_logs;
CREATE POLICY "anon_delete_revision_logs" ON revision_logs FOR DELETE TO anon, authenticated USING (true);

-- ════════════════════════════════════════════════════════════
-- 5. AUDITOR REQUESTS (pengajuan tambah/non-aktif)
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS auditor_requests (
  id             TEXT PRIMARY KEY,
  request_type   TEXT NOT NULL,
  nik            TEXT NOT NULL,
  name           TEXT NOT NULL,
  section        TEXT NOT NULL,
  position       TEXT DEFAULT 'Staff',
  initial_scope  JSONB,
  reason         TEXT NOT NULL,
  reason_detail  TEXT DEFAULT '',
  submitted_by   TEXT NOT NULL,
  submitted_date TEXT NOT NULL,
  approval_chain JSONB NOT NULL DEFAULT '[]',
  final_status   TEXT NOT NULL DEFAULT 'Pending',
  created_at     timestamptz DEFAULT now()
);

ALTER TABLE auditor_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_auditor_requests" ON auditor_requests;
CREATE POLICY "anon_select_auditor_requests" ON auditor_requests FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_auditor_requests" ON auditor_requests;
CREATE POLICY "anon_insert_auditor_requests" ON auditor_requests FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_auditor_requests" ON auditor_requests;
CREATE POLICY "anon_update_auditor_requests" ON auditor_requests FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_auditor_requests" ON auditor_requests;
CREATE POLICY "anon_delete_auditor_requests" ON auditor_requests FOR DELETE TO anon, authenticated USING (true);

-- ════════════════════════════════════════════════════════════
-- 6. AUDITOR HISTORY (arsip non-aktif/resign)
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS auditor_history (
  id                     TEXT PRIMARY KEY,
  nik                    TEXT NOT NULL,
  name                   TEXT NOT NULL,
  section                TEXT NOT NULL,
  last_scope             JSONB NOT NULL DEFAULT '{}',
  last_competency_level  TEXT DEFAULT '',
  deactivated_date       TEXT NOT NULL,
  reason                 TEXT NOT NULL,
  source_request_id      TEXT,
  created_at             timestamptz DEFAULT now()
);

ALTER TABLE auditor_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_auditor_history" ON auditor_history;
CREATE POLICY "anon_select_auditor_history" ON auditor_history FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_auditor_history" ON auditor_history;
CREATE POLICY "anon_insert_auditor_history" ON auditor_history FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_auditor_history" ON auditor_history;
CREATE POLICY "anon_update_auditor_history" ON auditor_history FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_auditor_history" ON auditor_history;
CREATE POLICY "anon_delete_auditor_history" ON auditor_history FOR DELETE TO anon, authenticated USING (true);

-- ════════════════════════════════════════════════════════════
-- 7. TRAINING PLANS
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS training_plans (
  id                 TEXT PRIMARY KEY,
  competency_item_id TEXT NOT NULL,
  target_level       TEXT NOT NULL DEFAULT '◆',
  target_participants JSONB NOT NULL DEFAULT '[]',
  reason             TEXT NOT NULL DEFAULT 'Gap Kompetensi',
  planned_date       TEXT,
  priority           TEXT NOT NULL DEFAULT 'Sedang',
  status             TEXT NOT NULL DEFAULT 'Draft',
  notes              TEXT DEFAULT '',
  created_at         timestamptz DEFAULT now()
);

ALTER TABLE training_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_training_plans" ON training_plans;
CREATE POLICY "anon_select_training_plans" ON training_plans FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_training_plans" ON training_plans;
CREATE POLICY "anon_insert_training_plans" ON training_plans FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_training_plans" ON training_plans;
CREATE POLICY "anon_update_training_plans" ON training_plans FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_training_plans" ON training_plans;
CREATE POLICY "anon_delete_training_plans" ON training_plans FOR DELETE TO anon, authenticated USING (true);

-- ════════════════════════════════════════════════════════════
-- 8. TRAINING SESSIONS
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS training_sessions (
  id           TEXT PRIMARY KEY,
  plan_id      TEXT,
  training_name TEXT NOT NULL,
  date         TEXT NOT NULL,
  organizer    TEXT DEFAULT '',
  trainer      TEXT DEFAULT '',
  participants JSONB NOT NULL DEFAULT '[]',
  attendees    JSONB NOT NULL DEFAULT '[]',
  materials    TEXT DEFAULT '',
  status       TEXT NOT NULL DEFAULT 'Terjadwal',
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE training_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_training_sessions" ON training_sessions;
CREATE POLICY "anon_select_training_sessions" ON training_sessions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_training_sessions" ON training_sessions;
CREATE POLICY "anon_insert_training_sessions" ON training_sessions FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_training_sessions" ON training_sessions;
CREATE POLICY "anon_update_training_sessions" ON training_sessions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_training_sessions" ON training_sessions;
CREATE POLICY "anon_delete_training_sessions" ON training_sessions FOR DELETE TO anon, authenticated USING (true);

-- ════════════════════════════════════════════════════════════
-- 9. TRAINING EVALUATIONS
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS training_evaluations (
  id               TEXT PRIMARY KEY,
  session_id       TEXT NOT NULL,
  auditor_id       TEXT NOT NULL,
  evaluation_date  TEXT NOT NULL,
  scores_umum      JSONB NOT NULL DEFAULT '{}',
  scores_khusus    JSONB NOT NULL DEFAULT '[]',
  total_nilai_a    NUMERIC DEFAULT 0,
  rata_rata_nilai_a NUMERIC DEFAULT 0,
  hasil_tes_tertulis NUMERIC,
  skill_map_update JSONB,
  kesimpulan       TEXT DEFAULT '',
  approval_chain   JSONB NOT NULL DEFAULT '[]',
  final_status     TEXT NOT NULL DEFAULT 'Draft',
  created_at       timestamptz DEFAULT now()
);

ALTER TABLE training_evaluations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_training_evaluations" ON training_evaluations;
CREATE POLICY "anon_select_training_evaluations" ON training_evaluations FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_training_evaluations" ON training_evaluations;
CREATE POLICY "anon_insert_training_evaluations" ON training_evaluations FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_training_evaluations" ON training_evaluations;
CREATE POLICY "anon_update_training_evaluations" ON training_evaluations FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_training_evaluations" ON training_evaluations;
CREATE POLICY "anon_delete_training_evaluations" ON training_evaluations FOR DELETE TO anon, authenticated USING (true);

-- Indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_competency_cells_auditor ON competency_cells(auditor_id);
CREATE INDEX IF NOT EXISTS idx_competency_cells_item ON competency_cells(item_id);
CREATE INDEX IF NOT EXISTS idx_training_evaluations_session ON training_evaluations(session_id);
CREATE INDEX IF NOT EXISTS idx_training_evaluations_auditor ON training_evaluations(auditor_id);
CREATE INDEX IF NOT EXISTS idx_training_sessions_plan ON training_sessions(plan_id);
CREATE INDEX IF NOT EXISTS idx_auditor_requests_status ON auditor_requests(final_status);
CREATE INDEX IF NOT EXISTS idx_revision_logs_type ON revision_logs(type);
