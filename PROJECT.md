# PROJECT.md — CertiTrack: Kompetensi, Training, dan LMS Internal Auditor

## Tujuan
Mendigitalkan pengelolaan kompetensi Internal Auditor di perusahaan manufaktur (ISO 9001 / IATF 16949): siapa yang kompeten di item apa, siapa yang perlu dilatih, bagaimana pelatihan dijadwalkan dan dievaluasi, dan bagaimana level kompetensi diperbarui dengan persetujuan manajemen. Modul LMS menambahkan pembelajaran terstruktur (materi, tes tertulis, workshop) yang hasilnya mengalir ke evaluasi dan matrix kompetensi.

## Pengguna
| Peran | Kebutuhan |
|---|---|
| Admin QMS | Mengelola auditor, matrix, rencana/pelaksanaan training, kursus LMS, bank soal, tes, workshop, laporan |
| Assessor | Menilai esai dan hasil workshop |
| Auditor | Mengikuti kursus, mengerjakan tes, mengumpulkan tugas workshop, melihat hasil |
| Section Manager Seksi / Section Manager QA | Menyetujui evaluasi di Approval Center |

Saat ini aplikasi belum punya login. Peran LMS hanya tiruan di tampilan (`useLmsRole`); lihat `docs/SECURITY.md`.

## Istilah domain
- **Item kompetensi** (`competency_items`): kemampuan yang dinilai pada matrix.
- **Level kompetensi**: △ (terendah) < ● < ◆ < ★. Target standar saat ini ◆ (dipakai pada gap analysis).
- **Matrix** (`competency_cells`): level setiap auditor per item. Berubah hanya lewat evaluasi yang disetujui.
- **Rencana training** (`training_plans`) -> **Sesi** (`training_sessions`) -> **Evaluasi** (`training_evaluations`) -> **Approval** -> pembaruan matrix + `revision_logs`.
- **Evaluasi**: Nilai A (6 skor standar + skor khusus), hasil tes tertulis, usulan perubahan level (`skill_map_update`), dan rantai approval (Section Manager Seksi -> Section Manager QA).
- **Delivery mode** sesi: Tatap Muka, LMS, atau Blended.

## Modul dan rute
Modul inti: Dashboard `/dashboard`, Daftar Auditor `/auditor`, Pengajuan Auditor `/auditor/tambah` dan `/auditor/nonaktif`, Matrix `/kompetensi`, Perencanaan `/training/rencana`, Pelaksanaan `/training/pelaksanaan`, Evaluasi `/training/evaluasi`, Kartu Riwayat `/kartu-riwayat`, Laporan `/laporan`, Approval `/approval`, Riwayat `/history`.

Modul LMS (auditor): `/lms/kursus`, `/lms/kursus/:id`, `/lms/jadwal`, `/lms/tes`, `/lms/tes/:testId`, `/lms/workshop`, `/lms/hasil`.
Modul LMS (admin): `/lms/admin/kursus`, `/lms/admin/soal`, `/lms/admin/tes`, `/lms/admin/workshop`, `/lms/admin/penilaian`, `/lms/admin/laporan`.

## Alur utama
1. Gap analysis di Perencanaan menunjukkan item yang belum mencapai target.
2. Rencana disetujui -> sesi dibuat di Pelaksanaan (pilih metode dan kursus LMS bila perlu; peserta otomatis terdaftar di kursus).
3. Auditor belajar, mengerjakan tes (dinilai server), dan mengumpulkan workshop.
4. Setelah tes lulus dan semua tugas workshop dinilai, sistem membuat **draft evaluasi** (`lms_create_draft_evaluation`) berisi nilai tes, nilai workshop, dan usulan level.
5. Evaluator melengkapi skor standar, mengirim ke Approval Center.
6. Setelah semua langkah approval selesai, matrix diperbarui dan revisi dicatat.

## Status saat ini (hasil audit)
- `npm run build` lulus. Empat tahap LMS dari Bolt sudah masuk: fondasi database, halaman admin, halaman auditor, dan integrasi jadwal/evaluasi.
- Sudah ada di kode (belum diuji dengan database nyata): CRUD kursus/modul/materi, bank soal, builder tes, tugas workshop + rubrik, antrean penilaian, pengerjaan tes via RPC, enrollment otomatis dari sesi, draft evaluasi otomatis, badge "Dari LMS" dan chip usulan level di form evaluasi.
- Celah yang diketahui: lihat `docs/POLISH_BACKLOG.md` (prioritas P0 = keamanan dan kebenaran nilai).

## Di luar cakupan (saat ini)
Aplikasi mobile native, integrasi HR/SSO, penjadwalan kalender eksternal, dan multi-perusahaan (multi-tenant).

## Dokumen terkait
`AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/DATABASE.md`, `docs/DESIGN_SYSTEM.md`, `docs/LMS_SPEC.md`, `docs/SECURITY.md`, `docs/POLISH_BACKLOG.md`, `docs/TESTING.md`.
