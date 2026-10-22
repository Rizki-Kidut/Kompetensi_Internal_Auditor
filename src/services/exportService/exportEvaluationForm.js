import jsPDF from 'jspdf'
import 'jspdf-autotable'

const SCORE_FIELDS = [
  { key: 'pemahamanIsi',         label: 'Pemahaman terhadap isi dan tujuan materi' },
  { key: 'peningkatanSkill',     label: 'Peningkatan skill / kompetensi' },
  { key: 'peningkatanKinerja',   label: 'Peningkatan kinerja' },
  { key: 'implementasi',         label: 'Implementasi terhadap pekerjaan' },
  { key: 'improvement',          label: 'Melakukan perbaikan sistem / improvement' },
  { key: 'mengajarkanOrangLain', label: 'Mampu mengajarkan kepada orang lain' },
]

function getSymbol(avg) {
  if (avg >= 90) return '★'
  if (avg >= 70) return '◆'
  return '●'
}

/**
 * @param {object} evaluation  - full evaluation record from evaluationStore
 * @param {object} auditor     - auditor record
 * @param {object} session     - training session record
 * @param {object} itemName    - competency item name (for skill map)
 */
export function exportEvaluationForm(evaluation, auditor, session, itemName = '') {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const PW  = doc.internal.pageSize.getWidth()
  const PH  = doc.internal.pageSize.getHeight()
  const MX  = 14 // margin x

  // ── Logo / Company ───────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold').setFontSize(16)
  doc.text('STANLEY', MX, 16)
  doc.setFontSize(7).setFont('helvetica', 'normal')
  doc.text('PT INDONESIA STANLEY ELECTRIC', MX, 20)

  doc.setFontSize(12).setFont('helvetica', 'bold')
  doc.text('EVALUASI/MONITORING HASIL PELATIHAN', PW / 2, 14, { align: 'center' })
  doc.setFontSize(6.5).setFont('helvetica', 'italic')
  doc.text('Q-119-ISE-001-FORM-010-REV.4', PW - MX, 8, { align: 'right' })

  // Divider
  doc.setLineWidth(0.5).line(MX, 22, PW - MX, 22)

  // ── Header info ──────────────────────────────────────────────────────────
  let y = 28
  const infoRows = [
    ['NAMA PELATIHAN',       session?.trainingName ?? '-'],
    ['TGL PELATIHAN',        session?.date ?? '-'],
    ['PENYELENGGARA',        session?.organizer ?? '-'],
    ['TRAINER',              session?.trainer ?? '-'],
    ['NIK / NAMA PESERTA',  `${auditor?.nik ?? '-'} / ${auditor?.name ?? '-'}`],
    ['SEKSI',                auditor?.section ?? '-'],
    ['TANGGAL EVALUASI',     evaluation.evaluationDate ?? '-'],
  ]
  doc.setFont('helvetica', 'normal').setFontSize(8)
  infoRows.forEach(([lbl, val]) => {
    doc.setFont('helvetica', 'bold')
    doc.text(`${lbl}`, MX, y)
    doc.setFont('helvetica', 'normal')
    doc.text(`: ${val}`, MX + 46, y)
    y += 5
  })
  y += 2
  doc.setLineWidth(0.3).line(MX, y, PW - MX, y); y += 4

  // ── Section A + B side-by-side ───────────────────────────────────────────
  const midX  = PW / 2 - 2
  const rightX = midX + 6

  // Left: Section A scores table
  const totalA = SCORE_FIELDS.reduce((s, f) => s + (Number(evaluation.scoresUmum?.[f.key]) || 0), 0)
  const avg    = evaluation.rataRataNilaiA ?? 0
  const sym    = getSymbol(avg)

  const scoreRows = SCORE_FIELDS.map((f, i) => [
    i + 1,
    f.label,
    evaluation.scoresUmum?.[f.key] ?? '-',
  ])
  // Khusus rows (blank if none)
  const khususRows = (evaluation.scoresKhusus ?? []).map((k, i) => [
    `K${i + 1}`,
    k.label,
    k.score ?? '-',
  ])
  if (!khususRows.length) {
    scoreRows.push(['', 'Penilaian Khusus (tidak ada)', ''])
  }

  doc.setFont('helvetica', 'bold').setFontSize(8)
  doc.text('A.  Penilaian oleh Pimpinan Kerja', MX, y)

  doc.autoTable({
    head: [['No', 'Kriteria Evaluasi', 'Nilai\n(10-100)']],
    body: [
      ...scoreRows,
      ...(khususRows.length ? [['', 'Penilaian Khusus:', ''], ...khususRows] : []),
      ['', { content: 'TOTAL NILAI A', styles: { fontStyle: 'bold' } },       { content: totalA, styles: { fontStyle: 'bold' } }],
      ['', { content: 'RATA-RATA NILAI', styles: { fontStyle: 'bold' } },     { content: avg.toFixed(2), styles: { fontStyle: 'bold' } }],
    ],
    startY: y + 4,
    margin: { left: MX, right: PW - midX },
    styles:     { fontSize: 7.5, cellPadding: 1.8, valign: 'middle' },
    headStyles: { fillColor: [20, 60, 140], textColor: 255, fontStyle: 'bold', fontSize: 7, halign: 'center' },
    columnStyles: {
      0: { cellWidth: 8,  halign: 'center' },
      1: { cellWidth: 70, halign: 'left'   },
      2: { cellWidth: 16, halign: 'center' },
    },
    theme: 'grid',
  })

  const tableEndY = doc.lastAutoTable?.finalY ?? (y + 60)

  // Right: Section B (test score + classification + skill map)
  let ry = y
  doc.setFont('helvetica', 'bold').setFontSize(8)
  doc.text('B.  Hasil Tes Tertulis  (10-100)', rightX, ry)
  ry += 5

  // Big test score box
  const testScore = evaluation.hasilTesTertulis ?? 0
  doc.rect(rightX, ry, 55, 20)
  doc.setFontSize(22).setFont('helvetica', 'bold')
  doc.text(String(testScore), rightX + 27.5, ry + 14, { align: 'center' })
  ry += 24

  // Classification legend
  doc.setFontSize(7).setFont('helvetica', 'bold')
  doc.text('Keterangan Pengisian Nilai:', rightX, ry); ry += 4
  doc.setFont('helvetica', 'normal')
  const classRows = ['90 – 100  : Memuaskan', '80 – 89   : Baik', '70 – 79   : Cukup', '≤ 69        : Kurang']
  classRows.forEach(t => { doc.text(t, rightX + 2, ry); ry += 3.5 })

  ry += 3
  // Summary box
  doc.setFontSize(7).setFont('helvetica', 'bold')
  doc.autoTable({
    head: [['', '']],
    body: [
      ['TOTAL NILAI A',  totalA],
      ['RATA-RATA NILAI', avg.toFixed(2)],
    ],
    startY: ry,
    margin: { left: rightX, right: MX },
    styles:     { fontSize: 8, cellPadding: 2, fontStyle: 'bold' },
    headStyles: { fillColor: [240, 240, 240], textColor: [50, 50, 50], fontSize: 1, minCellHeight: 0 },
    columnStyles: {
      0: { cellWidth: 38, halign: 'left'   },
      1: { cellWidth: 17, halign: 'center' },
    },
    theme: 'grid',
  })
  ry = (doc.lastAutoTable?.finalY ?? ry) + 4

  // Rata-rata symbol legend
  doc.setFontSize(7).setFont('helvetica', 'bold')
  doc.text('RATA-RATA NILAI :', rightX, ry); ry += 4
  doc.setFont('helvetica', 'normal')
  doc.text('★  =  90 – 100  (Memuaskan)', rightX + 2, ry); ry += 3.5
  doc.text('◆  =  70 – 89   (Kompeten)',  rightX + 2, ry); ry += 3.5
  doc.text('●  =  ≤ 69         (Perlu Pendampingan)', rightX + 2, ry); ry += 5

  // Skill map update
  if (evaluation.skillMapUpdate?.competencyItemId) {
    doc.setFont('helvetica', 'bold').setFontSize(7)
    doc.text('UPDATE SKILL MAP', rightX, ry); ry += 1
    doc.setFont('helvetica', 'italic').setFontSize(6)
    doc.text('(diisi dengan simbol)', rightX, ry + 3); ry += 4
    doc.autoTable({
      head: [],
      body: [
        ['TARGET', evaluation.skillMapUpdate.target ?? '◆'],
        ['BEFORE', evaluation.skillMapUpdate.before ?? '—'],
        ['AFTER',  evaluation.skillMapUpdate.after  ?? '—'],
      ],
      startY: ry,
      margin: { left: rightX, right: MX },
      styles: { fontSize: 9, fontStyle: 'bold', cellPadding: 2, halign: 'center' },
      columnStyles: {
        0: { cellWidth: 22, halign: 'left', fontStyle: 'normal', fontSize: 7 },
        1: { cellWidth: 14, halign: 'center', fontStyle: 'bold', fontSize: 12 },
      },
      theme: 'grid',
    })
    ry = (doc.lastAutoTable?.finalY ?? ry) + 3
  }

  // Overall classification symbol
  doc.setFont('helvetica', 'bold').setFontSize(9)
  doc.text(`Klasifikasi: ${sym}`, rightX, ry); ry += 4
  doc.setFontSize(6.5).setFont('helvetica', 'normal')
  doc.text('Jika hasil pelatihan tidak sesuai target maka dilakukan training ulang', rightX, ry)

  // ── Kesimpulan ───────────────────────────────────────────────────────────
  const conclusionY = Math.max(tableEndY, ry) + 6
  doc.setLineWidth(0.3).line(MX, conclusionY - 2, PW - MX, conclusionY - 2)
  doc.setFont('helvetica', 'bold').setFontSize(8)
  doc.text('Kesimpulan / Komentar Pimpinan Kerja :', MX, conclusionY)

  const kesimpulan = evaluation.kesimpulan?.trim() || '—'
  doc.setFont('helvetica', 'normal').setFontSize(8)
  const lines = doc.splitTextToSize(kesimpulan, PW - MX * 2)
  doc.text(lines, MX, conclusionY + 6)

  // Dotted lines for handwritten notes
  let dotY = conclusionY + 6 + lines.length * 4 + 2
  for (let i = 0; i < 4; i++) {
    doc.setLineDash([1, 2])
    doc.line(MX, dotY, PW - MX, dotY)
    dotY += 5
  }
  doc.setLineDash([])

  // ── Keterangan Simbol ─────────────────────────────────────────────────────
  dotY += 2
  doc.setFont('helvetica', 'bold').setFontSize(7)
  doc.text('Keterangan Simbol :', MX, dotY); dotY += 4
  doc.setFont('helvetica', 'normal').setFontSize(6.5)
  doc.text('★  :  Sudah mendapatkan training, memahami, bisa menjalankan Dan Bisa Mengajarkan Kepada Orang Lain', MX, dotY); dotY += 3.5
  doc.text('◆  :  Sudah mendapatkan training, memahami Dan Bisa Menjalankannya', MX, dotY); dotY += 3.5
  doc.text('●  :  Sudah mendapatkan training Dan Memahami Point Penting', MX, dotY); dotY += 6

  // ── Approval block ────────────────────────────────────────────────────────
  const sigY  = Math.min(dotY, PH - 32)
  const chain = evaluation.approvalChain ?? []
  const sigLabels = chain.length
    ? ['PESERTA TRAINING', ...chain.map(s => s.role.toUpperCase())]
    : ['PESERTA TRAINING', 'SECT. MANAGER SEKSI', 'SECT. MANAGER QA']
  const sigCount = sigLabels.length
  const boxW  = (PW - MX * 2) / sigCount

  doc.setFont('helvetica', 'bold').setFontSize(7)
  sigLabels.forEach((lbl, i) => {
    const x = MX + i * boxW + boxW / 2
    doc.text(lbl, x, sigY, { align: 'center' })
    doc.rect(MX + i * boxW, sigY + 2, boxW, 20)
    // If chain step has a name + date, add it
    if (i > 0) {
      const step = chain[i - 1]
      if (step?.name) {
        doc.setFont('helvetica', 'italic').setFontSize(6)
        doc.text(step.name, x, sigY + 14, { align: 'center' })
        doc.text(step.date ?? '', x, sigY + 18, { align: 'center' })
        doc.setFont('helvetica', 'bold').setFontSize(7)
      }
    }
  })

  doc.setFontSize(6).setFont('helvetica', 'italic')
  doc.text('Q-119-ISE-001-FORM-010-REV.4', PW - MX, PH - 5, { align: 'right' })

  doc.save(`EvaluasiTraining_${auditor?.nik ?? 'unknown'}_${evaluation.evaluationDate ?? ''}.pdf`)
}
