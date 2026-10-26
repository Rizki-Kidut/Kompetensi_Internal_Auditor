# TESTING.md

## Verifikasi dasar (wajib setiap perubahan)
```
npm ci
npm run build      # harus exit 0
```
Belum ada test otomatis. Pengujian dilakukan lewat unit test untuk fungsi murni (setelah P2-3) dan skenario manual di bawah dengan database Supabase uji (staging), bukan produksi.

## Unit test yang diusulkan (`src/services/calculationService.js`)
- `classifyNilai`: 90 -> Memuaskan, 89.99 -> Baik, 80 -> Baik, 70 -> Cukup, 69.99 -> Kurang.
- `calcRataRataNilaiA`: mengabaikan null, string kosong, dan non-angka; daftar kosong -> 0.
- `meetsTarget`: urutan '' < △ < ● < ◆ < ★; target default ◆.
- `suggestLevelFromLms`: tes 79 -> tanpa usulan; tes 80 dan workshop null -> usulan target; target ★ -> dibatasi ◆; `before` sama atau lebih tinggi -> kosong; `before = '△'` tetap menghasilkan usulan; `starEligible` benar hanya jika tes, workshop, dan rata-rata evaluasi >= 90.

## Skenario manual (end-to-end)
| ID | Skenario | Hasil yang diharapkan |
|---|---|---|
| S1 | Admin membuat kursus Published dengan 2 modul, materi, 5+ soal, 1 tes, 1 tugas workshop | Data tersimpan; kursus muncul di dropdown form sesi |
| S2 | Buat sesi metode Blended + kursus, 3 peserta | 3 baris `lms_enrollments`; badge "Blended" di daftar sesi; ubah peserta -> enrollment ikut tambah/hapus |
| S3 | Auditor (switcher peran) menyelesaikan modul berurutan | Modul terkunci sampai prasyarat selesai; progres naik; tombol tes muncul saat 100% |
| S4 | Auditor mengerjakan tes tanpa esai dan lulus | Skor dihitung server; draft evaluasi `ev-lms-<sesi>-<auditor>` terbentuk; badge "Dari LMS" di form evaluasi |
| S5 | Tes berisi esai | Status "Menunggu Penilaian"; antrean Penilaian terisi; setelah dinilai skor akhir dan lulus terhitung benar |
| S6 | Percobaan melebihi `max_attempts`, atau di luar jendela waktu | Ditolak dengan pesan jelas; tidak ada attempt baru |
| S7 | Workshop: kirim tugas, nilai dengan rubrik | `workshop_score` terisi; draft evaluasi terbentuk hanya bila semua tugas sesi dinilai |
| S8 | Evaluator melengkapi 6 skor, memilih level "sesudah" (chip usulan), kirim ke Approval | Matrix **tidak** berubah sebelum seluruh approval selesai; setelah selesai `competency_cells` dan `revision_logs` terisi |
| S9 | Ulang tes setelah draft ada | Draft diperbarui; evaluasi yang sudah masuk approval tidak tertimpa |
| S10 | Auditor membuka `/#/lms/admin/kursus` langsung | Diblokir/dialihkan (setelah P0-3) |

## Pemeriksaan keamanan (jalankan dengan anon key)
```
# Kunci jawaban tidak boleh terbaca: hasil harus [] atau ditolak
curl "$VITE_SUPABASE_URL/rest/v1/lms_question_keys?select=*" -H "apikey: $VITE_SUPABASE_ANON_KEY" -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY"

# Setelah P0-2: update skor langsung harus ditolak (permission denied)
curl -X PATCH "$VITE_SUPABASE_URL/rest/v1/lms_attempts?id=eq.<id>" -H "apikey: $VITE_SUPABASE_ANON_KEY" -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" -H "Content-Type: application/json" -d '{"final_score":100,"passed":true}'
```

## Checklist sebelum merge
- `npm run build` lulus tanpa peringatan baru.
- Tidak ada hex warna baru dan tidak ada `console.log` sisa.
- Migrasi baru idempotent dan sudah diuji pada database kosong dan database yang sudah berisi.
- Dokumen di `docs/` diperbarui bila kontrak berubah.
