import jsPDF from 'jspdf'
import 'jspdf-autotable'

const CATEGORIES = [
  'Auditor QMS',
  'Audit Manufaktur dan Shift',
  'Audit Produk',
  'Audit Supplier',
]
const CAT_COLORS = [
  [14, 79, 163],   // blue  — QMS
  [21, 107, 60],   // green — Manufaktur
  [140, 70, 20],   // brown — Produk
  [100, 20, 120],  // purple — Supplier
]

export function exportCompetencyMatrix(auditors, items, matrix, revisionLog) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const PW  = doc.internal.pageSize.getWidth()
  const PH  = doc.internal.pageSize.getHeight()
  const date = new Date().toLocaleDateString('id-ID')

  // ── Header ──────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold').setFontSize(8)
  doc.text('PT INDONESIA STANLEY ELECTRIC', 14, 11)

  doc.setFontSize(12)
  doc.text('Standard Kompetensi Auditor', PW / 2, 10, { align: 'center' })
  doc.setFontSize(8).setFont('helvetica', 'normal')
  doc.text('Internal Auditor — QMS, Manufaktur & Shift, Produk, Supplier', PW / 2, 15, { align: 'center' })

  doc.setFontSize(6.5)
  doc.text(`Tgl. Terbit : ${date}`, PW - 14, 9,  { align: 'right' })
  doc.text(`Rev          : ${revisionLog.length}`,   PW - 14, 13, { align: 'right' })
  doc.text('Halaman      : 1/1', PW - 14, 17, { align: 'right' })

  // ── Build head: 2 rows — row1 = category span, row2 = item names ────────
  const grouped = CATEGORIES.map((cat, ci) => ({
    cat,
    color: CAT_COLORS[ci],
    items: items.filter(i => i.category === cat),
  }))
  const allItems = grouped.flatMap(g => g.items)

  const headRow1 = [
    { content: 'NO',    rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
    { content: 'NAMA',  rowSpan: 2, styles: { valign: 'middle', halign: 'left'   } },
    { content: 'SEKSI', rowSpan: 2, styles: { valign: 'middle', halign: 'left'   } },
    ...grouped.map(g => ({
      content: g.cat,
      colSpan: g.items.length,
      styles: { halign: 'center', fillColor: g.color, fontStyle: 'bold', fontSize: 6 },
    })),
  ]
  const headRow2 = allItems.map(it => ({
    content: it.itemName.length > 15 ? it.itemName.substring(0, 14) + '…' : it.itemName,
    styles:  { halign: 'center', fontSize: 5.5, cellWidth: 14 },
  }))

  // ── Build body ──────────────────────────────────────────────────────────
  const active = auditors.filter(a => a.status === 'Aktif')
  const body   = active.map((a, i) => [
    i + 1,
    a.name,
    a.section,
    ...allItems.map(item => {
      const cell = matrix.find(c => c.auditorId === a.id && c.itemId === item.id)
      return cell?.level || '—'
    }),
  ])

  // ── Column styles ────────────────────────────────────────────────────────
  const colStyles = {
    0: { cellWidth: 8,  halign: 'center' },
    1: { cellWidth: 38, halign: 'left'   },
    2: { cellWidth: 28, halign: 'left'   },
  }
  allItems.forEach((_, idx) => {
    colStyles[idx + 3] = { cellWidth: 14, halign: 'center' }
  })

  // Map item → category for body cell coloring
  const itemCatMap = {}
  allItems.forEach((item, idx) => {
    const ci = grouped.findIndex(g => g.items.some(i => i.id === item.id))
    itemCatMap[idx + 3] = ci
  })

  doc.autoTable({
    head: [headRow1, headRow2],
    body,
    startY: 22,
    styles:     { fontSize: 7, cellPadding: 1.5, valign: 'middle', halign: 'center' },
    headStyles: { fillColor: [20, 60, 140], textColor: 255, fontStyle: 'bold', minCellHeight: 8 },
    columnStyles: colStyles,
    alternateRowStyles: { fillColor: [245, 248, 252] },
    theme: 'grid',
    didParseCell(data) {
      if (data.section === 'body') {
        const ci = itemCatMap[data.column.index]
        if (ci !== undefined) {
          const c = CAT_COLORS[ci]
          // Tint body cells by category (very light)
          const tint = [200 + c[0] / 10, 220, 230]
          if (data.row.index % 2 === 0) data.cell.styles.fillColor = tint
        }
        // Color the symbol
        const v = data.cell.raw
        if (v === '★') data.cell.styles.textColor = [180, 120, 0]
        else if (v === '◆') data.cell.styles.textColor = [20, 80, 180]
        else if (v === '●') data.cell.styles.textColor = [20, 130, 60]
      }
    },
  })

  let y = (doc.lastAutoTable?.finalY ?? 80) + 5

  // ── Revision log ────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold').setFontSize(7.5)
  doc.text('RIWAYAT REVISI', 14, y); y += 3

  doc.autoTable({
    head: [['No', 'Isi Revisi', 'Tgl. Revisi']],
    body: revisionLog.slice(0, 5).map((r, i) => [
      i + 1,
      r.description.length > 160 ? r.description.substring(0, 160) + '…' : r.description,
      r.date,
    ]),
    startY: y,
    styles:     { fontSize: 6.5, cellPadding: 1.5 },
    headStyles: { fillColor: [70, 100, 160], textColor: 255 },
    columnStyles: { 0: { cellWidth: 8 }, 1: { cellWidth: 220 }, 2: { cellWidth: 24, halign: 'center' } },
    tableWidth: 252,
    theme: 'grid',
  })

  y = (doc.lastAutoTable?.finalY ?? y) + 4

  // ── Legend ──────────────────────────────────────────────────────────────
  if (y < PH - 42) {
    doc.setFont('helvetica', 'bold').setFontSize(7)
    doc.text('KETERANGAN', 14, y); y += 4
    doc.setFont('helvetica', 'normal').setFontSize(6.5)
    const legends = [
      '★  :  Sudah mendapatkan training, memahami, bisa menjalankan Dan Bisa Mengajarkan Kepada Orang Lain (Sangat Kompeten, ≥ 90)',
      '◆  :  Sudah mendapatkan training, memahami Dan Bisa Menjalankannya (Kompeten, 70–89)',
      '●  :  Sudah mendapatkan training Dan Memahami Point Penting / Perlu Pendampingan (Cukup Kompeten, < 70)',
      '—  :  Belum pernah mendapatkan training pada item tersebut',
    ]
    legends.forEach(txt => { doc.text(txt, 14, y); y += 4 })
  }

  // ── Signature block ─────────────────────────────────────────────────────
  const sigY  = PH - 28
  const sigs  = ['Dibuat', 'Diperiksa', 'Disetujui']
  const sigXs = [PW - 170, PW - 110, PW - 52]
  doc.setFontSize(7)
  sigs.forEach((lbl, i) => {
    doc.setFont('helvetica', 'bold')
    doc.text(lbl, sigXs[i], sigY, { align: 'center' })
    doc.rect(sigXs[i] - 26, sigY + 1, 52, 18)
    doc.setFont('helvetica', 'normal')
    doc.text('( ........................ )', sigXs[i], sigY + 17, { align: 'center' })
  })
  doc.setFontSize(6).setFont('helvetica', 'italic')
  doc.text('Q-120-ISE-001-FORM-013-REV.0', PW - 14, PH - 5, { align: 'right' })

  doc.save('MatrixKompetensi_Q-120-ISE-001-FORM-013.pdf')
}
