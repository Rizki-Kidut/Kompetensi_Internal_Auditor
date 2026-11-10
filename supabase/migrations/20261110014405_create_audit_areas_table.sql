/*
# Create audit_areas table

1. New Tables
- `audit_areas`
  - `id` (text, primary key) stable identifier
  - `name` (text, unique, not null) area name shown in the auditor grid
  - `sort_order` (integer, not null, default 0) display order
  - `created_at` (timestamptz, default now())
2. Seed data
- Inserts the five existing areas with stable ids so re-running is safe.
3. Security
- RLS enabled. The app has no sign-in, so anon and authenticated roles get full CRUD, matching the other master tables.
*/

CREATE TABLE IF NOT EXISTS audit_areas (
  id text PRIMARY KEY,
  name text UNIQUE NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE audit_areas ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON audit_areas TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_audit_areas" ON audit_areas;
CREATE POLICY "anon_select_audit_areas" ON audit_areas FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_audit_areas" ON audit_areas;
CREATE POLICY "anon_insert_audit_areas" ON audit_areas FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_audit_areas" ON audit_areas;
CREATE POLICY "anon_update_audit_areas" ON audit_areas FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_audit_areas" ON audit_areas;
CREATE POLICY "anon_delete_audit_areas" ON audit_areas FOR DELETE
  TO anon, authenticated USING (true);

INSERT INTO audit_areas (id, name, sort_order) VALUES
  ('area-seed-01', 'Area Produksi A', 1),
  ('area-seed-02', 'Area Produksi B', 2),
  ('area-seed-03', 'Gudang RM', 3),
  ('area-seed-04', 'Gudang FG', 4),
  ('area-seed-05', 'Maintenance', 5)
ON CONFLICT (id) DO NOTHING;
