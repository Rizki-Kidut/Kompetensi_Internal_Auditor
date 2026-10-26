# POLISH_BACKLOG.md — Daftar pekerjaan pemolesan

Hasil audit repo setelah empat tahap LMS dari Bolt diterapkan (build lulus). Kerjakan **satu item per sesi/PR** dan urut dari prioritas tertinggi. Item bertanda "butuh keputusan" harus ditanyakan ke pemilik lebih dulu.

Prioritas: **P0** = kebenaran nilai dan keamanan, **P1** = celah fungsi dan ketahanan, **P2** = kebersihan dan tooling.

---
## P0

### P0-1 Pindahkan penilaian esai ke server
- **Masalah:** `gradeAttempt` di `src/stores/lmsEnrollmentStore.js` menghitung `final_score` dan `passed` di browser lalu menulisnya langsung ke `lms_attempts`. RPC `lms_grade_attempt` yang diminta pada rancangan tidak pernah dibuat.
- **Target:** migrasi baru dengan `lms_grade_attempt(p_attempt_id text, p_manual_scores jsonb)` (SECURITY DEFINER): validasi attempt berstatus "Menunggu Penilaian"; batasi nilai manual per soal <= `points`; hitung `manual_score`, `final_score` (skala 0-100), `passed` dari `pass_grade` tes; set status "Dinilai"; panggil `lms_create_draft_evaluation` bila memenuhi syarat; kembalikan `{final_score, passed}`.
- **Langkah:** tulis migrasi; ganti isi `gradeAttempt` menjadi satu panggilan RPC; hapus perhitungan klien dan pembacaan `lms_questions` dari fungsi itu; perbarui `AdminPenilaian.vue` bila bentuk hasil berubah.
- **Selesai bila:** skenario S5 lulus; tidak ada lagi `updateAttempt` yang menulis skor; `npm run build` lulus.

### P0-2 Penilaian workshop via RPC + kunci kolom sementara
- **Masalah:** `AdminPenilaian.vue` memanggil `workshopStore.updateSubmission` yang menulis skor langsung ke `lms_submissions` (hak anon penuh).
- **Target:** RPC `lms_grade_submission(p_submission_id, p_rubric_scores jsonb, p_feedback text, p_assessor text)` yang menghitung `score`, mengubah status ke "Dinilai", lalu memanggil `lms_create_draft_evaluation`. Terapkan pembatasan hak kolom pada `lms_attempts` dan `lms_submissions` sesuai `SECURITY.md` ("Perbaikan sementara").
- **Selesai bila:** skenario S7 lulus; uji `curl` PATCH pada `lms_attempts` ditolak; pengumpulan tugas oleh auditor (kolom `file_url`, `note`, `status`) tetap berfungsi.

### P0-3 Guard rute berdasarkan peran
- **Masalah:** `src/router/index.js` tidak punya `beforeEach`; auditor bisa membuka `/#/lms/admin/*` lewat URL. Halaman auditor juga belum menangani `auditorId` kosong secara seragam.
- **Target:** tambahkan `meta: { roles: [...] }` pada rute LMS dan `router.beforeEach` yang membaca `useLmsRole`; arahkan ke `/lms/kursus` (auditor) atau tampilkan halaman "Akses ditolak". Halaman auditor menampilkan keadaan kosong yang jelas bila belum memilih auditor.
- **Catatan:** ini guard tampilan sementara; keamanan sebenarnya ada di P1-1.
- **Selesai bila:** skenario S10 lulus.

### P0-4 Kebersihan migrasi
- **Masalah:** nama file berlapis dan berakhiran ganda (`..._20261022090112_lms_module_foundation.sql.sql`, dan dua migrasi 2026-10-26 yang juga bernama ganda); pengecekan `information_schema.columns` tanpa `table_schema`; data contoh tertanam di migrasi fondasi (termasuk `competency_items` bila tabel kosong); kolom di `..._add_lms_fields_to_training_evaluations` duplikat dengan migrasi fondasi (aman karena `IF NOT EXISTS`).
- **Target:** pindahkan seed ke `supabase/seed/lms_sample.sql`; tambahkan `table_schema = 'public'` pada pengecekan kolom lewat migrasi pembaruan, bukan edit migrasi lama.
- **Butuh keputusan:** mengganti nama file migrasi **hanya** bila belum pernah diterapkan ke database mana pun (cek `supabase_migrations.schema_migrations`). Bila sudah diterapkan, biarkan nama lama dan catat di `DATABASE.md`.
- **Selesai bila:** database kosong + semua migrasi menghasilkan skema yang sama tanpa data contoh; seed bisa dijalankan terpisah.

### P0-5 Storage: bucket, upload materi, akses privat
- **Masalah:** `WorkshopSaya.vue` mengunggah ke bucket `lms-submissions` dan memakai `getPublicUrl`, tetapi tidak ada migrasi yang membuat bucket. `AdminKursusMateri.vue` hanya menerima URL; upload file materi ke `lms-materials` (bagian dari rancangan) belum ada.
- **Target:** migrasi pembuatan bucket `lms-materials` dan `lms-submissions` (private) beserta policy; simpan **path** di database dan buat signed URL saat ditampilkan; tambahkan input upload di form materi (batas ukuran dan tipe file; pesan error jelas).
- **Selesai bila:** materi dan hasil tugas dapat diunggah dan dibuka melalui signed URL; URL permanen publik tidak lagi dipakai.

---
## P1

### P1-1 Supabase Auth + RLS per peran (butuh keputusan)
Ikuti "Rancangan target" di `SECURITY.md`. Pecah menjadi PR kecil: tabel `app_users` + fungsi bantu; halaman login + sesi; RLS tabel LMS; pembatasan RPC (`lms_get_question_key` hanya admin); RLS tabel lama; hapus switcher peran draft. Mulai hanya setelah pemilik menyetujui metode login dan pemetaan auditor.

### P1-2 Status sesi otomatis
- **Masalah:** transisi Terjadwal -> Berlangsung hanya lewat tombol manual di `PelaksanaanTraining.vue`; rancangan meminta otomatis saat tanggal sesi tiba atau auditor pertama membuka modul.
- **Target:** perbarui status saat daftar sesi dimuat (bila `date <= hari ini` dan status Terjadwal) dan saat enrollment pertama berstatus "Belajar"; jangan menyentuh sesi Selesai/Dibatalkan.

### P1-3 Satukan peringkat level
- **Masalah:** `calculationService.js` punya `LEVEL_RANK` (termasuk △) dan `_LVL_RANK` terpisah untuk LMS tanpa △.
- **Target:** pakai satu peta (`LEVEL_RANK`) di `suggestLevelFromLms`; tambahkan unit test (lihat `TESTING.md`).

### P1-4 Hasil LMS di Kartu Riwayat dan Dashboard
Belum ada rujukan LMS di `KartuRiwayatAuditor.vue` dan `DashboardKompetensi.vue`. Tambahkan ringkasan "Hasil LMS" (nilai tes, nilai workshop, tanggal lulus) pada kartu riwayat dan satu kartu "Progres LMS" di dashboard, memakai `ct-card` dan komponen yang ada. Ekspor PDF kartu riwayat (`exportQualificationCard.js`) ikut memuat ringkasan.

### P1-5 Verifikasi aturan tes ujung ke ujung
Periksa dan perbaiki bila perlu: jendela waktu dan `max_attempts` ditolak dengan pesan yang bisa dipahami; attempt "Berjalan" yang waktunya habis atau ditinggalkan (timer habis, tab ditutup) tidak menghalangi percobaan berikutnya dan tidak tersimpan di localStorage selamanya (`lms_test_<id>`); jawaban tersimpan sementara dibersihkan setelah submit; double-submit dicegah.

### P1-6 Penanganan error di store
- **Masalah:** sekitar 69 pemanggilan `console.*` di `src/modules/lms` dan `src/stores`; banyak fungsi diam-diam mengembalikan `null` sehingga UI tidak memberi tahu pengguna.
- **Target:** pola konsisten: store melempar atau mengembalikan `{ ok, error }`, view menampilkan `useToast().error(...)`; sisakan log hanya untuk debugging yang berguna.

### P1-7 Ganti `confirm()` dengan modal konfirmasi
`AdminTesTertulis.vue`, `AdminWorkshop.vue`, dan `AdminKursusMateri.vue` memakai `confirm()` bawaan browser. Buat komponen konfirmasi berbasis `BaseModal` dan pakai di semua tempat hapus LMS.

---
## P2

### P2-1 Pecah view besar
`EvaluasiTraining.vue` (~807 baris), `AdminKursusMateri.vue` (~603), `PelaksanaanTraining.vue` (~598), `TesTertulis.vue` (~507). Ekstrak bagian berulang (form materi, panel penilaian, timer tes, blok LMS di evaluasi) ke `components/` tanpa mengubah perilaku.

### P2-2 Kebersihan repo
Hapus `src/components/HelloWorld.vue` (sisa template); ganti `name` di `package.json` dari `vite-vue-typescript-starter`; keluarkan `tsconfig.app.tsbuildinfo` dan `tsconfig.node.tsbuildinfo` dari git dan tambahkan ke `.gitignore` (juga `dist/`); pilih satu paket ikon (`@lucide/vue` dan `lucide-vue-next` sama-sama terpasang) dan sesuaikan impor; periksa `tailwind.config.js` yang memakai `require` di dalam modul ESM; pasang README dan `.env.example` dari paket dokumen ini.

### P2-3 Tooling dan test (butuh persetujuan menambah dependensi)
Tambahkan Vitest untuk fungsi murni di `calculationService.js` dan mapper; ESLint + Prettier minimal untuk Vue 3. Jangan memformat ulang seluruh repo dalam satu PR; format hanya file yang disentuh.

### P2-4 Aksesibilitas dan responsif
Halaman pengerjaan tes dan pemutar materi: navigasi keyboard, label ARIA pada timer dan nomor soal, kontras teks, tampilan di layar sempit.

### P2-5 Verifikasi fitur impor/ekspor
Pastikan impor soal dari Excel dan template unduhan di Bank Soal berfungsi (belum diverifikasi saat audit), serta ekspor Excel di Laporan LMS memuat kolom yang diharapkan.

---
## Catatan penutup
Setelah P0 selesai, jalankan seluruh skenario di `TESTING.md`. Perbarui bagian "Status saat ini" di `PROJECT.md` setiap kali satu kelompok item selesai.
