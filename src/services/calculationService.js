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
 * LMS score thresholds for level suggestion (adjust as needed).
 */
export const LMS_RULES = { testPass: 80, workshopPass: 80, starScore: 90 }

const _LVL_RANK = { '': 0, '●': 2, '◆': 3, '★': 4 }

/**
 * Suggest a competency level upgrade based on LMS results.
 *
 * Rules:
 * - If test < testPass or workshop < workshopPass → no suggestion ('').
 * - If both pass → suggest the course target level, but capped at ◆ for a draft.
 * - Suggest ★ only if test >= starScore AND workshop >= starScore AND avg eval >= 90
 *   (returned separately so the UI can show it as guidance, not auto-fill).
 *
 * @param {{testScore?: number, workshopScore?: number, before?: string, target?: string, avgEval?: number}} input
 * @returns {{suggested: string, starEligible: boolean}}
 */
export function suggestLevelFromLms(input) {
  const { testScore = 0, workshopScore = 0, before = '', target = '◆', avgEval = 0 } = input
  const testPass = LMS_RULES.testPass
  const workshopPass = LMS_RULES.workshopPass
  const starScore = LMS_RULES.starScore

  const testOk = testScore >= testPass
  const workshopOk = workshopScore == null || workshopScore >= workshopPass

  if (!testOk || !workshopOk) return { suggested: '', starEligible: false }

  const starEligible = testScore >= starScore && (workshopScore == null || workshopScore >= starScore) && avgEval >= 90

  // Cap at ◆ for draft; ★ only as guidance
  let suggested = target === '★' ? '◆' : target

  // Don't suggest lower or equal to current
  if (_LVL_RANK[before] >= _LVL_RANK[suggested]) suggested = ''

  return { suggested, starEligible }
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
