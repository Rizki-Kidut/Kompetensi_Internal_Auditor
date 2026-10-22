import jsPDF from 'jspdf'
import 'jspdf-autotable'

export function exportAuditorList(auditors, revisionLog) {
  const doc  = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const PW   = doc.internal.pageSize.getWidth()
  const date = new Date().toLocaleDateString('id-ID')
  const yr   = new Date().getFullYear()

  // ── Header ──────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.text('PT INDONESIA STANLEY ELECTRIC', 14, 11)

  doc.setFontSize(12)
  doc.text('DAFTAR INTERNAL AUDITOR ISE', PW / 2, 10, { align: 'center' })
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(`PERIODE FISKAL ${yr} (APR ${yr - 1} ~ MAR ${yr})`, PW / 2, 15, { align: 'center' })
  doc.setFont('helvetica', 'bold')
  doc.text('QUALITY MANAGEMENT SYSTEM, PROSES MANUFAKTUR DAN SHIFT, PRODUK, SUPPLIER', PW / 2, 20, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.text(`Tgl. Terbit : ${date}`, PW - 14, 9,  { align: 'right' })
  doc.text(`Rev          : ${revisionLog.length}`,   PW - 14, 13, { align: 'right' })
  doc.text(`Tgl. Direvisi : ${revisionLog[0]?.date ?? '-'}`, PW - 14, 17, { align: 'right' })
  doc.text('Halaman      : 1/1', PW - 14, 21, { align: 'right' })

  // ── Main table ──────────────────────────────────────────────────────────
  const areaKeys = ['Area Produksi A', 'Area Produksi B', 'Gudang RM', 'Gudang FG', 'Maintenance']
  const active   = auditors.filter(a => a.status === 'Aktif')

  const head = [[
    { content: 'NO',         rowSpan: 2, styles: { valign: 'middle' } },
    { content: 'NAMA AUDITOR', rowSpan: 2, styles: { valign: 'middle', halign: 'left' } },
    { content: 'SEKSI',      rowSpan: 2, styles: { valign: 'middle', halign: 'left' } },
    { content: 'Scope Auditor', colSpan: 4, styles: { halign: 'center', fillColor: [14, 79, 163] } },
    { content: 'Penugasan Area Audit', colSpan: areaKeys.length, styles: { halign: 'center', fillColor: [21, 107, 60] } },
  ], [
    { content: 'QMS',              styles: { halign: 'center' } },
    { content: 'Mfg &\nShift',    styles: { halign: 'center' } },
    { content: 'Produk',           styles: { halign: 'center' } },
    { content: 'Supplier',         styles: { halign: 'center' } },
    ...areaKeys.map(k => ({ content: k.replace(' ', '\n'), styles: { halign: 'center', fontSize: 5.5 } })),
  ]]

  const body = active.map((a, i) => [
    i + 1,
    a.name,
    a.section,
    a.scopeAuditor?.qms             ? '♦' : '',
    a.scopeAuditor?.manufakturShift  ? '♦' : '',
    a.scopeAuditor?.produk           ? '♦' : '',
    a.scopeAuditor?.supplier         ? '♦' : '',
    ...areaKeys.map(k => a.areaAuditPermission?.[k] ?? ''),
  ])

  doc.autoTable({
    head,
    body,
    startY: 24,
    styles:     { fontSize: 7, cellPadding: 1.8, halign: 'center', valign: 'middle' },
    headStyles: { fillColor: [20, 60, 140], textColor: 255, fontStyle: 'bold', fontSize: 6.5, minCellHeight: 10 },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 42, halign: 'left' },
      2: { cellWidth: 32, halign: 'left' },
      3: { cellWidth: 11 }, 4: { cellWidth: 11 }, 5: { cellWidth: 11 }, 6: { cellWidth: 11 },
      7: { cellWidth: 22 }, 8: { cellWidth: 22 }, 9: { cellWidth: 20 }, 10: { cellWidth: 20 }, 11: { cellWidth: 20 },
    },
    alternateRowStyles: { fillColor: [245, 248, 252] },
    theme: 'grid',
  })

  let y = (doc.lastAutoTable?.finalY ?? 60) + 5

  // ── Revision log ────────────────────────────────────────────────────────
  doc.setFontSize(7.5).setFont('helvetica', 'bold')
  doc.text('RIWAYAT REVISI', 14, y); y += 3

  doc.autoTable({
    head: [['No', 'Isi Revisi', 'Tgl. Revisi']],
    body: revisionLog.slice(0, 6).map((r, i) => [
      i + 1,
      r.description.length > 140 ? r.description.substring(0, 140) + '…' : r.description,
      r.date,
    ]),
    startY: y,
    styles:     { fontSize: 6.5, cellPadding: 1.5 },
    headStyles: { fillColor: [70, 100, 160], textColor: 255, fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: 8 }, 1: { cellWidth: 210 }, 2: { cellWidth: 24, halign: 'center' } },
    tableWidth: 242,
    theme: 'grid',
  })

  y = (doc.lastAutoTable?.finalY ?? y) + 5

  // ── Legend ──────────────────────────────────────────────────────────────
  const PH = doc.internal.pageSize.getHeight()
  if (y < PH - 42) {
    doc.setFont('helvetica', 'bold').setFontSize(7)
    doc.text('KETERANGAN PENUGASAN AREA AUDIT', 14, y)
    doc.text('KETERANGAN SCOPE AUDITOR', 130, y)
    doc.setFont('helvetica', 'normal').setFontSize(6.5)
    doc.text('O = Boleh mengaudit area tersebut', 14, y + 4)
    doc.text('X = Tidak boleh mengaudit area tersebut', 14, y + 8)
    doc.text('♦ = Sudah mendapatkan training, memahami dan bisa menjalankannya', 130, y + 4)
    doc.text('● = Sudah mendapatkan training dan memahami point penting (perlu pendampingan)', 130, y + 8)
  }

  // ── Signature block ─────────────────────────────────────────────────────
  const sigY  = PH - 28
  const sigs  = ['DIBUAT', 'DIPERIKSA', 'DISETUJUI']
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
  doc.text('Q-120-ISE-001-FORM-012-REV.0', PW - 14, PH - 5, { align: 'right' })

  doc.save(`DaftarAuditor_Q-120-ISE-001-FORM-012.pdf`)
}
