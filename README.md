# CertiTrack — Kompetensi, Training, dan LMS Internal Auditor

Aplikasi internal untuk mengelola kompetensi, training, evaluasi, dan pembelajaran (LMS) Internal Auditor sesuai ISO 9001 / IATF 16949.

**Stack:** Vue 3, Vite, Tailwind CSS 3, Pinia, vue-router, Supabase (Postgres + RLS + RPC), jsPDF, SheetJS (xlsx).

## Menjalankan
```
npm ci
cp .env.example .env     # isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY
npm run dev
npm run build
```
Terapkan semua file di `supabase/migrations/` secara berurutan ke proyek Supabase.

## Dokumentasi
- `PROJECT.md` — tujuan, peran, alur, status
- `AGENTS.md` — aturan kerja untuk agen AI (Codex)
- `docs/` — arsitektur, database, desain, spesifikasi LMS, keamanan, backlog, pengujian
