# ARCHITECTURE.md

## Stack
Vue 3 (`<script setup>`), Vite 5, Tailwind 3 + `@tailwindcss/forms`, Pinia 3, vue-router 4 (hash history), Supabase JS 2, jsPDF + autotable (PDF), SheetJS `xlsx` (Excel), ikon `@lucide/vue`. Build: `vue-tsc -b && vite build`.

## Lapisan
```
View (.vue)  ->  Pinia store (.js)  ->  supabase-js  ->  Postgres (tabel + RPC)
                      |
                      +-> dataMappers.js (snake_case <-> camelCase)
View/Store   ->  calculationService.js (fungsi murni, tanpa Vue/Pinia)
```
- **View** hanya berisi tampilan dan orkestrasi ringan. Logika data ada di store.
- **Store** (satu per entitas) memuat data (`load`), mengubah state lokal, dan memanggil Supabase. Pola saat ini: error dicatat dengan `console.error` lalu fungsi mengembalikan `null`/`undefined`; ini perlu diperbaiki (P1-6).
- **Mapper** wajib dipakai pada setiap baca/tulis tabel; jangan mengirim objek camelCase langsung ke Supabase.
- **calculationService** berisi hitungan nilai, klasifikasi, gap analysis, `LMS_RULES`, dan `suggestLevelFromLms`. Fungsi di sini harus tetap murni agar mudah diuji.

## Struktur modul
```
src/modules/
  approval/            Approval Center (menjalankan executeEvalApproved)
  auditor-master/      Daftar auditor + penugasan area
  auditor-request/     Pengajuan auditor baru / non-aktif
  auditor-history/     Riwayat auditor
  competency-matrix/   Matrix kompetensi
  dashboard/           Dashboard kompetensi
  training-plan/       Perencanaan training (gap analysis)
  training-session/    Pelaksanaan training (sesi, kehadiran, integrasi LMS)
  evaluation/          Evaluasi training (nilai, usulan level, approval chain)
  qualification-card/  Kartu riwayat auditor
  report/              Laporan
  lms/views/           12 halaman LMS (6 admin, 6 auditor)
```

## Store LMS
`lmsCourseStore` (kursus, modul, materi), `lmsQuestionStore` (soal + RPC kunci), `lmsTestStore` (tes, soal tes, start/get/submit attempt), `lmsEnrollmentStore` (enrollment, attempt, `gradeAttempt`, `syncEnrollments`), `lmsWorkshopStore` (tugas dan pengumpulan).

## Alur data lintas modul
```
Perencanaan (training_plans)
   -> Pelaksanaan: buat sesi (training_sessions.delivery_mode, lms_course_id)
        -> lmsEnrollmentStore.syncEnrollments  => lms_enrollments per peserta
   -> Auditor belajar (lms_enrollments.progress / completed_modules)
   -> Tes: lms_start_attempt -> lms_get_test_questions -> lms_submit_attempt
        -> lulus & tanpa esai  => lms_create_draft_evaluation
        -> ada esai => antrean Penilaian => gradeAttempt (saat ini di klien, lihat P0-1)
   -> Workshop: lms_submissions -> penilaian -> lms_create_draft_evaluation
   -> Evaluasi (training_evaluations, final_status 'Draft', test_source 'LMS')
   -> Evaluator melengkapi skor -> Approval Center
   -> executeEvalApproved => competency_cells + revision_logs (satu-satunya jalur ubah matrix)
```
`lms_create_draft_evaluation` hanya membuat/menimpa baris yang masih berstatus `Draft`; ia tidak menyentuh `competency_cells`.

## Routing
Hash history (`createWebHashHistory`). Rute dimuat lazy. Belum ada navigation guard; `/lms/admin/*` terbuka lewat URL untuk semua peran (P0-3).

## Peran LMS (draft)
`useLmsRole` menyimpan peran (`Admin | Assessor | Auditor`) dan `auditorId` pada state modul (tidak persisten). `SidebarLayout` memakainya untuk menampilkan grup menu dan switcher peran. Ini bukan mekanisme keamanan.

## Penyimpanan file
Bucket Supabase Storage `lms-submissions` dipakai `WorkshopSaya.vue`. Upload materi di `AdminKursusMateri.vue` belum ada (hanya URL). Bucket belum dibuat oleh migrasi (P0-5).
