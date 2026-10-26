# AGENTS.md — Panduan untuk Codex dan agen AI

Baca file ini sebelum mengubah apa pun. Konteks bisnis ada di `PROJECT.md`; detail teknis ada di folder `docs/`.

## Ringkasan
CertiTrack adalah aplikasi internal (single-tenant) di perusahaan manufaktur untuk mengelola kompetensi, training, dan evaluasi **Internal Auditor** (ISO 9001 / IATF 16949), ditambah modul **LMS** (kursus, tes tertulis, workshop). Stack: Vue 3 + Vite + Tailwind 3 + Pinia + vue-router (hash history) + Supabase. Semua teks UI berbahasa Indonesia.

## Perintah
```
npm ci            # install
npm run dev       # dev server
npm run build     # vue-tsc -b && vite build  -> WAJIB lulus sebelum tugas dianggap selesai
```
- Belum ada ESLint, Prettier, maupun test runner. Jangan menambahkannya kecuali diminta di `docs/POLISH_BACKLOG.md` (item P2-3).
- Environment: `.env` berisi `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY`. Jangan commit `.env`, `dist/`, atau file `*.tsbuildinfo`.

## Peta repo
```
src/modules/<modul>/views|components   Halaman dan komponen per modul (lms, training-plan, training-session, evaluation, approval, competency-matrix, ...)
src/stores/*.js                        Pinia store; satu store per entitas, memanggil Supabase
src/services/dataMappers.js            Konversi snake_case (DB) <-> camelCase (frontend)
src/services/calculationService.js     Fungsi murni: nilai, gap, usulan level LMS
src/shared/components|composables      Komponen dan composable bersama
src/types/models.js                    Typedef JSDoc
src/router/index.js                    Rute (hash history)
supabase/migrations/*.sql              Skema dan RPC
```

## Aturan yang tidak boleh dilanggar (invariant)
1. **LMS tidak pernah menulis ke `competency_cells`.** Matrix kompetensi hanya berubah lewat Approval Center (`executeEvalApproved`) setelah evaluasi disetujui seluruh rantai approval.
2. **Kunci jawaban tidak boleh sampai ke peserta.** Tabel `lms_question_keys` tidak punya policy; soal untuk peserta hanya lewat RPC `lms_get_test_questions`.
3. **Skor tes dan status lulus dihitung di server (RPC), bukan di browser.** Pengecualian saat ini adalah `gradeAttempt` di `lmsEnrollmentStore.js`; ini bug yang harus diperbaiki (backlog P0-1), jangan ditiru.
4. **Migrasi bersifat aditif.** Jangan mengedit file migrasi yang sudah diterapkan; buat file baru. Gunakan `IF NOT EXISTS` / pengecekan `information_schema` dengan `table_schema = 'public'`.
5. **Jangan hardcode warna hex.** Pakai kelas Tailwind dan class di `src/style.css` (lihat `docs/DESIGN_SYSTEM.md`).
6. **Jangan mengubah perilaku modul lama** (Matrix, Perencanaan, Approval, dst.) kecuali tugasnya memintanya. Perubahan di file lama harus minimal.

## Konvensi kode
- Komponen Vue memakai `<script setup>`. Store, service, dan composable ditulis `.js` dengan JSDoc; typedef baru ditambahkan ke `src/types/models.js`.
- ID entitas bertipe TEXT (mis. `ev-lms-<sessionId>-<auditorId>`); kolom fleksibel memakai JSONB.
- Setiap tabel baru butuh pasangan `xxxRowToFrontend` / `xxxFrontendToRow` di `dataMappers.js`.
- Pola halaman: `<div class="p-6 fade-in">`, judul `text-2xl font-bold text-slate-800`, subjudul `text-slate-500 text-sm mt-1`, tombol aksi utama di kanan atas.
- Gunakan komponen bersama (`BaseButton`, `BaseModal`, `BaseTable`, `StatusBadge`, `CompetencySymbol`, `ApprovalChainStepper`) dan `useToast` untuk notifikasi. Jangan memakai `confirm()` atau `alert()` bawaan browser pada kode baru.
- Nama identifier berbahasa Inggris; teks UI berbahasa Indonesia; komentar boleh Indonesia atau Inggris.
- Jangan menambah dependensi baru tanpa alasan tertulis di pesan commit.

## Cara kerja yang diharapkan
1. Pilih **satu** item dari `docs/POLISH_BACKLOG.md` per sesi/PR; sebut ID-nya di pesan commit (mis. `P0-1: pindahkan penilaian esai ke RPC`).
2. Baca dokumen yang relevan (`docs/ARCHITECTURE.md`, `docs/DATABASE.md`, `docs/SECURITY.md`, `docs/LMS_SPEC.md`) sebelum menulis kode.
3. Buat perubahan sekecil mungkin, jalankan `npm run build`, lalu jalankan skenario terkait di `docs/TESTING.md`.
4. Jika kontrak berubah (tabel, RPC, rute, aturan nilai), perbarui dokumen terkait di commit yang sama.
5. Akhiri dengan ringkasan: apa yang diubah, file yang disentuh, hasil build, dan hal yang belum bisa diverifikasi (mis. butuh database nyata).

## Hal yang perlu ditanyakan ke pemilik, bukan diputuskan sendiri
- Aturan konversi nilai ke level kompetensi (`LMS_RULES`) dan ambang kelulusan; lihat bagian "Keputusan terbuka" di `docs/LMS_SPEC.md`.
- Strategi login (Supabase Auth) dan pemetaan peran; lihat `docs/SECURITY.md`.
- Penghapusan atau penggantian nama migrasi yang mungkin sudah diterapkan di database produksi.
