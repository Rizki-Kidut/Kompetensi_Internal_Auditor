import * as XLSX from 'xlsx'

/**
 * Mirrors Q-119-ISE-001-FORM-006.
 * Builds one worksheet per auditor and returns a workbook.
 * Saves the file when batch=false (single auditor), or returns workbook for batch use.
 */
export function exportQualificationCard(auditor, revisionEntries, trainingEntries, batch = false) {
  const wb = XLSX.utils.book_new()
  const ws = buildSheet(auditor, revisionEntries, trainingEntries)
  XLSX.utils.book_append_sheet(wb, ws, auditor.name.substring(0, 31))
  if (!batch) {
    XLSX.writeFile(wb, `KartuRiwayat_${auditor.nik}_Q-119-ISE-001-FORM-006.xlsx`)
  }
  return wb
}

export function exportQualificationCardBatch(auditors, revisionEntriesMap, trainingEntriesMap) {
  const wb = XLSX.utils.book_new()
  for (const a of auditors.filter(a => a.status === 'Aktif')) {
    const ws = buildSheet(a, revisionEntriesMap[a.id] ?? [], trainingEntriesMap[a.id] ?? [])
    XLSX.utils.book_append_sheet(wb, ws, a.name.substring(0, 31))
  }
  XLSX.writeFile(wb, 'KartuRiwayat_Batch_Q-119-ISE-001-FORM-006.xlsx')
}

function buildSheet(auditor, revisionEntries, trainingEntries) {
  const rows = []

  // Title block
  rows.push(['PT INDONESIA STANLEY ELECTRIC'])
  rows.push(['KARTU RIWAYAT PERUBAHAN KUALIFIKASI DAN PELATIHAN KARYAWAN'])
  rows.push(['Q-119-ISE-001-FORM-006-REV.1'])
  rows.push([])

  // Identity
  rows.push(['NIK',   ':', auditor.nik,      'Seksi',    ':', auditor.section])
  rows.push(['Nama',  ':', auditor.name,     'Jabatan',  ':', auditor.position])
  rows.push(['Status',':', auditor.status])
  rows.push([])

  // Section 1: Riwayat Perubahan Kualifikasi
  rows.push(['RIWAYAT PERUBAHAN KUALIFIKASI'])
  rows.push(['No', 'Tanggal', 'Kualifikasi / Deskripsi Perubahan', 'No. Revisi', 'Paraf SM/DM'])

  const MAX_REV = 10
  for (let i = 0; i < MAX_REV; i++) {
    const r = revisionEntries[i]
    rows.push(r ? [i + 1, r.date, r.description, r.revisionNumber, ''] : [i + 1, '', '', '', ''])
  }
  rows.push([])

  // Section 2: Riwayat Pendidikan & Pelatihan
  rows.push(['RIWAYAT PENDIDIKAN DAN PELATIHAN (INTERNAL / EKSTERNAL)'])
  rows.push(['No', 'Tanggal', 'Seksi', 'Materi Pendidikan dan Pelatihan', 'Instruktur / Trainer', 'Nilai / Klas.', 'Paraf SM/DM'])

  const MAX_TRAIN = 15
  for (let i = 0; i < MAX_TRAIN; i++) {
    const t = trainingEntries[i]
    rows.push(t
      ? [i + 1, t.date, auditor.section, t.name, t.trainer ?? '-', t.score ? `${t.score} / ${t.classification}` : '-', '']
      : [i + 1, '', '', '', '', '', ''])
  }
  rows.push([])

  // Footer
  rows.push(['CATATAN:'])
  rows.push(['1.', 'Kartu ini dikelola dan disimpan di seksinya masing-masing'])
  rows.push(['2.', 'Kartu ini harap dibawa apabila mutasi ke seksi yang baru'])
  rows.push([])
  rows.push([`Dicetak: ${new Date().toLocaleString('id-ID')}`, '', '', '', '', 'Q-119-ISE-001-FORM-006-REV.1'])

  const ws = XLSX.utils.aoa_to_sheet(rows)

  // Column widths
  ws['!cols'] = [
    { wch: 5 }, { wch: 12 }, { wch: 55 }, { wch: 12 }, { wch: 18 }, { wch: 20 }, { wch: 16 },
  ]

  // Merge cells for title rows
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },  // Company name
    { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } },  // Title
    { s: { r: 2, c: 0 }, e: { r: 2, c: 5 } },  // Form number
    { s: { r: 8, c: 0 }, e: { r: 8, c: 5 } },  // Section 1 header
    { s: { r: 19, c: 0 }, e: { r: 19, c: 6 } }, // Section 2 header
  ]

  return ws
}
