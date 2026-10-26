# SECURITY.md

## Kondisi saat ini
- Tidak ada login. Aplikasi memakai Supabase anon key yang tertanam di frontend (memang publik).
- Semua tabel memakai policy `TO anon, authenticated USING (true)`. Siapa pun yang memegang anon key dapat membaca dan menulis hampir semua data lewat REST API, tanpa lewat UI.
- Peran LMS (`useLmsRole`) hanya kondisi tampilan di browser, bukan kontrol akses.
- `lms_question_keys` benar-benar terkunci (RLS tanpa policy). Namun `lms_get_question_key` dapat dipanggil siapa saja yang bisa memanggil RPC, sehingga kunci tetap bisa dibaca sampai fungsi itu dibatasi ke admin.

## Risiko utama
| Risiko | Dampak | Perbaikan |
|---|---|---|
| Penilaian esai dihitung di klien dan ditulis langsung ke `lms_attempts` | Nilai dan status lulus bisa dipalsukan | P0-1, P0-2 |
| Update langsung ke `lms_submissions` dan `training_evaluations` | Nilai workshop/tes tertulis bisa diubah, ikut memengaruhi matrix | P0-2, P1-1 |
| Rute `/lms/admin/*` tanpa guard | Auditor bisa membuka halaman admin lewat URL | P0-3 |
| `getPublicUrl` untuk bucket `lms-submissions` | Hasil kerja auditor dapat diakses publik lewat URL | P0-5 |
| Data contoh di migrasi | Data uji ikut masuk produksi | P0-4 |
| `lms_get_question_key` terbuka | Kunci jawaban bocor | P1-1 |

## Perbaikan sementara (sebelum Supabase Auth)
Gunakan hak akses kolom Postgres supaya klien tidak bisa menulis skor langsung:
```
REVOKE INSERT, UPDATE ON lms_attempts FROM anon, authenticated;
-- attempt hanya dibuat/diubah oleh RPC SECURITY DEFINER (lms_start_attempt, lms_submit_attempt, lms_grade_attempt)
REVOKE UPDATE ON lms_submissions FROM anon, authenticated;
GRANT  UPDATE (file_url, note, submitted_at, status) ON lms_submissions TO anon, authenticated;
-- skor, rubric_scores, feedback, assessor hanya lewat RPC lms_grade_submission
```
Syaratnya: tidak ada lagi update langsung dari store (`updateAttempt`, `updateSubmission`) pada kolom tersebut. Uji dulu di staging; ini menutup pemalsuan skor tetapi tidak menggantikan login.

## Rancangan target (usulan, butuh persetujuan pemilik)
1. **Login:** Supabase Auth (email atau NIK yang dipetakan ke email).
2. **Peran dan identitas:** tabel `app_users(user_id uuid pk references auth.users, role text check (role in ('admin','assessor','auditor','manager')), auditor_id text references auditors(id))`. Fungsi bantu `app_role()` dan `app_auditor_id()` (SECURITY DEFINER, stabil).
3. **RLS per tabel:** auditor hanya melihat dan mengubah baris dengan `auditor_id = app_auditor_id()`; admin/assessor penuh; tabel kursus/modul/materi/soal/tes bisa dibaca semua yang login tetapi hanya admin yang menulis; `lms_question_keys` tanpa policy.
4. **RPC:** tambahkan pengecekan `app_role()` dan `app_auditor_id()` di dalam fungsi; `lms_get_question_key` hanya admin; `lms_start_attempt` memaksa `p_auditor_id = app_auditor_id()` untuk auditor; cabut `GRANT ... TO anon`.
5. **Storage:** bucket private, akses lewat signed URL, path `<sessionId>/<auditorId>/...` dengan policy sesuai pemilik.
6. **Frontend:** halaman login, penyimpanan sesi, `router.beforeEach` berbasis peran, hapus switcher peran draft.
7. **Tabel lama** (matrix, evaluasi, approval) ikut dikunci dengan pola yang sama setelah LMS stabil.

## Aturan untuk agen
- Jangan pernah menaruh service-role key di repo atau frontend. Hanya anon key yang boleh ada di `.env`.
- Jangan menambah policy `USING (true)` baru untuk tabel yang memuat nilai atau kunci.
- Jangan mengirim kunci jawaban ke klien dalam bentuk apa pun kecuali RPC admin.
- Jangan mencatat data pribadi atau token di `console.*`.
