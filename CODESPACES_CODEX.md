# CODESPACES_CODEX.md — Memakai Codex di GitHub Codespaces

## Sekali saja (persiapan)
1. **Kuota Codespaces.** Akun GitHub Free mendapat 120 core-hours dan 15 GB-bulan per bulan (sekitar 60 jam pada mesin 2-core), direset tiap siklus tagihan. Pilih mesin **2-core**.
2. **Hemat kuota:** di https://github.com/settings/codespaces turunkan *Default idle timeout* (bawaan 30 menit) menjadi 15 menit dan atur *retention* singkat. Codespace yang berhenti tidak memakai compute, tetapi penyimpanannya tetap terhitung sampai dihapus; hapus Codespace yang tidak dipakai.
3. **Lindungi `main`.** GitHub > Settings > Branches: wajib pull request untuk `main`, larang push langsung. Agen hanya bekerja di branch `agent/*`.
4. **Jangan taruh rahasia di Codespaces.** Jangan menambah *Codespaces secrets* berisi service-role key, `SUPABASE_ACCESS_TOKEN`, atau kredensial lain. File `.env` cukup berisi `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY`.
5. **Paket ChatGPT** yang mencakup Codex diperlukan untuk login Codex CLI. Cek halaman Pricing Codex untuk paketmu.

## Membuka dan menyiapkan
1. Di GitHub: repo > **Code** > **Codespaces** > **Create codespace on main** (mesin 2-core).
2. `.devcontainer/devcontainer.json` otomatis menjalankan `npm ci` dan memasang Codex CLI (`@openai/codex`). Tunggu sampai terminal siap.
3. Buat `.env` dari `.env.example` bila perlu menjalankan `npm run dev`.
4. Login Codex: jalankan `codex login` di terminal dan ikuti petunjuknya (buka tautan di browser). Jika alur callback localhost tidak berjalan di Codespaces, lihat `codex login --help` untuk opsi kode perangkat/device code. Pilih masuk dengan akun ChatGPT.

## Menjalankan satu sesi
```
git switch main && git pull
git switch -c agent/p0-1          # ganti sesuai ID backlog
codex                             # mulai Codex di root repo
```
- Tempel **satu** prompt dari `docs/AGENT_PROMPTS.md`. Codex membaca `AGENTS.md` otomatis.
- Konfigurasi proyek di `.codex/config.toml` memakai sandbox `workspace-write`, jaringan mati, dan persetujuan `on-request`. Codex bisa membaca, mengedit, dan menjalankan `npm run build` di workspace tanpa jaringan. Perintah yang butuh jaringan atau menulis di luar workspace akan meminta izin; **tolak** `git push` dan perintah ke Supabase.
- Setelah selesai:
  1. `git status` dan `git diff` — baca perubahan.
  2. `npm run build` — harus lulus.
  3. Commit (Codex boleh membuat commit lokal atas persetujuanmu), lalu **kamu** menjalankan `git push -u origin agent/p0-1`.
  4. Buka pull request; workflow `build` di tab **Actions** harus hijau.
  5. Jalankan SQL migrasi sendiri di Supabase SQL Editor sesuai urutan di laporan Codex (migrasi aditif -> deploy frontend -> migrasi pengunci).
  6. Merge, lalu **Stop codespace** (Command Palette: *Codespaces: Stop Current Codespace*) agar kuota tidak terbuang.

## Kondisi database yang perlu dilihat agen
Agen tidak punya akses database. Untuk sesi P0-1, P0-2, P0-5, dan seluruh Sesi 6, jalankan `supabase/maintenance/inspect_lms_catalog.sql` di SQL Editor dan tempel hasil yang diminta (policy, hak akses, isi fungsi, bucket). Jangan menempel data pribadi.

## Jika sandbox gagal
Di lingkungan container, Linux sandbox Codex bisa gagal dengan galat seperti `error running landlock`. Ada laporan komunitas (mungkin sudah berubah) bahwa:
- Codex **CLI** membaca `sandbox_mode` dari `config.toml`, sedangkan **ekstensi VS Code** tidak selalu; gunakan CLI di terminal.
- Opsi terakhir, di `~/.codex/config.toml` (bukan di repo): `sandbox_mode = "danger-full-access"` dan `approval_policy = "untrusted"`. Ini mematikan sandbox OS, sehingga Codespace itu sendiri menjadi satu-satunya batas. Karena itu aturan "tanpa rahasia" di atas wajib, dan setujui perintah satu per satu.
- Alternatif: pakai Codex cloud (kontainer terisolasi tanpa kredensialmu).

## Masalah umum
| Gejala | Tindakan |
|---|---|
| "Codespaces blocked / limit" | kuota bulan ini habis; tunggu reset siklus tagihan atau kerjakan lewat github.dev (tekan `.`) tanpa terminal |
| `npm ci` meminta izin jaringan | jalankan sendiri di terminal; devcontainer sudah menjalankannya sekali |
| Codex minta menjalankan `supabase ...` / `psql` / `curl` ke Supabase | tolak; kerjakan lewat SQL Editor |
| Build gagal setelah perubahan | tempel 30 baris pertama galat ke sesi yang sama |
| Hasil agen melenceng dari aturan | rujuk bagian terkait di `AGENTS.md`; mulai sesi baru per item backlog |
