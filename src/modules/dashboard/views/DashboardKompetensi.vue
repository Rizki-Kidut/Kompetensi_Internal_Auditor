<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  Users, UserCheck, UserX, AlertTriangle, Calendar, ClipboardList,
  TrendingUp, Award, GraduationCap, FileCheck, Activity, ChevronRight,
} from '@lucide/vue'
import { useAuditorStore }        from '../../../stores/auditorStore.js'
import { useCompetencyStore }     from '../../../stores/competencyStore.js'
import { useTrainingSessionStore } from '../../../stores/trainingSessionStore.js'
import { useEvaluationStore }     from '../../../stores/evaluationStore.js'
import { useApprovalStore }       from '../../../stores/approvalStore.js'
import { useTrainingPlanStore }   from '../../../stores/trainingPlanStore.js'
import { useGapAnalysis }         from '../../../shared/composables/useGapAnalysis.js'
import StatusBadge                from '../../../shared/components/StatusBadge.vue'
import CompetencySymbol            from '../../../shared/components/CompetencySymbol.vue'

const router = useRouter()
const auditorStore = useAuditorStore()
const competency   = useCompetencyStore()
const sessionStore  = useTrainingSessionStore()
const evalStore     = useEvaluationStore()
const approvalStore = useApprovalStore()
const planStore     = useTrainingPlanStore()

onMounted(() => {
  auditorStore.load(); competency.load(); sessionStore.load()
  evalStore.load(); approvalStore.load(); planStore.load()
})

// ─── Stats ──────────────────────────────────────────────────
const activeAuditors    = computed(() => auditorStore.auditors.filter(a => a.status === 'Aktif'))
const inactiveAuditors  = computed(() => auditorStore.auditors.filter(a => a.status !== 'Aktif'))
const scheduledSessions = computed(() => sessionStore.sessions.filter(s => s.status === 'Terjadwal'))
const completedSessions = computed(() => sessionStore.sessions.filter(s => s.status === 'Selesai'))
const pendingEvals      = computed(() => evalStore.evaluations.filter(e => e.finalStatus === 'Menunggu Approval'))
const pendingRequests   = computed(() => approvalStore.requests.filter(r => r.finalStatus === 'Pending'))
const draftPlans        = computed(() => planStore.plans.filter(p => p.status === 'Draft'))
const approvedEvals     = computed(() => evalStore.evaluations.filter(e => e.finalStatus === 'Approved'))

const totalPendingApprovals = computed(() => pendingEvals.value.length + pendingRequests.value.length)

const stats = computed(() => [
  { label: 'Auditor Aktif',       value: activeAuditors.value.length,    icon: UserCheck,     color: 'bg-emerald-100 text-emerald-600', ring: 'ring-emerald-200', route: '/auditor' },
  { label: 'Auditor Non-Aktif',   value: inactiveAuditors.value.length,   icon: UserX,         color: 'bg-slate-100 text-slate-500',     ring: 'ring-slate-200',  route: '/history' },
  { label: 'Training Terjadwal',  value: scheduledSessions.value.length,  icon: Calendar,      color: 'bg-blue-100 text-blue-600',       ring: 'ring-blue-200',   route: '/training/pelaksanaan' },
  { label: 'Menunggu Approval',   value: totalPendingApprovals.value,     icon: ClipboardList, color: 'bg-amber-100 text-amber-600',     ring: 'ring-amber-200',  route: '/approval' },
  { label: 'Rencana Training',    value: draftPlans.value.length,         icon: GraduationCap, color: 'bg-purple-100 text-purple-600',   ring: 'ring-purple-200', route: '/training/rencana' },
  { label: 'Evaluasi Selesai',    value: approvedEvals.value.length,      icon: FileCheck,     color: 'bg-teal-100 text-teal-600',       ring: 'ring-teal-200',   route: '/training/evaluasi' },
])

// ─── Gap analysis ──────────────────────────────────────────
const { gapData, totalGaps } = useGapAnalysis(
  computed(() => auditorStore.auditors),
  computed(() => competency.items),
  computed(() => competency.matrix),
)

const topGaps = computed(() => gapData.value.filter(g => g.gapCount > 0).slice(0, 6))

const CATEGORIES = ['Auditor QMS', 'Audit Manufaktur dan Shift', 'Audit Produk', 'Audit Supplier']
const CAT_SHORT = {
  'Auditor QMS': 'QMS',
  'Audit Manufaktur dan Shift': 'Mfg & Shift',
  'Audit Produk': 'Produk',
  'Audit Supplier': 'Supplier',
}
const CAT_COLORS = {
  'Auditor QMS':                  { bar: 'bg-blue-500',    chip: 'bg-blue-50 text-blue-700 border-blue-200' },
  'Audit Manufaktur dan Shift':   { bar: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  'Audit Produk':                 { bar: 'bg-amber-500',   chip: 'bg-amber-50 text-amber-700 border-amber-200' },
  'Audit Supplier':               { bar: 'bg-rose-500',    chip: 'bg-rose-50 text-rose-700 border-rose-200' },
}

const gapByCategory = computed(() =>
  CATEGORIES.map(cat => {
    const items = gapData.value.filter(g => g.item.category === cat)
    return { cat, short: CAT_SHORT[cat], totalGaps: items.reduce((s, g) => s + g.gapCount, 0), itemCount: items.length }
  })
)
const maxCatGaps = computed(() => Math.max(1, ...gapByCategory.value.map(c => c.totalGaps)))

// ─── Competency level distribution ─────────────────────────
const LEVEL_ORDER = ['★', '◆', '●', '']
const LEVEL_LABELS = { '★': 'Sangat Kompeten', '◆': 'Kompeten', '●': 'Cukup Kompeten', '': 'Belum Dinilai' }
const LEVEL_BAR_COLORS = { '★': 'bg-amber-400', '◆': 'bg-blue-400', '●': 'bg-emerald-400', '': 'bg-slate-300' }
const LEVEL_TEXT_COLORS = { '★': 'text-amber-600', '◆': 'text-blue-600', '●': 'text-emerald-600', '': 'text-slate-400' }

const levelDistribution = computed(() => {
  const total = competency.matrix.length || 1
  return LEVEL_ORDER.map(lv => {
    const count = competency.matrix.filter(c => c.level === lv).length
    return { level: lv, label: LEVEL_LABELS[lv], count, pct: Math.round((count / total) * 100), barColor: LEVEL_BAR_COLORS[lv], textColor: LEVEL_TEXT_COLORS[lv] }
  })
})

// ─── Auditor competency summary (top/bottom) ───────────────
const RANK = { '': 0, '●': 2, '◆': 3, '★': 4 }

const auditorSummary = computed(() =>
  activeAuditors.value.map(a => {
    const cells = competency.matrix.filter(c => c.auditorId === a.id)
    const rated = cells.filter(c => c.level !== '')
    const avgRank = rated.length ? rated.reduce((s, c) => s + (RANK[c.level] ?? 0), 0) / rated.length : 0
    const starCount   = cells.filter(c => c.level === '★').length
    const diamondCount = cells.filter(c => c.level === '◆').length
    const circleCount  = cells.filter(c => c.level === '●').length
    const unratedCount = cells.filter(c => c.level === '').length
    const gapCount     = cells.filter(c => (RANK[c.level] ?? 0) < (RANK['◆'] ?? 0)).length
    return {
      id: a.id, name: a.name, section: a.section, position: a.position,
      total: cells.length, rated: rated.length, avgRank, gapCount,
      starCount, diamondCount, circleCount, unratedCount,
    }
  }).sort((a, b) => b.avgRank - a.avgRank)
)

const topAuditors  = computed(() => auditorSummary.value.slice(0, 3))
const gapAuditors  = computed(() => [...auditorSummary.value].sort((a, b) => b.gapCount - a.gapCount).filter(a => a.gapCount > 0).slice(0, 3))

function avgRankToSymbol(r) {
  if (r >= 3.5) return '★'
  if (r >= 2.5) return '◆'
  if (r >= 1.5) return '●'
  return ''
}

// ─── Training pipeline ─────────────────────────────────────
const trainingPipeline = computed(() => {
  const pipe = [
    { stage: 'Rencana (Draft)',     count: draftPlans.value.length,           color: 'bg-purple-500',    route: '/training/rencana' },
    { stage: 'Rencana Disetujui',   count: planStore.plans.filter(p => p.status === 'Disetujui').length, color: 'bg-indigo-500', route: '/training/rencana' },
    { stage: 'Training Terjadwal',  count: scheduledSessions.value.length,     color: 'bg-blue-500',      route: '/training/pelaksanaan' },
    { stage: 'Training Selesai',    count: completedSessions.value.length,     color: 'bg-teal-500',      route: '/training/pelaksanaan' },
    { stage: 'Evaluasi Selesai',    count: approvedEvals.value.length,         color: 'bg-emerald-500',   route: '/training/evaluasi' },
  ]
  return pipe
})

// ─── Recent activities ─────────────────────────────────────
const recentActivities = computed(() => {
  const items = []
  // Eval approvals
  evalStore.evaluations.filter(e => e.finalStatus === 'Approved').forEach(e => {
    const step = e.approvalChain?.find(s => s.status === 'Approved')
    if (step?.date) items.push({ date: step.date, type: 'eval', icon: FileCheck, color: 'text-emerald-500', text: `Evaluasi ${auditorStore.auditors.find(a => a.id === e.auditorId)?.name ?? '?'} disetujui` })
  })
  // New sessions
  sessionStore.sessions.forEach(s => {
    items.push({ date: s.date, type: 'session', icon: Calendar, color: 'text-blue-500', text: `Training "${s.trainingName}" — ${s.status}` })
  })
  // Revision logs
  // Pending approvals
  approvalStore.requests.filter(r => r.finalStatus === 'Approved').forEach(r => {
    const step = r.approvalChain?.find(s => s.status === 'Approved')
    if (step?.date) items.push({ date: step.date, type: 'request', icon: UserCheck, color: 'text-emerald-500', text: `Pengajuan auditor ${r.name} disetujui` })
  })
  return items.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5)
})

// ─── Period ────────────────────────────────────────────────
const currentYear = new Date().getFullYear()
const currentPeriod = computed(() => {
  const m = new Date().getMonth() + 1
  return m >= 4 ? `Apr ${currentYear} – Mar ${currentYear + 1}` : `Apr ${currentYear - 1} – Mar ${currentYear}`
})
</script>

<template>
  <div class="p-6 fade-in">
    <!-- Page header -->
    <div class="flex items-start justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-slate-800 leading-tight">Dashboard Kompetensi</h1>
        <p class="text-slate-500 text-sm mt-1">Ringkasan status kompetensi & training internal auditor</p>
      </div>
      <div class="text-right">
        <p class="text-xs text-slate-400 uppercase tracking-wide">Periode Fiskal</p>
        <p class="text-sm font-semibold text-slate-600">{{ currentPeriod }}</p>
      </div>
    </div>

    <!-- Stat cards -->
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      <div
        v-for="stat in stats"
        :key="stat.label"
        class="ct-card p-4 cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5"
        @click="router.push(stat.route)"
      >
        <div :class="['w-10 h-10 rounded-lg flex items-center justify-center mb-3', stat.color]">
          <component :is="stat.icon" class="w-5 h-5" />
        </div>
        <p class="text-2xl font-bold text-slate-800 leading-none">{{ stat.value }}</p>
        <p class="text-xs text-slate-500 mt-1.5">{{ stat.label }}</p>
      </div>
    </div>

    <!-- Row 1: Competency Distribution + Gap by Category -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <!-- Competency Distribution -->
      <div class="ct-card p-5">
        <div class="flex items-center gap-2 mb-4">
          <Award class="w-5 h-5 text-blue-500" />
          <h2 class="font-semibold text-slate-700">Distribusi Level Kompetensi</h2>
        </div>
        <div class="space-y-3">
          <div v-for="d in levelDistribution" :key="d.level" class="flex items-center gap-3">
            <CompetencySymbol :level="d.level" size="sm" />
            <div class="flex-1">
              <div class="flex items-center justify-between mb-1">
                <span class="text-sm text-slate-600">{{ d.label }}</span>
                <span :class="['text-sm font-bold', d.textColor]">{{ d.count }} <span class="text-slate-400 text-xs">({{ d.pct }}%)</span></span>
              </div>
              <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div :class="['h-full rounded-full transition-all duration-500', d.barColor]" :style="`width: ${d.pct}%`" />
              </div>
            </div>
          </div>
        </div>
        <div class="mt-4 pt-4 border-t border-slate-100 flex justify-between text-sm">
          <span class="text-slate-500">Total sel kompetensi</span>
          <span class="font-bold text-slate-700">{{ competency.matrix.length }}</span>
        </div>
      </div>

      <!-- Gap by Category -->
      <div class="ct-card p-5">
        <div class="flex items-center gap-2 mb-4">
          <AlertTriangle class="w-5 h-5 text-amber-500" />
          <h2 class="font-semibold text-slate-700">Gap Kompetensi per Kategori</h2>
          <span class="ml-auto ct-badge ct-badge-amber">{{ totalGaps }} total gap</span>
        </div>
        <div class="space-y-3">
          <div v-for="cat in gapByCategory" :key="cat.cat">
            <div class="flex items-center justify-between mb-1.5">
              <span :class="['text-xs font-bold px-2 py-0.5 rounded border', CAT_COLORS[cat.cat].chip]">{{ cat.short }}</span>
              <span class="text-sm font-bold text-slate-600">{{ cat.totalGaps }} gap <span class="text-slate-400 font-normal text-xs">/ {{ cat.itemCount }} item</span></span>
            </div>
            <div class="h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                :class="['h-full rounded-full transition-all duration-500', CAT_COLORS[cat.cat].bar]"
                :style="`width: ${Math.round((cat.totalGaps / maxCatGaps) * 100)}%`"
              />
            </div>
          </div>
        </div>
        <button class="w-full mt-4 btn-secondary justify-center text-xs" @click="router.push('/kompetensi')">
          Lihat Matrix Kompetensi <ChevronRight class="w-3 h-3" />
        </button>
      </div>
    </div>

    <!-- Row 2: Top Gaps + Training Pipeline -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <!-- Top Gap Items -->
      <div class="ct-card p-5">
        <div class="flex items-center justify-between mb-4">
          <h2 class="font-semibold text-slate-700 flex items-center gap-2">
            <TrendingUp class="w-5 h-5 text-rose-500" />
            Gap Kompetensi Terbanyak
          </h2>
          <button class="text-blue-600 text-xs hover:underline" @click="router.push('/training/rencana')">Buat Rencana &rarr;</button>
        </div>
        <div v-if="topGaps.length" class="space-y-2">
          <div
            v-for="gap in topGaps"
            :key="gap.item.id"
            class="flex items-center gap-3 p-3 rounded-lg bg-slate-50 hover:bg-blue-50/60 transition-colors"
          >
            <span :class="['text-xs font-bold px-2 py-0.5 rounded border shrink-0', CAT_COLORS[gap.item.category].chip]">
              {{ CAT_SHORT[gap.item.category] }}
            </span>
            <span class="text-sm text-slate-700 flex-1 truncate">{{ gap.item.itemName }}</span>
            <span class="font-bold text-rose-600 text-sm shrink-0">{{ gap.gapCount }}</span>
            <span class="text-slate-400 text-xs shrink-0">auditor</span>
          </div>
        </div>
        <div v-else class="py-8 text-center">
          <TrendingUp class="w-10 h-10 text-emerald-300 mx-auto mb-2" />
          <p class="text-slate-500 text-sm italic">Semua auditor aktif sudah memenuhi target kompetensi</p>
        </div>
      </div>

      <!-- Training Pipeline -->
      <div class="ct-card p-5">
        <div class="flex items-center gap-2 mb-4">
          <Activity class="w-5 h-5 text-purple-500" />
          <h2 class="font-semibold text-slate-700">Pipeline Training</h2>
        </div>
        <div class="space-y-0">
          <div
            v-for="(p, idx) in trainingPipeline"
            :key="p.stage"
            class="flex items-center gap-3 cursor-pointer group"
            @click="router.push(p.route)"
          >
            <div class="flex flex-col items-center">
              <div :class="['w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold', p.color]">
                {{ p.count }}
              </div>
              <div v-if="idx < trainingPipeline.length - 1" class="w-0.5 h-6 bg-slate-200" />
            </div>
            <span class="text-sm text-slate-600 group-hover:text-slate-800 group-hover:font-medium transition-colors flex-1">{{ p.stage }}</span>
            <ChevronRight class="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-400 transition-colors" />
          </div>
        </div>
      </div>
    </div>

    <!-- Row 3: Top Auditors + Gap Auditors + Recent Activities -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
      <!-- Top Auditors -->
      <div class="ct-card p-5">
        <div class="flex items-center gap-2 mb-4">
          <Award class="w-4 h-4 text-amber-500" />
          <h2 class="font-semibold text-slate-700 text-sm">Auditor Terkompeten</h2>
        </div>
        <div v-if="topAuditors.length" class="space-y-2">
          <div
            v-for="(a, idx) in topAuditors"
            :key="a.id"
            class="flex items-center gap-3 p-2.5 rounded-lg hover:bg-amber-50/50 transition-colors cursor-pointer"
            @click="router.push('/kartu-riwayat')"
          >
            <span class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
              :class="idx === 0 ? 'bg-amber-100 text-amber-600' : idx === 1 ? 'bg-slate-100 text-slate-500' : 'bg-orange-100 text-orange-600'">
              {{ idx + 1 }}
            </span>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-slate-700 truncate">{{ a.name }}</p>
              <p class="text-xs text-slate-400">{{ a.section }}</p>
            </div>
            <CompetencySymbol :level="avgRankToSymbol(a.avgRank)" size="sm" />
            <div class="text-right shrink-0">
              <p class="text-xs font-bold text-slate-600">{{ a.rated }}/{{ a.total }}</p>
              <p class="text-[10px] text-slate-400">dinilai</p>
            </div>
          </div>
        </div>
        <p v-else class="text-slate-400 text-sm italic text-center py-4">Belum ada data</p>
      </div>

      <!-- Auditors Needing Training -->
      <div class="ct-card p-5">
        <div class="flex items-center gap-2 mb-4">
          <AlertTriangle class="w-4 h-4 text-rose-500" />
          <h2 class="font-semibold text-slate-700 text-sm">Perlu Training</h2>
        </div>
        <div v-if="gapAuditors.length" class="space-y-2">
          <div
            v-for="a in gapAuditors"
            :key="a.id"
            class="flex items-center gap-3 p-2.5 rounded-lg hover:bg-rose-50/50 transition-colors cursor-pointer"
            @click="router.push('/kompetensi')"
          >
            <div class="w-8 h-8 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center text-sm font-bold shrink-0">
              {{ a.gapCount }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-slate-700 truncate">{{ a.name }}</p>
              <p class="text-xs text-slate-400">{{ a.section }} · {{ a.position }}</p>
            </div>
            <div class="text-right shrink-0">
              <p class="text-xs text-slate-500">{{ a.unratedCount }} belum dinilai</p>
            </div>
          </div>
        </div>
        <p v-else class="text-slate-400 text-sm italic text-center py-4">Tidak ada gap</p>
      </div>

      <!-- Recent Activities -->
      <div class="ct-card p-5">
        <div class="flex items-center gap-2 mb-4">
          <Activity class="w-4 h-4 text-slate-500" />
          <h2 class="font-semibold text-slate-700 text-sm">Aktivitas Terkini</h2>
        </div>
        <div v-if="recentActivities.length" class="space-y-3">
          <div
            v-for="(act, idx) in recentActivities"
            :key="idx"
            class="flex items-start gap-3"
          >
            <component :is="act.icon" :class="['w-4 h-4 mt-0.5 shrink-0', act.color]" />
            <div class="flex-1 min-w-0">
              <p class="text-sm text-slate-600 leading-snug">{{ act.text }}</p>
              <p class="text-xs text-slate-400 mt-0.5">{{ act.date }}</p>
            </div>
          </div>
        </div>
        <p v-else class="text-slate-400 text-sm italic text-center py-4">Belum ada aktivitas</p>
      </div>
    </div>

    <!-- Row 4: Pending Approvals CTA -->
    <div v-if="totalPendingApprovals > 0" class="ct-card p-5 flex items-center gap-5 border-amber-200 bg-amber-50/30">
      <div class="w-14 h-14 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
        <ClipboardList class="w-7 h-7" />
      </div>
      <div class="flex-1">
        <h3 class="font-semibold text-slate-800">Ada {{ totalPendingApprovals }} item menunggu approval</h3>
        <p class="text-sm text-slate-500 mt-0.5">
          {{ pendingRequests.length }} pengajuan auditor · {{ pendingEvals.length }} evaluasi training
        </p>
      </div>
      <button class="btn-submit flex items-center gap-2" @click="router.push('/approval')">
        Buka Approval Center <ChevronRight class="w-4 h-4" />
      </button>
    </div>
  </div>
</template>
