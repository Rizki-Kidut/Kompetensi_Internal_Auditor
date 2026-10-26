# DESIGN_SYSTEM.md

Desain LMS harus identik dengan modul lama. Definisi pasti ada di `src/style.css` dan `tailwind.config.js`; baca keduanya sebelum membuat gaya baru.

## Warna dan tipografi
| Elemen | Nilai |
|---|---|
| Font | Inter; root font-size 12px (jangan diubah). Skala `text-xs` s.d. `text-3xl` didefinisikan di `tailwind.config.js` |
| Sidebar | `blue-800` (#1e40af); header `blue-900` (#1e3a8a); teks `blue-200` (#bfdbfe); menu aktif `blue-700` |
| Area admin/persetujuan | gaya amber (`sidebar-nav-amber-*`), dipakai Approval Center dan grup Admin LMS |
| Latar halaman | `slate-50`; kartu putih, border `slate-200`, `rounded-xl` |
| Tombol | primer `blue-600`, sekunder `slate-100`, sukses `emerald-600`, bahaya `red-600`, submit `indigo-600` |
| Badge status | biru, amber, slate, emerald, merah (latar 100, teks 700) |
| Level kompetensi | ★ amber, ◆ biru, ● emerald, kosong slate (`CompetencySymbol`) |
| Nilai | >= 80 hijau (emerald), di bawahnya amber/merah sesuai konteks halaman |

Warna merek juga tersedia sebagai alias `certitrack.sidebar`, `certitrack.sidebar-dark`, `certitrack.sidebar-text`.

## Class dan komponen yang harus dipakai ulang
- Class global: `ct-card`, `btn-primary`, `btn-secondary`, `btn-success`, `btn-danger`, `ct-badge-*`, `ct-status-*`, `ct-input`, `ct-label`, `ct-table-header`, `ct-action-btn-*`, `ct-empty-icon-wrap`, `fade-in`, `sidebar-nav-*`, `sidebar-group-label`.
- Komponen: `BaseButton`, `BaseModal`, `BaseTable`, `StatusBadge`, `CompetencySymbol`, `ApprovalChainStepper`, `ToastContainer`/`useToast`.
- Status baru (mis. Lulus, Remedial, Menunggu Penilaian) ditambahkan ke `STATUS_MAP` di `StatusBadge`, bukan dibuat sebagai class baru.

## Pola halaman
```
<div class="p-6 fade-in">
  header: h1 text-2xl font-bold text-slate-800 + p text-slate-500 text-sm mt-1; tombol aksi utama di kanan
  konten: ct-card (tabel via BaseTable, form via ct-input/ct-label)
  keadaan kosong: ct-empty-icon-wrap + teks ringkas
</div>
```
Konfirmasi hapus memakai `BaseModal`, notifikasi memakai `useToast`, validasi form menampilkan pesan merah di bawah input seperti halaman lama.

## Aturan
- Jangan menulis hex di komponen. Audit terakhir: tidak ada hex di `src/modules/lms`; pertahankan.
- Jangan menambah pustaka UI atau tema baru.
- Teks UI Indonesia; format tanggal dan angka mengikuti halaman lama.
- Periksa tampilan di lebar sempit (halaman pengerjaan tes harus nyaman di layar kecil).
