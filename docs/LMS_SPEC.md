# LMS_SPEC.md — Spesifikasi fungsional modul LMS

## Entitas dan hubungan
Kursus -> Modul -> Materi. Kursus terhubung ke satu item kompetensi dan satu level target. Tes dan soal dimiliki kursus. Sesi training (`training_sessions`) memilih kursus; peserta sesi otomatis menjadi enrollment. Tugas workshop dimiliki sesi.

## Peran
- **Admin:** mengelola semua entitas LMS dan laporan.
- **Assessor:** menilai esai dan workshop (akses menu Admin LMS pada draft saat ini).
- **Auditor:** hanya melihat kursus, tes, workshop, dan hasil miliknya sendiri.
Penegakan peran sungguhan menunggu Supabase Auth (lihat `SECURITY.md`).

## Aturan kursus dan materi
- Status kursus: Draft, Published, Arsip. Hanya kursus Published yang bisa dipilih di form sesi.
- Metode sesi Tatap Muka tidak memerlukan kursus; LMS dan Blended wajib memilih kursus.
- Materi punya nomor dokumen, revisi, dan tanggal efektif (gaya document control). Tipe: PDF, PPT, Video, Link, Teks.
- Modul bisa diberi prasyarat; modul terkunci sampai prasyarat selesai. Progres tersimpan di `lms_enrollments.completed_modules` dan `progress`.

## Aturan tes tertulis
- Tipe soal: PG, BS, Isian, Esai, Kasus. PG/BS/Isian dinilai otomatis; Esai dan Kasus dinilai manual dengan nilai per soal.
- Isian: tidak peka huruf besar-kecil, spasi pinggir diabaikan, boleh beberapa jawaban benar.
- Skor akhir skala 0-100 = (poin diperoleh / total poin) x 100. Lulus bila `final_score >= pass_grade` tes (default 80, mengikuti ambang nilai tes di form evaluasi).
- Jendela waktu: dari tanggal sesi + `open_offset_days` sampai tanggal sesi + `close_offset_days` (default 0 dan 7 hari).
- Percobaan dibatasi `max_attempts`. Pengerjaan hanya untuk auditor yang terdaftar di sesi.
- Soal dan opsi dapat diacak. Peserta tidak pernah menerima kunci jawaban.
- Status attempt: Berjalan -> Menunggu Penilaian (ada esai/kasus) -> Dinilai.
- Nilai yang dipakai untuk evaluasi: nilai tes terbaik di antara percobaan yang lulus.

## Aturan workshop
- Tugas punya brief, batas pengumpulan, rubrik (kriteria, bobot total 100) dan skor maksimal.
- Auditor mengumpulkan file/URL + catatan. Assessor memberi skor per kriteria dan feedback.
- Nilai workshop per tugas dinormalisasi ke 0-100 lalu dirata-rata menjadi `workshop_score`.

## Hubungan ke evaluasi dan matrix
Draft evaluasi dibuat saat tes lulus **dan** semua tugas workshop sesi sudah dinilai (atau sesi tanpa workshop). Isi draft: `hasil_tes_tertulis`, `test_source = 'LMS'`, `test_attempt_id`, `workshop_score`, enam skor standar bernilai null (diisi evaluator), dan `skill_map_update` {item, before, after (usulan), target}. Setelah itu berlaku alur approval yang sudah ada. LMS tidak pernah menulis ke `competency_cells`.

## Usulan level (`suggestLevelFromLms`, `calculationService.js`)
Konstanta sementara: `LMS_RULES = { testPass: 80, workshopPass: 80, starScore: 90 }`.
- Tes atau workshop di bawah ambang -> tidak ada usulan.
- Keduanya lulus -> usulan = level target kursus, dibatasi maksimal ◆ pada saat draft; usulan hanya muncul jika lebih tinggi dari level saat ini.
- ★ hanya sebagai petunjuk jika tes dan workshop >= 90 dan rata-rata nilai evaluasi >= 90; tidak diisi otomatis.
- Form evaluasi menampilkan chip "Usulan LMS" dengan tombol terapkan; evaluator tetap yang memutuskan.

## Keputusan terbuka (tanyakan ke pemilik)
1. Aturan konversi nilai ke level (●, ◆, ★) sesuai kebijakan kompetensi perusahaan; angka di `LMS_RULES` hanya placeholder.
2. Nilai tes yang dipakai: terbaik (saat ini) atau terakhir.
3. Aturan remedial: jeda sebelum percobaan ulang, atau wajib mengulang modul.
4. Apakah workshop wajib untuk semua kursus, dan bobot tes vs workshop.
5. Format sertifikat: nomor, tanda tangan, masa berlaku, dan re-evaluasi berkala.
6. Siapa saja assessor dan apakah penilaian perlu dua penilai.
