# AGENT_PROMPTS.md — Urutan prompt untuk menyelesaikan POLISH_BACKLOG

Setiap blok kode di bawah adalah **satu prompt = satu sesi agen = satu branch/PR**. Prompt sengaja pendek karena detail ada di `AGENTS.md`, `PROJECT.md`, dan `docs/*`. Kerjakan berurutan.

## Cara pakai
1. Salin paket dokumen ke root repo, commit, push, lalu pastikan agen bekerja di folder repo yang sudah berisi dokumen terbaru.
2. Jalankan **Sesi 0** lebih dulu. Ia menyesuaikan dokumen dengan fakta bahwa database Supabase sudah berjalan.
3. Agen **tidak** menjalankan SQL ke Supabase. Ia menulis file migrasi dan SQL verifikasi/rollback; kamu yang menerapkannya (SQL Editor Supabase atau `supabase db push`), idealnya di Supabase branch/staging, atau di project utama setelah backup.
4. Untuk perubahan database yang bisa memutus aplikasi, urutannya selalu: **(a)** terapkan migrasi aditif, **(b)** deploy frontend baru, **(c)** baru terapkan migrasi pengunci.
5. Setelah tiap sesi, jalankan skenario terkait di `docs/TESTING.md` dan tandai item selesai di `docs/POLISH_BACKLOG.md`.

## Pengaturan Abacus AI Agent (disarankan)

### A. Web (SuperComputer) — hanya jika paketmu mencakup SuperComputer
SuperComputer di web bisa bekerja seperti Codex **asal** repo ada di workspace-nya dan agen menjalankan perintah di sana. Langkahnya:
1. Hubungkan akun GitHub di SuperComputer (sekali saja). Di GitHub > Settings > Applications, batasi akses Abacus ke repo ini bila opsinya ada.
2. Di GitHub, aktifkan **branch protection** untuk `main` (wajib pull request, larang push langsung). Dengan begitu agen hanya bisa menyodorkan branch `agent/*`, dan kamu yang memutuskan merge.
3. Pastikan konektor **Supabase MCP** dalam mode **read-only** dan terbatas ke satu project. Agen hanya membaca skema/policy; semua SQL tulis dijalankan oleh kamu.
4. Mulai setiap sesi dengan **percakapan baru** dan tempel dulu blok "Persiapan sesi" di bawah, baru prompt sesinya. Di web, `AGENTS.md` belum tentu dimuat otomatis seperti di Desktop/CLI, jadi agen harus diperintahkan membacanya.
5. Pilih model dan tingkat penalaran tertinggi yang tersedia untuk Sesi 1, 2, 5, dan 6 (database dan keamanan); tingkat rendah cukup untuk sesi dokumentasi dan kebersihan.
6. Alternatif yang lebih mirip Codex: buka terminal SuperComputer (atau SSH) di folder repo, lalu jalankan `abacusai` (CLI). CLI memuat `AGENTS.md` otomatis.

Persiapan sesi (tempel di awal setiap sesi, sebelum prompt sesi):
```
PERSIAPAN SESI
1. Pastikan koneksi GitHub aktif. Clone https://github.com/Rizki-Kidut/Kompetensi_Internal_Auditor ke workspace; jika sudah ada, jalankan git fetch, git checkout main, git pull.
2. Buat branch baru agent/<id-sesi> dari main terbaru (contoh: agent/p0-1).
3. Baca AGENTS.md, PROJECT.md, dan dokumen di docs/ yang disebut prompt sesi sebelum mengubah file apa pun.
4. Jalankan npm ci lalu npm run build sebagai baseline; laporkan hasilnya.
5. Akses Supabase hanya untuk membaca (SELECT pada information_schema/pg_catalog). Jangan menjalankan DDL/DML, apply_migration, atau perintah tulis lain. Jika MCP ternyata bisa menulis, berhenti dan beri tahu saya.
6. Setelah selesai: npm run build, git diff --stat, commit, push ke branch agent/<id-sesi> SAJA, lalu laporkan ringkasan perubahan dan tautan untuk membuat pull request. Jangan merge dan jangan push ke main.
```

### B. Abacus Desktop / CLI (lokal)
- Pakai mode Code Editor atau CLI (`abacusai`) dengan folder repo sebagai workspace. `AGENTS.md` di root dimuat otomatis untuk setiap permintaan di workspace (menurut dokumentasi Abacus). Jangan bergantung pada folder `.deepagent-desktop/rules/`: ada laporan di GitHub Abacus bahwa folder itu tidak termuat.
- Biarkan **mode izin Normal** (agen meminta persetujuan); jangan pakai mode auto-approve/bypass pada sesi database atau Git.
- Pastikan Supabase CLI di komputermu **tidak sedang login/link** ke project produksi, dan `.env` hanya berisi anon key.
- Batas waktu shell bawaan 120 detik (bisa diubah lewat `bashToolTimeoutMs`, maksimum 600). Jalankan `npm ci` sendiri sebelum sesi pertama.
- Mulai tiap sesi dengan percakapan baru (`/new` di CLI) dan tempel hanya satu prompt per sesi.

### C. Setelah tiap sesi
Periksa `git diff` pada branch `agent/*`, jalankan skenario terkait di `docs/TESTING.md`, terapkan migrasi SQL sendiri (urutan ada di laporan agen), baru merge pull request.

### D. Abacus Basic: mode chat hemat kredit (tempel-diff)
Paket Basic membatasi Abacus AI Agent (sekitar 3 tugas per bulan dengan kompleksitas terbatas) dan memberi 20.000 kredit per bulan. Chat biasa (ChatLLM) tidak dibatasi seperti agen, jadi jadikan chat jalur utama dan simpan tugas agen untuk pekerjaan yang memang butuh banyak file dan build berulang. Cek sisa kuota agen dan kredit di akunmu sebelum mulai.

**Alur per sesi**
1. Di root repo (Git Bash/WSL di Windows): `bash scripts/context-pack.sh P0-1 > pack.txt` (ganti ID sesuai backlog). Skrip mengumpulkan aturan ringkas (`docs/CHAT_RULES.md`), item backlog, prompt sesi, dan **hanya** potongan kode/SQL yang relevan, lalu mencetak perkiraan ukuran. Tambahkan `--full` bila ingin `AGENTS.md` lengkap; untuk P2-1 beri path file sebagai argumen kedua.
2. Buka percakapan **baru**, tempel isi `pack.txt`. Jika model meminta file lain, tempel hanya file itu.
3. Di komputermu: `git switch -c agent/<id>`, `git apply` diff dari model, lalu `npm run build`. Bila gagal, tempel hanya 30 baris pertama error ke percakapan yang sama.
4. Untuk migrasi: jalankan SQL di Supabase SQL Editor (staging atau setelah backup), lalu tempel hasil verifikasinya.
5. Commit, push branch, buka PR, tandai item di `docs/POLISH_BACKLOG.md`.

**Menghemat kredit**
- Satu item = satu percakapan baru. Percakapan panjang umumnya makin mahal karena konteks dikirim ulang.
- Pakai model terkuat hanya untuk P0 dan Sesi 6; model hemat atau mode Auto untuk dokumentasi, UI, dan refactor mekanis.
- Minta diff saja, tanpa mencetak ulang file dan tanpa penjelasan panjang (sudah ada di format jawaban skrip).
- Jalankan build dan SQL sendiri; jangan minta model "mensimulasikan" hasilnya.
- Item kecil yang tidak saling bergantung (mis. P0-3 dan P1-3) boleh digabung satu percakapan; item database jangan digabung.

**Rencana pemakaian Basic**
| Tahap | Item | Cara |
|---|---|---|
| 1 | P0-1, P0-2, P0-3, P0-4, P0-5 | chat; P0-1, P0-2, P0-5 dengan model terkuat |
| 2 | Sesi 6 (login + RLS), kerjakan 6a -> 6d satu per satu | chat, model terkuat; sertakan proposal keamanan v3.2 milikmu |
| 3 | P1-2, P1-3, P1-5, P1-4 | chat |
| 4 | P1-7, P1-6, P2-2 | tugas agen (jika kuota masih ada): banyak file dan build berulang |
| 5 | Sesi 17 (regresi dan status akhir) | satu tugas agen sebagai penutup, atau chat bila kuota habis |
| 6 | P2-1, P2-3, P2-4, P2-5 | hanya bila kredit tersisa |

Tanpa skrip, tempel blok ini sebelum prompt sesi:
```
MODE CHAT (tanpa akses repo)
Aku menempelkan file yang relevan di bawah. Jangan mengarang isi file yang belum kutempel; minta file yang kurang. Ikuti aturan yang kutempel. Berikan perubahan sebagai unified diff per file (siap git apply), atau file utuh untuk file baru. Untuk database: satu file migrasi baru + SQL verifikasi + SQL rollback. Di akhir tuliskan perintah yang harus kujalankan (git apply, npm run build) dan apa yang harus kutempel balik bila build gagal.
```

### E. Codex cloud (paket ChatGPT)
Prompt di dokumen ini awalnya ditulis untuk model kerja seperti ini.
1. Hubungkan GitHub di Codex cloud dan pilih repo ini. Pastikan paket ChatGPT-mu mencakup fitur cloud (cek halaman Pricing Codex).
2. Buat environment dengan setup script `npm ci`. Biarkan akses internet agen mati atau dibatasi saat tugas berjalan, dan jangan memasukkan secret apa pun (build tidak memerlukan service-role key).
3. `AGENTS.md` di root dibaca otomatis. Tidak perlu blok "Persiapan sesi"; tempel prompt sesinya saja. Satu sesi = satu task = satu pull request.
4. Agen cloud tidak punya akses database, jadi aturan "boleh membaca lewat Supabase MCP" tidak berlaku. Untuk Sesi 1, 2, 5, dan 6, jalankan sendiri kueri katalog yang diminta agen (policy, grant, isi fungsi) di Supabase SQL Editor dan tempel hasilnya ke task.
5. Kamu meninjau PR, menjalankan SQL migrasi sendiri sesuai urutan di laporan agen, lalu merge.

## Urutan yang disarankan
| Sesi | Item | Jenis | Catatan |
|---|---|---|---|
| 0 | Persiapan dokumen | docs | opsional; lewati bila memakai paket dokumen terbaru |
| 1 | P0-1 | DB + frontend | RPC penilaian esai |
| 2 | P0-2 | DB (2 migrasi) + frontend | migrasi pengunci diterapkan terakhir |
| 3 | P0-3 | frontend | guard rute |
| 4 | P0-4 (revisi) | docs + SQL manual | tidak mengubah migrasi lama |
| 5 | P0-5 | DB + frontend | bucket dan upload |
| 6a-6d | P1-1 | DB + frontend | **butuh keputusan login**; kerjakan segera setelah P0 |
| 7 | P1-2 | frontend | status sesi otomatis |
| 8 | P1-3 | frontend | peringkat level |
| 9 | P1-7 | frontend | modal konfirmasi |
| 10 | P1-6 | frontend | penanganan error |
| 11 | P1-5 | audit + perbaikan | aturan tes |
| 12 | P1-4 | frontend | hasil LMS di kartu riwayat dan dashboard |
| 13 | P2-2 | repo | kebersihan |
| 14 | P2-3 | tooling | test dan lint |
| 15 | P2-1 | refactor | satu file per sesi |
| 16 | P2-4, P2-5 | frontend | aksesibilitas dan impor Excel |
| 17 | Penutup | docs | regresi dan status akhir |

> Catatan penting: setelah Sesi 1-2, perhitungan nilai sudah di server, tetapi **siapa pun yang memegang anon key masih bisa memanggil RPC penilaian** sampai P1-1 (login + RLS) selesai. Jangan menganggap sistem aman untuk tes bernilai tinggi sebelum Sesi 6.

---

## Sesi 0 — Persiapan dokumen (database sudah berjalan) — opsional
Lewati sesi ini bila kamu memakai paket dokumen terbaru: `AGENTS.md` sudah memuat aturan database, dan P0-4 di `docs/POLISH_BACKLOG.md` sudah bertuliskan "revisi". Pakai hanya bila dokumen di repo masih versi lama.
```
Tugas persiapan dokumentasi. Jangan mengubah kode aplikasi di src/ dan jangan menyentuh supabase/migrations. Bekerja di branch baru agent/sesi-0; push hanya ke branch itu, bukan ke main.

Konteks: project Supabase proyek ini sudah berjalan dan semua file di supabase/migrations (sampai 20261026035710) sudah diterapkan. Kamu tidak boleh menulis apa pun ke database; membaca lewat Supabase MCP read-only diperbolehkan (lihat AGENTS.md).

1. Periksa AGENTS.md: harus memuat bagian "Database Supabase yang sudah berjalan" dan "Batas keselamatan agen lokal" (termasuk aturan Supabase MCP read-only). Jika salah satunya tidak ada, hentikan dan beri tahu pemilik (jangan menulis ulang dengan kata-katamu sendiri).
2. Di docs/POLISH_BACKLOG.md, ganti seluruh isi P0-4 dengan:
"P0-4 Kebersihan migrasi dan data contoh (revisi: database sudah berjalan)
- Jangan mengganti nama atau mengedit migrasi lama.
- Buat supabase/maintenance/remove_lms_sample_data.sql (bukan migrasi) untuk dijalankan manual sebelum produksi: hapus hanya baris contoh yang ID-nya dibuat di migrasi fondasi (turunkan daftar ID dengan membaca migrasi itu); bungkus dalam transaksi; tampilkan jumlah baris sebelum dan sesudah; hapus competency_items 'ci-lms-seed-01' hanya jika tidak dirujuk competency_cells, training_plans, atau lms_courses lain.
- Catat di docs/DATABASE.md nama file migrasi yang berlapis dan perilaku seed, tanpa mengubah file aslinya.
- Selesai bila: skrip dapat dibaca dan aman (tidak menyentuh data non-contoh), dan DATABASE.md memuatnya."
3. Di docs/DATABASE.md bagian "Konvensi", ganti butir tentang memindahkan seed dengan rujukan ke skrip maintenance di atas.
4. Pastikan .gitignore memuat dist/ dan *.tsbuildinfo (jangan menghapus file yang sudah ter-track; itu bagian P2-2).
5. Jalankan npm run build (jika npm ci belum dijalankan dan terpotong batas waktu, laporkan saja). Commit: "docs: sesuaikan dokumen dengan database yang sudah berjalan", push ke agent/sesi-0, lalu laporkan.
```

## Sesi 1 — P0-1 Penilaian esai di server
```
Baca AGENTS.md, PROJECT.md, dan item P0-1 di docs/POLISH_BACKLOG.md. Kerjakan HANYA P0-1.

Tujuan: final_score dan passed untuk tes berisi Esai/Kasus dihitung di server, bukan di browser.

Langkah:
1. Baca dulu migrasi fondasi LMS (tabel lms_attempts, lms_tests, lms_questions, lms_test_questions; fungsi lms_submit_attempt) dan migrasi lms_create_draft_evaluation, supaya nama kolom, status, dan format hasil identik.
2. Buat migrasi BARU <timestamp>_lms_grade_attempt_rpc.sql berisi fungsi lms_grade_attempt(p_attempt_id text, p_manual_scores jsonb) returns jsonb, SECURITY DEFINER, set search_path = public:
   - RAISE EXCEPTION (pesan Indonesia) bila attempt tidak ada atau statusnya bukan 'Menunggu Penilaian';
   - hanya terima kunci question_id yang termasuk tes attempt itu dan bertipe Esai/Kasus; nilai harus numerik dan 0 <= nilai <= points soal;
   - manual_score = jumlah nilai valid; final_score = round((auto_score + manual_score) / total_poin_tes * 100, 2); passed = final_score >= lms_tests.pass_grade; status 'Dinilai';
   - bila passed, panggil lms_create_draft_evaluation(session_id, auditor_id) di dalam fungsi;
   - return jsonb {final_score, passed, manual_score};
   - REVOKE dari PUBLIC, GRANT EXECUTE ke anon dan authenticated, dengan komentar "TODO(P1-1): batasi ke admin/assessor".
3. Frontend: ubah gradeAttempt di src/stores/lmsEnrollmentStore.js menjadi satu panggilan supabase.rpc('lms_grade_attempt', ...). Pertahankan signature dan bentuk return {final_score, passed} agar AdminPenilaian.vue tidak perlu berubah; muat ulang daftar attempt setelah sukses; ubah error RPC menjadi pesan yang layak ditampilkan toast. Hapus perhitungan klien dan query ke lms_questions/lms_tests/lms_test_questions dari fungsi itu, serta panggilan klien ke lms_create_draft_evaluation untuk jalur ini.
4. Disarankan: dalam migrasi yang sama, CREATE OR REPLACE lms_submit_attempt dengan isi lama persis ditambah panggilan lms_create_draft_evaluation saat lulus tanpa esai; lalu hapus panggilan klien yang setara di lmsTestStore.submitAttempt. Jangan mengubah perilaku lain fungsi itu.
5. Attempt lama yang berstatus 'Menunggu Penilaian' di database harus tetap bisa dinilai; jangan menambah syarat kolom baru.
6. Perbarui docs/DATABASE.md (daftar RPC, hapus catatan "belum ada") dan tandai P0-1 selesai di POLISH_BACKLOG.md.

Output akhir wajib: nama file migrasi, SQL verifikasi (nilai di atas points harus ditolak; attempt uji harus 'Dinilai' dengan final_score benar), SQL rollback, hasil npm run build, dan catatan bahwa fungsi belum membatasi pemanggil sampai P1-1.
```

## Sesi 2 — P0-2 Penilaian workshop via RPC dan pengunci hak tulis
```
Baca AGENTS.md, PROJECT.md, docs/SECURITY.md ("Perbaikan sementara"), dan item P0-2 di docs/POLISH_BACKLOG.md. Kerjakan HANYA P0-2.

Tujuan: skor workshop dan skor attempt tidak bisa ditulis langsung oleh klien.

Langkah:
1. Audit: cari semua penggunaan .from('lms_attempts') dan .from('lms_submissions') di src/. Buat tabel di deskripsi PR: operasi (select/insert/update/delete), file, kolom yang ditulis, dan apakah tetap diperlukan klien.
2. Migrasi A (aditif) <timestamp>_lms_grade_submission_rpc.sql: fungsi lms_grade_submission(p_submission_id text, p_rubric_scores jsonb, p_feedback text, p_assessor text) returns jsonb, SECURITY DEFINER, search_path = public. Validasi kunci rubrik terhadap lms_workshop_tasks.rubric dan nilai <= skor maksimal kriteria; hitung score; set status 'Dinilai'; lalu panggil lms_create_draft_evaluation(session_id, auditor_id) (fungsi itu sendiri yang memeriksa syarat tes lulus dan semua tugas dinilai). GRANT ke anon dan authenticated dengan TODO(P1-1).
3. Frontend: tambahkan gradeSubmission di lmsWorkshopStore.js (RPC) dan pakai di AdminPenilaian.vue; hapus panggilan klien ke lms_create_draft_evaluation di lmsWorkshopStore.js. updateSubmission hanya boleh dipakai auditor untuk mengirim/mengirim ulang (file_url/path, note, submitted_at).
4. Migrasi B (pengunci) <timestamp+1>_lms_lock_direct_writes.sql, baris pertama komentar: "JANGAN diterapkan sebelum frontend dari Sesi 1 dan 2 ter-deploy". Isi: klien (anon, authenticated) tidak boleh INSERT/UPDATE/DELETE langsung pada lms_attempts; pada lms_submissions klien hanya boleh mengirim/mengirim ulang (file_url/path, note, submitted_at) dan tidak boleh mengisi atau mengubah score, rubric_scores, feedback, assessor, maupun mengubah status menjadi 'Dinilai'. Gunakan hak akses kolom dan/atau trigger BEFORE INSERT/UPDATE yang memeriksa current_user; pastikan fungsi SECURITY DEFINER tetap berjalan. Sesuaikan dengan hasil audit langkah 1 (jangan memblokir operasi yang masih dipakai aplikasi).
5. Sertakan skrip rollback untuk migrasi B (GRANT ulang seperti semula).
6. Perbarui docs/DATABASE.md dan docs/SECURITY.md; tandai P0-2 selesai.

Output akhir wajib: nama file, urutan menjalankan (A -> deploy frontend -> B), SQL verifikasi termasuk uji curl PATCH ke lms_attempts yang harus ditolak setelah B, SQL rollback, hasil npm run build.
```

## Sesi 3 — P0-3 Guard rute berdasarkan peran
```
Baca AGENTS.md dan item P0-3 di docs/POLISH_BACKLOG.md. Kerjakan HANYA P0-3. Hanya frontend.

Langkah:
1. Tambahkan meta: { roles: [...] } pada rute LMS di src/router/index.js (/lms/admin/* hanya Admin dan Assessor; rute /lms/* lain untuk Auditor, boleh juga dilihat Admin). Jangan menambahkan guard ke rute non-LMS.
2. Tambahkan router.beforeEach yang membaca useLmsRole (state module-level, jadi aman dipakai di luar komponen). Bila ditolak, arahkan ke /lms/kursus untuk Auditor atau ke halaman "Akses Ditolak" baru (src/modules/lms/views/AksesDitolak.vue, memakai ct-card dan pola halaman standar).
3. Halaman auditor (KursusSaya, JadwalSaya, TesTertulis, WorkshopSaya, HasilSertifikat, KursusDetail) menampilkan keadaan kosong yang jelas bila peran Auditor aktif tetapi auditor belum dipilih, dengan petunjuk memilih "Sebagai auditor" di sidebar.
4. Simpan pilihan peran dan auditor draft di sessionStorage supaya tidak hilang saat refresh (tetap beri komentar bahwa ini draft sampai P1-1).
5. Perbarui docs/ARCHITECTURE.md bagian Routing; tandai P0-3 selesai.

Selesai bila skenario S10 di docs/TESTING.md lulus dan npm run build lulus.
```

## Sesi 4 — P0-4 (revisi) Skrip pembersihan data contoh
```
Baca AGENTS.md (termasuk bagian "Database Supabase yang sudah berjalan") dan item P0-4 (versi revisi) di docs/POLISH_BACKLOG.md. Kerjakan HANYA P0-4.

1. Baca migrasi fondasi LMS dan kumpulkan semua ID data contoh (competency_items, lms_courses, lms_modules, lms_materials, lms_questions, lms_question_keys, lms_tests, lms_test_questions, lms_workshop_tasks). Jangan menebak: tulis daftar ID yang kamu temukan di deskripsi PR.
2. Buat supabase/maintenance/remove_lms_sample_data.sql: transaksi (BEGIN/COMMIT), hitung baris sebelum dan sesudah per tabel (SELECT), hapus hanya ID contoh tadi, dan hapus competency item contoh hanya bila tidak dirujuk tabel lain (periksa kolom referensinya di skema). Hapus juga enrollment, attempt, submission, dan evaluasi yang merujuk kursus/tes/tugas contoh; tulis daftar tabel itu di komentar.
3. Buat supabase/maintenance/README.md berisi kapan skrip dijalankan dan peringatan agar dicadangkan dulu.
4. Perbarui docs/DATABASE.md sesuai Sesi 0. Jangan menyentuh supabase/migrations.

Output akhir: isi ringkas skrip, SQL verifikasi (hitungan harus 0 untuk ID contoh), hasil npm run build (seharusnya tidak berubah).
```

## Sesi 5 — P0-5 Storage: bucket, upload materi, path + signed URL
```
Baca AGENTS.md dan item P0-5 di docs/POLISH_BACKLOG.md. Kerjakan HANYA P0-5.

Konteks: bucket mungkin sudah dibuat manual di project Supabase (mungkin publik) dan tabel lms_submissions mungkin sudah berisi URL publik lama di kolom file_url. Jangan merusak data itu.

Langkah:
1. Migrasi <timestamp>_lms_storage_buckets.sql, idempotent: insert ke storage.buckets untuk 'lms-materials' dan 'lms-submissions' dengan ON CONFLICT DO UPDATE SET public = false, batas ukuran file dan allowed_mime_types yang wajar (PDF, PPT/PPTX, gambar, video mp4, DOC/DOCX, XLS/XLSX). Policy storage.objects dengan DROP POLICY IF EXISTS lalu CREATE POLICY, per bucket. Karena belum ada login, policy sementara mengizinkan anon select/insert dengan komentar "TODO(P1-1): batasi per peran dan pemilik path".
2. Konvensi path: lms-materials/<courseId>/<moduleId>/<timestamp>-<namaFile>; lms-submissions/<sessionId>/<auditorId>/<taskId>-<timestamp>-<namaFile>. Simpan PATH di database (kolom url/file_url), bukan URL publik.
3. Buat helper src/services/storageService.js: uploadFile(bucket, path, file) dengan validasi tipe dan ukuran, getSignedUrl(bucket, pathOrLegacyUrl, expiresIn), dan resolveStoragePath yang mengenali URL publik lama (https://.../storage/v1/object/public/<bucket>/<path>) lalu mengambil path-nya, sehingga data lama tetap terbuka.
4. WorkshopSaya.vue: ganti getPublicUrl dengan penyimpanan path + signed URL saat menampilkan. AdminWorkshop.vue/AdminPenilaian.vue: tampilkan berkas lewat signed URL.
5. AdminKursusMateri.vue: tambahkan input upload file pada form materi (tipe PDF/PPT/Video) selain opsi URL; tampilkan progres dan pesan error; KursusDetail.vue membuka materi lewat signed URL (PDF di iframe, video di elemen video).
6. Perbarui docs/DATABASE.md dan docs/SECURITY.md; tandai P0-5 selesai.

Output akhir wajib: nama migrasi, SQL verifikasi (bucket private; query pada storage.buckets), SQL rollback, hasil npm run build, dan catatan bahwa tanpa login (sebelum P1-1) anon masih bisa membuat signed URL, jadi perlindungan penuh baru ada setelah P1-1.
```

---

## Sesi 6 — P1-1 Supabase Auth + RLS (4 sesi)

**Sebelum mulai, putuskan dan edit baris "Asumsi" di bawah bila berbeda.** Asumsi bawaan: login email + password; pendaftaran mandiri dimatikan, akun dibuat admin lewat dashboard Supabase; peran `admin`, `assessor`, `auditor`, `manager` (manager = persetujuan di Approval Center); identitas auditor dipetakan lewat `app_users.auditor_id`.

### 6a — Tabel peran dan fungsi bantu (aditif)
```
Baca AGENTS.md, docs/SECURITY.md ("Rancangan target"), dan item P1-1 di docs/POLISH_BACKLOG.md. Kerjakan HANYA 6a (migrasi aditif, belum ada perubahan perilaku).

Asumsi: login email+password Supabase Auth; peran admin|assessor|auditor|manager; satu pengguna memetakan satu auditor (nullable untuk admin).

1. Migrasi <timestamp>_app_users_and_helpers.sql: tabel app_users(user_id uuid primary key references auth.users(id) on delete cascade, role text not null check (role in ('admin','assessor','auditor','manager')), auditor_id text references auditors(id), created_at timestamptz default now()); RLS aktif; policy: pengguna login boleh select baris miliknya sendiri, admin boleh semua.
2. Fungsi SECURITY DEFINER STABLE, search_path = public: app_role() dan app_auditor_id() (null bila tidak login), serta is_staff() (admin atau assessor).
3. Buat supabase/maintenance/seed_app_users.sql sebagai TEMPLATE dengan placeholder (email, role, auditor_id) dan penjelasan cara membuat pengguna di dashboard Supabase lalu mengisinya. Jangan menaruh data nyata.
4. Perbarui docs/SECURITY.md dan docs/DATABASE.md. Jangan mengubah frontend.

Output akhir: urutan menjalankan, SQL verifikasi (user tanpa baris app_users -> app_role() null), SQL rollback.
```

### 6b — Login di frontend
```
Baca AGENTS.md dan docs/SECURITY.md. Kerjakan HANYA 6b (frontend). Migrasi 6a sudah diterapkan oleh pemilik.

1. Tambahkan src/stores/authStore.js (Pinia): session, profile (baris app_users), signIn(email, password), signOut, restoreSession (onAuthStateChange); tampilkan error dalam bahasa Indonesia.
2. Halaman login src/modules/auth/views/Login.vue memakai pola halaman dan class yang ada (ct-card, ct-input, btn-primary); tanpa pendaftaran mandiri.
3. Ganti sumber peran: useLmsRole membaca peran dan auditorId dari authStore (peran 'manager' diperlakukan seperti auditor untuk LMS). Hapus switcher peran draft di SidebarLayout.vue dan tampilkan nama pengguna + tombol Keluar.
4. router.beforeEach: semua rute (selain /login) butuh sesi; guard peran dari P0-3 memakai peran dari authStore. Jangan mengubah perilaku halaman lama selain terkena guard login.
5. Semua pemanggilan yang memakai auditorId manual di halaman auditor LMS memakai auditorId dari profil login.
6. Perbarui docs/ARCHITECTURE.md; build lulus.

Catatan: jangan mengunci tabel di database pada sesi ini; itu 6c.
```

### 6c — RLS tabel LMS dan batasi RPC
```
Baca AGENTS.md dan docs/SECURITY.md. Kerjakan HANYA 6c (database). Frontend 6b sudah ter-deploy dan pengguna sudah terdaftar di app_users.

1. Migrasi pengunci <timestamp>_lms_rls_by_role.sql (baris pertama: peringatan "terapkan hanya setelah 6b ter-deploy dan app_users terisi"). Untuk tabel lms_*: DROP policy anon_* lama; buat policy berbasis app_role()/app_auditor_id(): kursus/modul/materi/soal/tes/test_questions dibaca semua pengguna login dan ditulis is_staff(); enrollments, attempts, submissions: auditor hanya baris dengan auditor_id = app_auditor_id(), staf penuh; workshop_tasks dibaca login, ditulis staf; lms_question_keys tetap tanpa policy.
2. Tambahkan pengecekan peran di dalam RPC (CREATE OR REPLACE, perilaku lain identik): lms_get_question_key, lms_upsert_question, lms_grade_attempt, lms_grade_submission hanya is_staff(); lms_start_attempt, lms_get_test_questions, lms_submit_attempt memaksa auditor = app_auditor_id() bila peran auditor; lms_create_draft_evaluation hanya dipanggil dari fungsi lain atau staf. REVOKE EXECUTE dari anon pada semua RPC LMS.
3. Policy storage.objects: bucket lms-materials dibaca pengguna login dan ditulis staf; lms-submissions: auditor hanya path berawalan <sessionId>/<app_auditor_id()>/..., staf penuh; hapus akses anon.
4. Sertakan SQL rollback lengkap (mengembalikan policy lama) dan SQL verifikasi per peran (uji dengan JWT pengguna uji).
5. Perbarui docs/SECURITY.md (risiko yang tertutup) dan docs/DATABASE.md.

Output akhir: urutan menjalankan, daftar pengujian per peran, rollback. Jangan menjalankan SQL ke database.
```

### 6d — Kunci tabel lama (setelah LMS stabil)
```
Baca AGENTS.md dan docs/SECURITY.md. Kerjakan HANYA 6d (database). Syarat: 6a-6c sudah berjalan stabil.

1. Audit akses tiap tabel inti (auditors, competency_items, competency_cells, revision_logs, auditor_requests, auditor_history, training_plans, training_sessions, training_evaluations) dari kode di src/stores dan modul; buat tabel "siapa menulis apa" di deskripsi PR dan tandai bagian yang meragukan sebagai pertanyaan untuk pemilik.
2. Migrasi pengunci: hapus akses anon; semua pengguna login boleh membaca; penulisan: competency_cells dan revision_logs hanya melalui alur approval oleh peran admin/manager; training_evaluations oleh staf dan manager (approval); sisanya oleh staf. Jika audit menunjukkan alur yang tidak jelas, JANGAN menebak; buat policy yang paling longgar yang masih memerlukan login dan catat sebagai TODO.
3. Rollback + verifikasi + pembaruan docs/SECURITY.md dan docs/DATABASE.md.

Jangan mengubah perilaku fitur lama selain yang dibutuhkan oleh login.
```

---

## Sesi 7 — P1-2 Status sesi otomatis
```
Baca AGENTS.md dan item P1-2 di docs/POLISH_BACKLOG.md. Kerjakan HANYA P1-2 (frontend).

Aturan: hanya untuk sesi dengan delivery_mode LMS atau Blended (jangan mengubah perilaku sesi Tatap Muka).
1. Saat daftar sesi dimuat (PelaksanaanTraining.vue / trainingSessionStore), sesi berstatus 'Terjadwal' dengan tanggal <= hari ini otomatis menjadi 'Berlangsung' lewat updateStatus yang sudah ada.
2. Saat enrollment pertama sesi berubah dari 'Terdaftar' ke 'Belajar' (KursusDetail.vue / lmsEnrollmentStore), sesi 'Terjadwal' menjadi 'Berlangsung'.
3. Jangan menyentuh sesi 'Selesai' atau 'Dibatalkan'. Pastikan idempotent dan tidak memicu loop atau tulisan berulang saat halaman dimuat ulang.
4. Tampilkan toast.info singkat saat status berubah otomatis. Tombol manual tetap berfungsi.
5. Perbarui docs/LMS_SPEC.md bila perlu; tandai P1-2 selesai. Build lulus.
```

## Sesi 8 — P1-3 Satukan peringkat level
```
Baca AGENTS.md dan item P1-3. Kerjakan HANYA P1-3.
1. Di src/services/calculationService.js hapus _LVL_RANK; pakai LEVEL_RANK (yang memuat △) di suggestLevelFromLms.
2. Pastikan perilaku untuk before = '△' benar (usulan tetap muncul bila target lebih tinggi) dan fungsi tetap murni.
3. Bila Vitest sudah terpasang (P2-3), tambahkan test sesuai docs/TESTING.md; bila belum, tulis kasus uji manual di deskripsi PR.
4. Build lulus; tandai P1-3 selesai.
```

## Sesi 9 — P1-7 Modal konfirmasi
```
Baca AGENTS.md dan item P1-7. Kerjakan HANYA P1-7 (frontend).
1. Buat src/shared/components/ConfirmDialog.vue berbasis BaseModal (judul, pesan, label tombol, varian bahaya memakai btn-danger) dan composable src/shared/composables/useConfirm.js berbasis promise: const ok = await confirm({ title, message, confirmText, danger }).
2. Pasang satu instance dialog di tingkat aplikasi (SidebarLayout/App) tanpa mengubah tata letak.
3. Ganti semua confirm()/alert() di src/modules/lms (AdminTesTertulis, AdminWorkshop, AdminKursusMateri, dan lainnya yang kamu temukan dengan grep) memakai useConfirm; pesan teks tetap sama.
4. Jangan mengubah halaman di luar modul LMS pada sesi ini. Build lulus; tandai P1-7 selesai.
```

## Sesi 10 — P1-6 Penanganan error
```
Baca AGENTS.md dan item P1-6. Kerjakan HANYA P1-6, dan hanya untuk store LMS (lms*Store.js) serta fungsi integrasi LMS di evaluationStore.js dan trainingSessionStore.js.

1. Buat helper src/services/errorService.js: toUserMessage(error, konteks) yang menerjemahkan error Supabase/RPC (termasuk pesan RAISE EXCEPTION dari RPC LMS) menjadi pesan Indonesia yang ramah.
2. Pola baru di store LMS: fungsi yang gagal melempar Error dengan pesan pengguna (jangan diam-diam mengembalikan null); view menangkap dan memanggil useToast().error(...). Pertahankan data state yang konsisten saat gagal (tidak ada update lokal bila server gagal).
3. Kurangi console.* menjadi log yang berguna saja (console.error dengan konteks singkat tanpa data pribadi atau token).
4. Jangan mengubah store di luar LMS. Perbarui semua pemanggil store LMS agar menangani exception. Build lulus; jalankan skenario S1-S7 di docs/TESTING.md secara mental terhadap kode dan laporkan yang tidak bisa diverifikasi tanpa database.
```

## Sesi 11 — P1-5 Aturan tes ujung ke ujung
```
Baca AGENTS.md, docs/LMS_SPEC.md ("Aturan tes tertulis"), dan item P1-5. Kerjakan HANYA P1-5.

Tahap 1 (audit, tanpa mengubah kode): baca lms_start_attempt, lms_get_test_questions, lms_submit_attempt dan TesTertulis.vue. Tulis temuan di docs/TESTING.md bagian baru "Audit aturan tes": bagaimana jendela waktu, max_attempts, attempt 'Berjalan' yang ditinggalkan (timer habis/tab ditutup), double-submit, dan pembersihan localStorage lms_test_<id> diperlakukan sekarang.
Tahap 2 (perbaikan): perbaiki hanya bug yang jelas dan berisiko rendah:
- frontend: auto-submit saat timer habis, cegah double-submit, bersihkan localStorage setelah submit dan saat attempt tidak lagi 'Berjalan', pesan penolakan yang mudah dipahami;
- database: bila diperlukan perubahan perilaku fungsi (mis. menutup attempt 'Berjalan' yang melewati batas waktu), tulis sebagai migrasi baru dengan CREATE OR REPLACE dan perilaku lain identik. Jika perlu status baru atau perubahan CHECK constraint, JANGAN mengerjakannya; tulis proposal di deskripsi PR untuk keputusan pemilik.
Output akhir: ringkasan temuan, perbaikan, proposal yang menunggu keputusan, SQL verifikasi/rollback bila ada migrasi.
```

## Sesi 12 — P1-4 Hasil LMS di Kartu Riwayat dan Dashboard
```
Baca AGENTS.md, docs/DESIGN_SYSTEM.md, dan item P1-4. Kerjakan HANYA P1-4 (frontend, hanya baca data).

1. KartuRiwayatAuditor.vue: tambahkan bagian "Hasil LMS" per auditor (kursus, nilai tes terbaik, nilai workshop, status evaluasi terkait, tanggal lulus) dari lmsEnrollmentStore/lmsWorkshopStore/evaluationStore; keadaan kosong bila belum ada. Perluas exportQualificationCard.js agar PDF memuat bagian yang sama.
2. DashboardKompetensi.vue: tambahkan satu kartu ringkas "Progres LMS" (jumlah enrollment aktif, rata-rata progres, tes menunggu penilaian) dengan ct-card dan pola kartu yang ada.
3. Jangan mengubah konten atau urutan bagian lama; hanya menambah. Jangan memakai hex warna.
4. Build lulus; tandai P1-4 selesai; perbarui PROJECT.md bagian status.
```

---

## Sesi 13 — P2-2 Kebersihan repo
```
Baca AGENTS.md dan item P2-2. Kerjakan HANYA P2-2.
1. Hapus src/components/HelloWorld.vue setelah memastikan tidak ada impor.
2. Ganti name di package.json menjadi "certitrack" (jangan mengubah versi dependensi).
3. git rm --cached untuk tsconfig.app.tsbuildinfo dan tsconfig.node.tsbuildinfo; pastikan .gitignore memuat *.tsbuildinfo dan dist/.
4. Pilih satu paket ikon: hitung penggunaan @lucide/vue vs lucide-vue-next di src/, pilih yang lebih banyak dipakai, ubah impor sisanya, hapus paket yang tidak dipakai dari package.json dan perbarui package-lock.json. Pastikan semua nama ikon tersedia di paket terpilih.
5. Periksa tailwind.config.js yang memakai require() pada modul ESM: biarkan jika build berjalan; kalau diubah, pakai import dan pastikan build tetap lulus.
6. Pastikan README.md dan .env.example dari paket dokumen ada di root.
7. npm ci && npm run build; laporkan ukuran bundle sebelum/sesudah bila berubah.
```

## Sesi 14 — P2-3 Tooling dan test (setelah disetujui menambah dependensi)
```
Baca AGENTS.md dan item P2-3. Kerjakan HANYA P2-3. Pemilik menyetujui penambahan devDependencies: vitest, eslint, eslint-plugin-vue, prettier.

1. Vitest: tambahkan script "test" dan "test:run"; tulis test untuk src/services/calculationService.js sesuai docs/TESTING.md ("Unit test yang diusulkan") dan test dasar untuk beberapa mapper di dataMappers.js (round-trip camelCase <-> snake_case untuk LMS).
2. ESLint (flat config) dengan plugin Vue 3 + Prettier konfigurasi minimal; script "lint". Jangan memformat ulang seluruh repo; perbaiki hanya error (bukan warning gaya) pada file yang kamu sentuh, dan laporkan jumlah warning yang tersisa.
3. Perbarui AGENTS.md bagian Perintah dan docs/TESTING.md. Build, test, dan lint dijalankan dan hasilnya dilaporkan.
```

## Sesi 15 — P2-1 Pecah view besar (ulangi per file)
```
Baca AGENTS.md dan item P2-1. Kerjakan HANYA satu file: <ISI SALAH SATU: src/modules/evaluation/views/EvaluasiTraining.vue | src/modules/lms/views/AdminKursusMateri.vue | src/modules/training-session/views/PelaksanaanTraining.vue | src/modules/lms/views/TesTertulis.vue>.

Refactor tanpa perubahan perilaku:
1. Identifikasi 3-5 bagian yang berdiri sendiri (form, modal, panel, timer, blok LMS) dan ekstrak ke komponen di folder components/ modul yang sama; props/emit eksplisit, tanpa state global baru.
2. Template, class, urutan elemen, dan teks tetap identik; tidak ada perubahan gaya.
3. Logika bisnis tetap di store/service; jangan memindahkan pemanggilan Supabase ke komponen baru.
4. Target: file asal di bawah sekitar 400 baris. Build lulus; jelaskan di PR cara memverifikasi tampilan sama (halaman dan aksi yang dicoba).
```

## Sesi 16 — P2-4 dan P2-5
```
Baca AGENTS.md dan item P2-4. Kerjakan HANYA P2-4 (frontend): pada TesTertulis.vue dan KursusDetail.vue tambahkan navigasi keyboard untuk nomor soal dan daftar modul, aria-label untuk timer, nomor soal, dan tombol ikon, fokus yang terlihat, dan tata letak nyaman di lebar 360px. Gunakan class yang ada; jangan menambah pustaka. Build lulus.
```
```
Baca AGENTS.md, docs/LMS_SPEC.md, dan item P2-5. Kerjakan HANYA P2-5.
1. Periksa apakah Bank Soal (AdminBankSoal.vue) sudah punya impor Excel dan unduhan template; periksa ekspor Excel di AdminLaporan.vue.
2. Jika impor belum ada atau tidak berfungsi: implementasikan dengan library xlsx yang sudah terpasang — template unduhan (kolom: tipe, teks, opsi A-E, kunci, penjelasan, tag klausul, tingkat kesulitan, poin), validasi per baris, simpan lewat RPC lms_upsert_question, tampilkan laporan baris sukses/gagal beserta alasan.
3. Pastikan ekspor Laporan memuat kolom: sesi, auditor, progres, nilai tes terbaik, nilai workshop, status.
4. Build lulus; tandai P2-5 selesai.
```

## Sesi 17 — Penutup dan regresi
```
Baca AGENTS.md, PROJECT.md, docs/POLISH_BACKLOG.md, dan docs/TESTING.md. Tugas penutup (tanpa fitur baru).
1. Tinjau seluruh item backlog: tandai yang selesai, yang ditunda, dan alasan.
2. Telusuri kode untuk setiap skenario S1-S10 di docs/TESTING.md dan laporkan skenario yang tidak bisa dipastikan tanpa database nyata.
3. Pastikan tidak ada hex warna baru, tidak ada console.log sisa, tidak ada confirm()/alert() di src/modules/lms, dan tidak ada panggilan klien yang menulis skor langsung.
4. Perbarui bagian "Status saat ini" di PROJECT.md, daftar RPC dan RLS di docs/DATABASE.md, dan risiko di docs/SECURITY.md agar sesuai dengan kondisi akhir.
5. Jalankan npm ci, npm run build, dan (bila ada) npm run test:run dan npm run lint; laporkan hasilnya.
```
