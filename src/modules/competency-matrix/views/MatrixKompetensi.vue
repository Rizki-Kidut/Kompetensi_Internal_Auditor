<script setup>
import { ref, computed, onMounted } from 'vue'
import { FileDown, Info } from '@lucide/vue'
import { useAuditorStore }      from '../../../stores/auditorStore.js'
import { useCompetencyStore }   from '../../../stores/competencyStore.js'
import { useRevisionLogStore }  from '../../../stores/revisionLogStore.js'
import { useEvaluationStore }   from '../../../stores/evaluationStore.js'
import { useTrainingSessionStore } from '../../../stores/trainingSessionStore.js'
import { exportCompetencyMatrix }  from '../../../services/exportService/exportCompetencyMatrix.js'
import CompetencyCell   from '../components/CompetencyCell.vue'
import CompetencySymbol from '../../../shared/components/CompetencySymbol.vue'
import BaseModal        from '../../../shared/components/BaseModal.vue'
import StatusBadge      from '../../../shared/components/StatusBadge.vue'

const auditorStore  = useAuditorStore()
const competency    = useCompetencyStore()
const revisionStore = useRevisionLogStore()
const evalStore     = useEvaluationStore()
const sessionStore  = useTrainingSessionStore()

onMounted(() => {
  auditorStore.load()
  competency.load()
  revisionStore.load()
  evalStore.load()
  sessionStore.load()
})

// ─── Constants ────────────────────────────────────────────
const CATEGORIES = ['Auditor QMS', 'Audit Manufaktur dan Shift', 'Audit Produk', 'Audit Supplier']

const CAT_STYLE = {
  'Auditor QMS':                { bg: 'bg-blue-800',    text: 'text-blue-50',    border: 'border-blue-700' },
  'Audit Manufaktur dan Shift': { bg: 'bg-teal-800',    text: 'text-teal-50',    border: 'border-teal-700' },
  'Audit Produk':               { bg: 'bg-emerald-800', text: 'text-emerald-50', border: 'border-emerald-700' },
  'Audit Supplier':             { bg: 'bg-amber-700',   text: 'text-amber-50',   border: 'border-amber-600' },
}

const LEVEL_RANK  = { '': 0, '●': 2, '◆': 3, '★': 4 }
const LEVEL_LABEL = { '★': 'Sangat Kompeten', '◆': 'Kompeten', '●': 'Cukup Kompeten', '': 'Belum Dinilai' }

// ─── Filters ──────────────────────────────────────────────
const search         = ref('')
const sectionFilter  = ref('')
const categoryFilter = ref('Semua')

const sections = computed(() => {
  const s = new Set(auditorStore.auditors.filter(a => a.status === 'Aktif').map(a => a.section))
  return [...s].sort()
})

const visibleAuditors = computed(() =>
  auditorStore.auditors
    .filter(a => a.status === 'Aktif')
    .filter(a => !sectionFilter.value || a.section === sectionFilter.value)
    .filter(a => !search.value || a.name.toLowerCase().includes(search.value.toLowerCase()))
)

const visibleItems = computed(() =>
  categoryFilter.value === 'Semua'
    ? competency.items
    : competency.items.filter(i => i.category === categoryFilter.value)
)

// Only include categories that have at least one visible item
const itemsByCategory = computed(() => {
  const map = {}
  for (const cat of CATEGORIES) {
    const catItems = visibleItems.value.filter(i => i.category === cat)
    if (catItems.length) map[cat] = catItems
  }
  return map
})

// ─── Cell helpers ─────────────────────────────────────────
function getLevel(auditorId, itemId) {
  return competency.getCell(auditorId, itemId)?.level ?? ''
}

function isGap(level) {
  return (LEVEL_RANK[level] ?? 0) < LEVEL_RANK['◆']
}

// ─── Column gap stats ─────────────────────────────────────
function colStats(itemId) {
  const auditors = visibleAuditors.value
  const gaps = auditors.filter(a => isGap(getLevel(a.id, itemId))).length
  return { gaps, total: auditors.length }
}

// ─── Summary stats ────────────────────────────────────────
const totalGaps = computed(() => {
  let n = 0
  for (const a of visibleAuditors.value)
    for (const i of visibleItems.value)
      if (isGap(getLevel(a.id, i.id))) n++
  return n
})

const gapAuditorCount = computed(() => {
  const s = new Set()
  for (const a of visibleAuditors.value)
    for (const i of visibleItems.value)
      if (isGap(getLevel(a.id, i.id))) s.add(a.id)
  return s.size
})

// ─── Cell history modal ───────────────────────────────────
const histOpen     = ref(false)
const histAuditor  = ref(null)
const histItem     = ref(null)
const histCell     = ref(null)

function openHistory(auditor, item) {
  histAuditor.value = auditor
  histItem.value    = item
  histCell.value    = competency.getCell(auditor.id, item.id) ?? null
  histOpen.value    = true
}

const histRevisions = computed(() => {
  if (!histAuditor.value || !histItem.value) return []
  const aName = histAuditor.value.name
  const iName = histItem.value.itemName
  return revisionStore.entries
    .filter(e => e.type === 'Matrix Kompetensi' && e.description.includes(aName) && e.description.includes(iName))
    .sort((a, b) => b.date.localeCompare(a.date))
})

const histSourceEval = computed(() => {
  if (!histCell.value?.sourceEvaluationId) return null
  return evalStore.evaluations.find(e => e.id === histCell.value.sourceEvaluationId) ?? null
})

const histTrainingName = computed(() => {
  if (!histSourceEval.value) return null
  return sessionStore.sessions.find(s => s.id === histSourceEval.value.sessionId)?.trainingName ?? null
})

const histCurrentLevel = computed(() => histCell.value?.level ?? '')
const histMeetsTarget  = computed(() => !isGap(histCurrentLevel.value))

// ─── Export ───────────────────────────────────────────────
function doExport() {
  exportCompetencyMatrix(
    visibleAuditors.value,
    visibleItems.value,
    competency.matrix,
    revisionStore.entries,
  )
}
</script>

<template>
  <div class="p-6 fade-in">

    <!-- Header -->
    <div class="flex items-start justify-between mb-5">
      <div>
        <h1 class="text-2xl font-bold text-slate-800">Matrix Kompetensi</h1>
        <p class="text-slate-500 text-sm mt-1">Standard kompetensi auditor · klik sel untuk riwayat perubahan</p>
      </div>
      <button class="btn-secondary flex items-center gap-2" @click="doExport">
        <FileDown class="w-4 h-4" />
        Export PDF
      </button>
    </div>

    <!-- Filters row -->
    <div class="ct-card p-4 mb-4 flex flex-wrap items-center gap-3">
      <input v-model="search" class="ct-input w-48" placeholder="Cari nama auditor..." />

      <select v-model="sectionFilter" class="ct-input w-44">
        <option value="">Semua Seksi</option>
        <option v-for="s in sections" :key="s" :value="s">{{ s }}</option>
      </select>

      <div class="flex flex-wrap gap-1.5 ml-auto">
        <button
          v-for="cat in ['Semua', ...CATEGORIES]"
          :key="cat"
          :class="categoryFilter === cat ? 'btn-primary' : 'btn-secondary'"
          class="text-xs px-3 py-1.5"
          @click="categoryFilter = cat"
        >
          {{ cat === 'Audit Manufaktur dan Shift' ? 'Mfg Shift' : cat }}
        </button>
      </div>
    </div>

    <!-- Summary stats + legend -->
    <div class="flex flex-wrap items-center gap-3 mb-3">
      <!-- Stats chips -->
      <div class="flex items-center gap-1.5 bg-blue-50 border border-blue-100 rounded-full px-3 py-1.5">
        <span class="text-blue-600 font-bold text-sm">{{ visibleAuditors.length }}</span>
        <span class="text-blue-500 text-xs">auditor</span>
      </div>
      <div class="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-full px-3 py-1.5">
        <span class="text-slate-700 font-bold text-sm">{{ visibleItems.length }}</span>
        <span class="text-slate-500 text-xs">item kompetensi</span>
      </div>
      <div
        :class="totalGaps > 0 ? 'bg-red-50 border-red-100 text-red-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600'"
        class="flex items-center gap-1.5 border rounded-full px-3 py-1.5"
      >
        <span class="font-bold text-sm">{{ totalGaps }}</span>
        <span class="text-xs opacity-80">total gap</span>
      </div>
      <div v-if="gapAuditorCount > 0" class="flex items-center gap-1.5 bg-amber-50 border border-amber-100 rounded-full px-3 py-1.5">
        <span class="text-amber-600 font-bold text-sm">{{ gapAuditorCount }}</span>
        <span class="text-amber-500 text-xs">auditor perlu training</span>
      </div>

      <div class="ml-auto flex flex-wrap items-center gap-3">
        <span class="text-slate-400 text-xs">Legend:</span>
        <div v-for="level in ['★','◆','●','']" :key="level" class="flex items-center gap-1">
          <CompetencySymbol :level="level" size="sm" />
          <span class="text-xs text-slate-500">{{ LEVEL_LABEL[level] }}</span>
        </div>
        <div class="flex items-center gap-1">
          <span class="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
          <span class="text-xs text-slate-500">Gap</span>
        </div>
      </div>
    </div>

    <!-- Matrix table -->
    <div class="ct-card overflow-hidden">
      <div class="overflow-auto" style="max-height: calc(100vh - 320px); min-height: 250px;">
        <table class="border-collapse text-sm" style="min-width: max-content; width: 100%;">
          <thead>

            <!-- ── Row 1: Category group headers ── -->
            <tr style="height: 32px;">
              <!-- Corner cell: spans both header rows -->
              <th
                rowspan="2"
                class="bg-slate-800 text-white font-semibold text-left px-4"
                style="position: sticky; top: 0; left: 0; z-index: 40; min-width: 175px; vertical-align: middle;"
              >
                <span class="text-xs uppercase tracking-wide opacity-80">Auditor</span>
              </th>
              <th
                v-for="(catItems, cat) in itemsByCategory"
                :key="cat"
                :colspan="catItems.length"
                :class="[CAT_STYLE[cat]?.bg, CAT_STYLE[cat]?.text, 'text-center border-l-2 border-white/30 px-2']"
                style="position: sticky; top: 0; z-index: 30; font-size: 10px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; height: 32px;"
              >
                {{ cat }}
              </th>
            </tr>

            <!-- ── Row 2: Item name headers (rotated) ── -->
            <tr>
              <th
                v-for="item in visibleItems"
                :key="item.id"
                class="bg-slate-50 border-b-2 border-slate-300 border-l border-slate-200"
                style="position: sticky; top: 32px; z-index: 25; min-width: 72px; height: 96px; padding: 4px 3px; vertical-align: bottom;"
              >
                <div
                  class="text-slate-600 font-medium"
                  style="writing-mode: vertical-lr; transform: rotate(180deg); font-size: 11px; padding-bottom: 4px; overflow: hidden; max-height: 88px; white-space: nowrap;"
                  :title="item.itemName"
                >
                  {{ item.itemName }}
                </div>
              </th>
            </tr>

          </thead>

          <tbody>

            <!-- ── Gap count totals row ── -->
            <tr class="bg-slate-50 border-b border-slate-200">
              <td
                class="bg-slate-100 text-slate-500 font-bold uppercase tracking-wide px-4 py-2 border-r border-slate-200"
                style="position: sticky; left: 0; z-index: 10; font-size: 9px;"
              >
                Gap / Total
              </td>
              <td
                v-for="item in visibleItems"
                :key="item.id"
                class="text-center py-1.5 border-l border-slate-200"
                style="min-width: 72px;"
              >
                <template v-if="colStats(item.id).gaps > 0">
                  <span class="ct-badge ct-badge-red">{{ colStats(item.id).gaps }}/{{ colStats(item.id).total }}</span>
                </template>
                <span v-else class="ct-badge ct-badge-emerald">OK</span>
              </td>
            </tr>

            <!-- ── Auditor data rows ── -->
            <template v-if="visibleAuditors.length">
              <tr
                v-for="auditor in visibleAuditors"
                :key="auditor.id"
                class="border-b border-slate-100 hover:bg-blue-50/20 transition-colors"
              >
                <!-- Sticky name column -->
                <td
                  class="bg-white border-r border-slate-200 px-4 py-2"
                  style="position: sticky; left: 0; z-index: 10;"
                >
                  <div class="font-semibold text-slate-700 text-sm whitespace-nowrap">{{ auditor.name }}</div>
                  <div class="text-slate-400 text-xs whitespace-nowrap">{{ auditor.section }} · {{ auditor.position }}</div>
                </td>

                <!-- Competency cells -->
                <td
                  v-for="item in visibleItems"
                  :key="item.id"
                  class="border-l border-slate-100 px-0.5 py-0.5"
                  :class="isGap(getLevel(auditor.id, item.id)) ? 'bg-red-50/40' : ''"
                  style="min-width: 72px;"
                >
                  <CompetencyCell
                    :level="getLevel(auditor.id, item.id)"
                    :is-gap="isGap(getLevel(auditor.id, item.id))"
                    @click="openHistory(auditor, item)"
                  />
                </td>
              </tr>
            </template>

            <!-- Empty state -->
            <tr v-else>
              <td :colspan="visibleItems.length + 1" class="py-16 text-center">
                <p class="text-slate-400 italic text-sm">Tidak ada auditor ditemukan dengan filter saat ini</p>
              </td>
            </tr>

          </tbody>
        </table>
      </div>
    </div>

    <!-- ── Cell History Modal ── -->
    <BaseModal
      v-model="histOpen"
      :title="`Detail Kompetensi — ${histAuditor?.name ?? ''}`"
      size="md"
    >
      <template v-if="histAuditor && histItem">

        <!-- Item + category info -->
        <div class="flex items-center gap-2 mb-4">
          <span
            :class="[CAT_STYLE[histItem.category]?.bg, CAT_STYLE[histItem.category]?.text, 'ct-badge text-[10px] px-2 py-0.5']"
          >
            {{ histItem.category }}
          </span>
          <span class="font-semibold text-slate-700">{{ histItem.itemName }}</span>
        </div>

        <!-- Current level card -->
        <div
          :class="histMeetsTarget ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'"
          class="rounded-xl border p-4 flex items-center gap-4 mb-5"
        >
          <CompetencySymbol :level="histCurrentLevel" size="lg" />
          <div class="flex-1">
            <p class="font-bold text-slate-800 text-base leading-tight">
              {{ LEVEL_LABEL[histCurrentLevel] }}
              <span class="ml-1.5 text-lg font-black" :class="histCurrentLevel ? 'text-slate-600' : 'text-slate-300'">
                {{ histCurrentLevel || '—' }}
              </span>
            </p>
            <div class="flex items-center gap-2 mt-1">
              <StatusBadge :status="histMeetsTarget ? 'Approved' : 'Gap'">
                {{ histMeetsTarget ? '✓ Memenuhi target ◆' : '⚠ Di bawah target ◆' }}
              </StatusBadge>
            </div>
            <p v-if="histCell?.lastUpdated" class="text-slate-500 text-xs mt-2">
              Terakhir diupdate: <strong>{{ histCell.lastUpdated }}</strong>
              oleh <strong>{{ histCell.updatedBy }}</strong>
            </p>
          </div>
        </div>

        <!-- Source evaluation (if any) -->
        <div v-if="histSourceEval" class="mb-5 p-3 bg-blue-50 rounded-xl border border-blue-100">
          <p class="text-xs font-bold text-blue-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <Info class="w-3 h-3" /> Sumber Evaluasi Training
          </p>
          <p class="text-sm font-medium text-slate-700">{{ histTrainingName ?? histSourceEval.sessionId }}</p>
          <div class="flex flex-wrap gap-3 mt-1.5 text-xs text-slate-600">
            <span>Tanggal: <strong>{{ histSourceEval.evaluationDate }}</strong></span>
            <span>Rata-rata: <strong>{{ histSourceEval.rataRataNilaiA?.toFixed(1) }}</strong></span>
            <span>
              Perubahan:
              <strong>{{ histSourceEval.skillMapUpdate?.before ?? '—' }}</strong>
              →
              <strong>{{ histSourceEval.skillMapUpdate?.after ?? '—' }}</strong>
            </span>
          </div>
        </div>

        <!-- Revision history -->
        <div>
          <p class="ct-label mb-2">Riwayat Perubahan</p>
          <div v-if="histRevisions.length" class="space-y-2">
            <div
              v-for="r in histRevisions"
              :key="r.id"
              class="p-3 bg-slate-50 rounded-lg border border-slate-100"
            >
              <div class="flex items-center gap-2 mb-1">
                <span class="ct-badge ct-badge-blue">{{ r.type }}</span>
                <span class="text-slate-500 text-xs">{{ r.date }}</span>
                <span class="ml-auto text-slate-400 text-xs">{{ r.revisionNumber }}</span>
              </div>
              <p class="text-slate-700 text-sm leading-snug">{{ r.description }}</p>
            </div>
          </div>
          <div v-else class="py-6 text-center rounded-xl bg-slate-50 border border-slate-100">
            <p class="text-slate-400 italic text-sm">Belum ada riwayat perubahan tercatat untuk sel ini</p>
          </div>
        </div>

      </template>

      <template #footer>
        <button class="btn-secondary" @click="histOpen = false">Tutup</button>
      </template>
    </BaseModal>

  </div>
</template>
