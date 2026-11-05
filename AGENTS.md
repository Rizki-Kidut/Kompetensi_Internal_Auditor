# AGENTS.md — Panduan untuk Codex (dan agen AI lain)

Baca file ini sebelum mengubah apa pun. Konteks bisnis ada di `PROJECT.md`; detail teknis di folder `docs/`; cara menjalankan agen di Codespaces ada di `docs/CODESPACES_CODEX.md`.

## Ringkasan
CertiTrack adalah aplikasi internal (single-tenant) di perusahaan manufaktur untuk mengelola kompetensi, training, dan evaluasi **Internal Auditor** (ISO 9001 / IATF 16949), ditambah modul **LMS** (kursus, materi, kuis modul, tes tertulis, workshop). Stack: Vue 3 + Vite + Tailwind 3 + Pinia + vue-router (hash history) + Supabase. Semua teks UI berbahasa Indonesia. Modul LMS sudah dibangun; pekerjaan sekarang adalah memoles lewat `docs/POLISH_BACKLOG.md`.

## Lingkungan kerja
- Berjalan di **GitHub Codespaces** (Node 22, dependensi sudah terpasang oleh `.devcontainer`). Codex membaca file ini otomatis dari root repo.
- Sandbox Codex bawaan: edit hanya di workspace, **jaringan mati**. `npm ci` dan `git push` butuh jaringan: jangan menjalankannya sendiri, minta pemilik. `npm run build` tidak butuh jaringan.
- Kamu tidak punya akses ke database Supabase (lihat bagian di bawah).

## Perintah
```
npm run dev       # dev server (port 5173)
npm run build     # vue-tsc -b && vite build  -> WAJIB lulus sebelum tugas dianggap selesai
```
- Belum ada ESLint, Prettier, maupun test runner. Jangan menambahkannya kecuali diminta di `docs/POLISH_BACKLOG.md` (item P2-3).
- Environment: `.env` berisi `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` (anon key saja). Jangan commit `.env`.

## Peta repo
```
src/modules/<modul>/views|components   Halaman dan komponen per modul (lms, training-plan, training-session, evaluation, approval, competency-matrix, ...)
src/stores/*.js                        Pinia store; satu store per entitas, memanggil Supabase
src/services/dataMappers.js            Konversi snake_case (DB) <-> camelCase (frontend)
src/services/calculationService.js     Fungsi murni: nilai, gap, usulan level LMS
src/services/materialFileService.js    Unggah file materi ke bucket lms-materials
src/shared/components|composables      Komponen dan composable bersama (BaseModal, FileDropzone, useLmsRole, ...)
src/types/models.js                    Typedef JSDoc
src/router/index.js                    Rute (hash history)
supabase/migrations/*.sql              Skema dan RPC (sudah diterapkan)
supabase/maintenance/*.sql             Skrip manual untuk pemilik (bukan migrasi)
```

## Aturan yang tidak boleh dilanggar (invariant)
1. **LMS tidak pernah menulis ke `competency_cells`.** Matrix kompetensi hanya berubah lewat Approval Center (`executeEvalApproved`) setelah evaluasi disetujui seluruh rantai approval.
2. **Kunci jawaban tidak boleh sampai ke peserta.** Tabel `lms_question_keys` tidak punya policy; soal untuk peserta hanya lewat RPC `lms_get_test_questions`.
3. **Skor tes dan status lulus dihitung di server (RPC), bukan di browser.** Pengecualian saat ini adalah `gradeAttempt` di `lmsEnrollmentStore.js`; ini bug yang harus diperbaiki (backlog P0-1), jangan ditiru.
4. **Migrasi bersifat aditif.** Jangan mengedit file migrasi yang sudah diterapkan; buat file baru. Gunakan `IF NOT EXISTS` / pengecekan `information_schema` dengan `table_schema = 'public'`.
5. **Jangan hardcode warna hex.** Pakai kelas Tailwind dan class di `src/style.css` (lihat `docs/DESIGN_SYSTEM.md`).
6. **Jangan mengubah perilaku modul lama** (Matrix, Perencanaan, Approval, dst.) kecuali tugasnya memintanya. Perubahan di file lama harus minimal.
7. **Jangan menaruh rahasia di repo atau log.** Hanya anon key yang boleh ada di `.env`; jangan pernah memakai atau meminta service-role key atau token akses Supabase.

## Database Supabase yang sudah berjalan
- Semua migrasi di `supabase/migrations` (terakhir `20261104043047`) sudah diterapkan ke project Supabase yang aktif. Jangan edit, hapus, atau ganti nama. Perubahan database hanya lewat file migrasi BARU dengan timestamp lebih besar.
- **Kamu tidak mengeksekusi apa pun ke database:** tidak ada DDL/DML, `supabase db push`, `supabase link`, `supabase login`, `psql`, atau `curl`/skrip ke URL Supabase. Tulis SQL migrasi, SQL verifikasi, dan SQL rollback; pemilik yang menjalankannya.
- Butuh kondisi nyata database (policy, hak akses, isi fungsi, bucket)? Minta pemilik menjalankan `supabase/maintenance/inspect_lms_catalog.sql` di SQL Editor dan menempelkan hasil yang relevan. Jangan menebak isi fungsi atau policy.
- Jangan membaca atau mencetak isi `.env`; cukup rujuk nama variabelnya.
- Migrasi harus idempotent (`CREATE OR REPLACE`, `IF NOT EXISTS`, `DROP POLICY IF EXISTS`) dan tidak boleh menghapus data.
- Urutan aman untuk perubahan yang bisa memutus aplikasi: migrasi aditif -> deploy frontend -> migrasi pengunci (REVOKE/RLS), masing-masing file terpisah dengan komentar peringatan di baris pertama.
- Setiap sesi yang menyentuh database mengakhiri jawaban dengan: nama file migrasi, urutan menjalankan, SQL verifikasi, SQL rollback, dan hal yang belum bisa diuji.

## Batas keselamatan di Codespaces
- Bekerja di branch baru `agent/<id-backlog>` dari `main` terbaru. **Commit lokal saja; jangan `git push`, merge, rebase, force operation, atau mengubah remote.** Pemilik yang push dan membuka pull request.
- Jangan menjalankan perintah destruktif (`rm -rf` di luar folder build, `git reset --hard`, `git clean`) kecuali diminta eksplisit.
- Jangan menginstal paket global, mengubah konfigurasi di luar folder repo, atau menambah dependensi tanpa alasan tertulis di pesan commit.
- Jika sandbox menolak perintah yang seharusnya aman, laporkan; jangan mencari jalan memutar dengan perintah lain.
- Bila tugas membutuhkan keputusan yang tidak tercantum di dokumen, berhenti dan tanyakan.

## Konvensi kode
- Komponen Vue memakai `<script setup>`. Store, service, dan composable ditulis `.js` dengan JSDoc; typedef baru ditambahkan ke `src/types/models.js`.
- ID entitas bertipe TEXT (mis. `ev-lms-<sessionId>-<auditorId>`); kolom fleksibel memakai JSONB.
- Setiap tabel baru butuh pasangan `xxxRowToFrontend` / `xxxFrontendToRow` di `dataMappers.js`.
- Pola halaman: `<div class="p-6 fade-in">`, judul `text-2xl font-bold text-slate-800`, subjudul `text-slate-500 text-sm mt-1`, tombol aksi utama di kanan atas.
- Gunakan komponen bersama (`BaseButton`, `BaseModal`, `BaseTable`, `StatusBadge`, `CompetencySymbol`, `ApprovalChainStepper`, `FileDropzone`) dan `useToast` untuk notifikasi. Jangan memakai `confirm()` atau `alert()` bawaan browser pada kode baru.
- Nama identifier berbahasa Inggris; teks UI berbahasa Indonesia; komentar boleh Indonesia atau Inggris.

## Cara kerja yang diharapkan
1. Pilih **satu** item dari `docs/POLISH_BACKLOG.md` per sesi/PR; sebut ID-nya di pesan commit (mis. `P0-1: pindahkan penilaian esai ke RPC`).
2. Baca dokumen yang relevan (`docs/ARCHITECTURE.md`, `docs/DATABASE.md`, `docs/SECURITY.md`, `docs/LMS_SPEC.md`) sebelum menulis kode.
3. Buat perubahan sekecil mungkin, jalankan `npm run build`, lalu telusuri skenario terkait di `docs/TESTING.md`.
4. Jika kontrak berubah (tabel, RPC, rute, aturan nilai), perbarui dokumen terkait di commit yang sama.
5. Akhiri dengan ringkasan: apa yang diubah, file yang disentuh, hasil build, perintah yang harus dijalankan pemilik (push, SQL), dan hal yang belum bisa diverifikasi tanpa database nyata.

## Hal yang perlu ditanyakan ke pemilik, bukan diputuskan sendiri
- Aturan konversi nilai ke level kompetensi (`LMS_RULES`) dan ambang kelulusan; lihat "Keputusan terbuka" di `docs/LMS_SPEC.md`.
- Strategi login (Supabase Auth) dan pemetaan peran; lihat `docs/SECURITY.md`.
- Apakah materi pembelajaran boleh publik (bucket `lms-materials` sekarang publik) atau harus private + signed URL.
- Penghapusan atau penggantian nama migrasi yang sudah diterapkan di database.
