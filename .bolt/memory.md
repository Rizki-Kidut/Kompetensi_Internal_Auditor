# Project memory

## Product intent & audience

- Aplikasi manajemen kompetensi auditor (internal): melacak kompetensi, evaluasi training, perencanaan training, dan dashboard.
- Audiens: admin/admin HR yang mengelola data auditor & kompetensi.

## Brand personality & voice

- Bahasa UI: Bahasa Indonesia.
- Nada: langsung, fungsional, administratif.

## Visual design & UX direction

- Framework frontend: Vue (komponen SFC seperti `KelolaKompetensi.vue`).
- Navigasi: sidebar dengan grup menu (grup "Kompetensi" berisi Matrix Kompetensi & Daftar Kompetensi).
- Pola form admin: tambah item (kelompok + nama) lalu tampil sebagai daftar dikelompokkan per kategori dengan tombol ubah nama.
- Hindari input kompetensi tersebar di multiple form; konsolidasikan penambahan kompetensi ke menu admin "Daftar Kompetensi".

## Decisions, constraints & rationale

- Daftar kategori kompetensi bersifat dinamis, diambil dari menu Daftar Kompetensi — tidak boleh ada daftar kategori yang ditulis manual/hardcode di kode halaman.
- Saat kompetensi baru ditambahkan, otomatis dibuatkan kolom untuk semua auditor yang sudah ada.
- Kotak "Tambah Item Kompetensi Baru" dihapus dari form Input Auditor Existing; penambahan kompetensi hanya lewat menu admin.
- Matriks Kompetensi, Evaluasi Training, Perencanaan Training, Dashboard, dan ekspor PDF semuanya membaca kategori dari Daftar Kompetensi sebagai single source of truth.
- Build harus lulus tanpa error setelah perubahan.

## Open questions & assumptions

- Asumsi: penambahan kompetensi hanya boleh dilakukan admin; auditor tidak memiliki akses ke menu Daftar Kompetensi.
- Belum dikonfirmasi: apakah perlu validasi duplikat nama kompetensi dalam kelompok yang sama.
- Belum dikonfirmasi: apakah perlu fitur hapus/arsip kompetensi dan dampaknya pada matriks historis.