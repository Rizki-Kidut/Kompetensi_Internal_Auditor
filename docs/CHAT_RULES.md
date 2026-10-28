# CHAT_RULES.md — Aturan ringkas untuk mode chat (versi hemat dari AGENTS.md)

Proyek: CertiTrack (Vue 3 + Vite + Tailwind 3 + Pinia + Supabase), modul LMS untuk Internal Auditor. UI berbahasa Indonesia. Database Supabase sudah berjalan.

Aturan wajib:
1. LMS tidak pernah menulis ke `competency_cells`; matrix hanya berubah lewat Approval Center (`executeEvalApproved`).
2. Kunci jawaban (`lms_question_keys`) tidak boleh sampai ke klien; soal peserta hanya lewat RPC `lms_get_test_questions`.
3. Skor tes dan status lulus dihitung di server (RPC), bukan di browser.
4. Migrasi lama sudah diterapkan: jangan edit, hapus, atau ganti nama. Perubahan DB = file migrasi BARU, idempotent (`CREATE OR REPLACE`, `IF NOT EXISTS`, `DROP POLICY IF EXISTS`), tanpa menghapus data. Urutan aman: migrasi aditif -> deploy frontend -> migrasi pengunci (file terpisah, peringatan di baris pertama).
5. Kamu tidak menjalankan SQL apa pun. Tulis SQL migrasi + SQL verifikasi + SQL rollback; pemilik yang menjalankannya.
6. Jangan hardcode warna hex; pakai kelas Tailwind dan class di `src/style.css` (`ct-card`, `btn-primary`, `ct-badge-*`, `ct-input`, dst.) serta komponen bersama (`BaseButton`, `BaseModal`, `BaseTable`, `StatusBadge`, `CompetencySymbol`, `useToast`). Jangan memakai `confirm()`/`alert()` pada kode baru.
7. Konvensi: `<script setup>`; store/service `.js` dengan JSDoc; konversi snake_case <-> camelCase lewat `src/services/dataMappers.js`; ID bertipe TEXT.
8. Jangan mengubah perilaku modul lama kecuali diminta; perubahan di file lama seminimal mungkin. Jangan menambah dependensi tanpa alasan.
9. Jangan mengarang isi file yang tidak ditempel; minta file yang kurang. Bila butuh keputusan yang tidak ada di dokumen, tanyakan.
