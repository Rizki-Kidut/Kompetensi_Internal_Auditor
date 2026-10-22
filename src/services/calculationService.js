/**
 * Pure functions for score calculation and gap analysis.
 * No Vue/Pinia imports — safe to call anywhere.
 */

/** @param {import('../types/models').ScoreUmum} scoresUmum @param {Array} scoresKhusus */
export function calcTotalNilaiA(scoresUmum, scoresKhusus = []) {
  const umumValues = Object.values(scoresUmum).filter(v => v !== null && v !== '' && !isNaN(Number(v)))
  const khususValues = scoresKhusus.map(s => s.score).filter(v => v !== null && v !== '' && !isNaN(Number(v)))
  return [...umumValues, ...khususValues].reduce((acc, v) => acc + Number(v), 0)
}

/** @param {import('../types/models').ScoreUmum} scoresUmum @param {Array} scoresKhusus */
export function calcRataRataNilaiA(scoresUmum, scoresKhusus = []) {
  const umumValues = Object.values(scoresUmum).filter(v => v !== null && v !== '' && !isNaN(Number(v)))
  const khususValues = scoresKhusus.map(s => s.score).filter(v => v !== null && v !== '' && !isNaN(Number(v)))
  const all = [...umumValues, ...khususValues]
  if (!all.length) return 0
  return all.reduce((acc, v) => acc + Number(v), 0) / all.length
}

/** @param {number} avg */
export function classifyNilai(avg) {
  if (avg >= 90) return 'Memuaskan'
  if (avg >= 80) return 'Baik'
  if (avg >= 70) return 'Cukup'
  return 'Kurang'
}

const LEVEL_RANK = { '': 0, '△': 1, '●': 2, '◆': 3, '★': 4 }

/** Returns true if actualLevel meets or exceeds targetLevel */
export function meetsTarget(actualLevel, targetLevel = '◆') {
  return (LEVEL_RANK[actualLevel] ?? 0) >= (LEVEL_RANK[targetLevel] ?? 0)
}

/**
 * @param {import('../types/models').Auditor[]} auditors
 * @param {import('../types/models').CompetencyItem[]} items
 * @param {import('../types/models').CompetencyCell[]} matrix
 * @returns {{ item: import('../types/models').CompetencyItem, gapAuditors: import('../types/models').Auditor[], gapCount: number }[]}
 */
export function calcGapAnalysis(auditors, items, matrix) {
  const activeAuditors = auditors.filter(a => a.status === 'Aktif')
  return items.map(item => {
    const gapAuditors = activeAuditors.filter(auditor => {
      const cell = matrix.find(c => c.auditorId === auditor.id && c.itemId === item.id)
      const level = cell ? cell.level : ''
      return !meetsTarget(level, '◆')
    })
    return { item, gapAuditors, gapCount: gapAuditors.length }
  }).sort((a, b) => b.gapCount - a.gapCount)
}

/**
 * Build approval chain based on auditor position.
 * @param {string} position
 * @returns {import('../types/models').ApprovalStep[]}
 */
export function buildApprovalChain(_position) {
  return [
    { role: 'Section Manager Seksi', name: '', status: 'Pending', date: null, note: '' },
    { role: 'Section Manager QA',    name: '', status: 'Pending', date: null, note: '' },
  ]
}
