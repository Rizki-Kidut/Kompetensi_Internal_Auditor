# DATABASE.md

Sumber kebenaran: `supabase/migrations/`. Jangan mengedit migrasi lama; buat file baru dengan format `YYYYMMDDHHMMSS_deskripsi.sql`.

## Tabel inti (migrasi awal)
`auditors`, `competency_items`, `competency_cells`, `revision_logs`, `auditor_requests`, `auditor_history`, `training_plans`, `training_sessions`, `training_evaluations`.

Kolom tambahan dari LMS:
- `training_sessions`: `delivery_mode` (Tatap Muka | LMS | Blended, default Tatap Muka), `lms_course_id`.
- `training_evaluations`: `test_source` (Manual | LMS, default Manual), `test_attempt_id`, `workshop_score`.

## Tabel LMS
| Tabel | Isi utama |
|---|---|
| `lms_courses` | judul, `competency_item_id`, `target_level` (default ◆), `pass_grade` (default 80), status Draft/Published/Arsip |
| `lms_modules` | `course_id`, `sort_order`, `prerequisite_module_id` |
| `lms_materials` | tipe PDF/PPT/Video/Link/Teks, `url`, `content`, `doc_number`, `revision`, `effective_date` |
| `lms_questions` | tipe PG/BS/Isian/Esai/Kasus, `options` JSONB, `clause_tag`, `difficulty`, `points` — **tanpa kunci** |
| `lms_question_keys` | `question_id`, `answer` JSONB, `explanation` — RLS aktif **tanpa policy** |
| `lms_tests` | durasi, `pass_grade`, `max_attempts`, acak soal/opsi, `open_offset_days`, `close_offset_days` |
| `lms_test_questions` | relasi tes-soal + urutan |
| `lms_enrollments` | `session_id`, `course_id`, `auditor_id`, `progress`, `completed_modules`, status |
| `lms_attempts` | jawaban, `auto_score`, `manual_score`, `final_score`, `passed`, status Berjalan/Menunggu Penilaian/Dinilai |
| `lms_workshop_tasks` | per sesi; `rubric` JSONB (kriteria, bobot total 100), `max_score` |
| `lms_submissions` | file/URL, `rubric_scores`, `score`, `feedback`, `assessor`, status Dikirim/Dinilai |

## RPC (SECURITY DEFINER, `search_path = public`)
| Fungsi | Tugas |
|---|---|
| `lms_upsert_question(p_question, p_key)` | simpan soal dan kunci |
| `lms_get_question_key(p_question_id)` | ambil kunci untuk form edit admin (TODO: batasi ke admin) |
| `lms_start_attempt(p_test_id, p_session_id, p_auditor_id)` | validasi enrollment, jendela waktu, `max_attempts`; buat attempt |
| `lms_get_test_questions(p_attempt_id)` | soal tanpa kunci, diacak sesuai pengaturan |
| `lms_submit_attempt(p_attempt_id, p_answers)` | nilai otomatis PG/BS/Isian; esai -> Menunggu Penilaian |
| `lms_create_draft_evaluation(p_session_id, p_auditor_id)` | buat/timpa draft evaluasi (hanya bila masih Draft); tidak menulis `competency_cells` |

**Belum ada:** `lms_grade_attempt(p_attempt_id, p_manual_scores)` untuk menilai esai di server (P0-1).

## Keadaan RLS saat ini
Semua tabel (lama dan LMS) memakai policy `TO anon, authenticated USING (true)` untuk select/insert/update/delete, kecuali `lms_question_keys` (tanpa policy). Artinya siapa pun yang memegang anon key dapat membaca dan mengubah hampir semua data, termasuk `lms_attempts.final_score` dan `training_evaluations.hasil_tes_tertulis`. Rencana perbaikan ada di `SECURITY.md`.

## Konvensi
- ID bertipe TEXT; kolom fleksibel JSONB; nama kolom snake_case.
- Migrasi aditif dan idempotent. Cek kolom lewat `information_schema.columns` harus menyertakan `table_schema = 'public'`.
- Data contoh (kursus "Contoh: Audit Proses Produksi", `ci-lms-seed-01`, dst.) saat ini ada di dalam migrasi fondasi; pindahkan ke `supabase/seed/` (P0-4).
- Index sudah ada untuk kolom relasi utama LMS; tambahkan bila menambah query baru yang berat.
