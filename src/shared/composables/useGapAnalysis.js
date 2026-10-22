import { computed } from 'vue'
import { calcGapAnalysis } from '../../services/calculationService.js'

export function useGapAnalysis(auditors, items, matrix) {
  const gapData = computed(() =>
    calcGapAnalysis(auditors.value, items.value, matrix.value)
  )

  const totalGaps = computed(() =>
    gapData.value.reduce((acc, g) => acc + g.gapCount, 0)
  )

  const criticalItems = computed(() =>
    gapData.value.filter(g => g.gapCount > 0)
  )

  return { gapData, totalGaps, criticalItems }
}
