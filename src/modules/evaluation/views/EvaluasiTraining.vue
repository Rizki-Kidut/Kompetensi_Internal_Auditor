<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ClipboardCheck, Plus, X, Eye, Send, Trash2, Monitor } from '@lucide/vue'
import { useAuditorStore }         from '../../../stores/auditorStore.js'
import { useEvaluationStore }      from '../../../stores/evaluationStore.js'
import { useTrainingSessionStore } from '../../../stores/trainingSessionStore.js'
import { useTrainingPlanStore }    from '../../../stores/trainingPlanStore.js'
import { useCompetencyStore }      from '../../../stores/competencyStore.js'
import { useToast }                from '../../../shared/composables/useToast.js'
import {
  buildApprovalChain,
  calcRataRataNilaiA,
  classifyNilai,
  suggestLevelFromLms,
} from '../../../services/calculationService.js'
import BaseModal            from '../../../shared/components/BaseModal.vue'
import BaseButton           from '../../../shared/components/BaseButton.vue'
import StatusBadge          from '../../../shared/components/StatusBadge.vue'
import ApprovalChainStepper from '../../../shared/components/ApprovalChainStepper.vue'
import CompetencySymbol     from '../../../shared/components/CompetencySymbol.vue'

const route        = useRoute()
const auditorStore = useAuditorStore()
const evalStore    = useEvaluationStore()
const sessionStore = useTrainingSessionStore()
const planStore    = useTrainingPlanStore()
const competency   = useCompetencyStore()
const toast        = useToast()

onMounted(() => {
  auditorStore.load(); evalStore.load(); sessionStore.load()
  planStore.load(); competency.load()
  if (route.query.sessionId) filterSessionId.value = String(route.query.sessionId)
})

// ─── Filters ──────────────────────────────────────────────
const filterStatus    = ref('Semua')
const filterSessionId = ref('')
const STATUS_OPTS     = ['Semua', 'Draft', 'Menunggu Approval', 'Approved', 'Ditolak']

// ─── Helpers ──────────────────────────────────────────────
const completedSessions = computed(() =>
  sessionStore.sessions.filter(s => s.status === 'Selesai')
)
function auditorName(id)  { return auditorStore.auditors.find(a => a.id === id)?.name ?? id }
function sessionName(id)  { return sessionStore.sessions.find(s => s.id === id)?.trainingName ?? id }
function itemName(id)     { return competency.items.find(i => i.id === id)?.itemName ?? id }
function currentLevel(auditorId, itemId) {
  return competency.matrix.find(c => c.auditorId === auditorId && c.itemId === itemId)?.level ?? ''
}
function hasEvalFor(sessionId, auditorId) {
  return evalStore.evaluations.some(e => e.sessionId === sessionId && e.auditorId === auditorId)
}
function evalFor(sessionId, auditorId) {
  return evalStore.evaluations.find(e => e.sessionId === sessionId && e.auditorId === auditorId)
}

// ─── Session context panel ─────────────────────────────────
const contextSession = computed(() =>
  filterSessionId.value
    ? sessionStore.sessions.find(s => s.id === filterSessionId.value) ?? null
    : null
)
const contextParticipants = computed(() => {
  if (!contextSession.value) return []
  const attendees = contextSession.value.attendees ?? contextSession.value.participants ?? []
  return attendees.map(id => {
    const ev = evalFor(contextSession.value.id, id)
    return { id, name: auditorName(id), evalStatus: ev?.finalStatus ?? null, evalId: ev?.id ?? null }
  })
})

// ─── Enriched evals ────────────────────────────────────────
const enrichedEvals = computed(() =>
  evalStore.evaluations.map(e => ({
    ...e,
    auditorName: auditorName(e.auditorId),
    sessionName: sessionName(e.sessionId),
  }))
)
const filteredEvals = computed(() =>
  enrichedEvals.value.filter(e =>
    (filterStatus.value === 'Semua' || e.finalStatus === filterStatus.value) &&
    (!filterSessionId.value || e.sessionId === filterSessionId.value)
  )
)
const evalStats = computed(() => ({
  Draft:              evalStore.evaluations.filter(e => e.finalStatus === 'Draft').length,
  'Menunggu Approval': evalStore.evaluations.filter(e => e.finalStatus === 'Menunggu Approval').length,
  Approved:           evalStore.evaluations.filter(e => e.finalStatus === 'Approved').length,
  Ditolak:            evalStore.evaluations.filter(e => e.finalStatus === 'Ditolak').length,
}))

// ─── Score fields config ───────────────────────────────────
const SCORE_FIELDS = [
  { key: 'pemahamanIsi',         label: 'Pemahaman Isi Training' },
  { key: 'peningkatanSkill',     label: 'Peningkatan Skill' },
  { key: 'peningkatanKinerja',   label: 'Peningkatan Kinerja' },
  { key: 'implementasi',         label: 'Implementasi di Pekerjaan' },
  { key: 'improvement',          label: 'Ide Improvement' },
  { key: 'mengajarkanOrangLain', label: 'Mengajarkan ke Orang Lain' },
]
const LEVELS_UP = ['●', '◆', '★']
const LEVEL_RANK = { '': 0, '●': 2, '◆': 3, '★': 4 }

// ─── Form ─────────────────────────────────────────────────
const formOpen    = ref(false)
const formErrors  = ref({})
const formLoading = ref(false)
const editingId   = ref(null)

function emptyForm() {
  return {
    sessionId: filterSessionId.value || '',
    auditorId: '',
    evaluationDate: new Date().toISOString().slice(0, 10),
    scoresUmum: {
      pemahamanIsi: null, peningkatanSkill: null, peningkatanKinerja: null,
      implementasi: null, improvement: null, mengajarkanOrangLain: null,
    },
    scoresKhusus: [],
    hasilTesTertulis: null,
    skillMapUpdate: { competencyItemId: '', before: '', after: '', target: '' },
    kesimpulan: '',
    testSource: 'Manual',
    testAttemptId: null,
    workshopScore: null,
  }
}
const form = ref(emptyForm())

// Auto-fill skill map item from session plan
watch(() => form.value.sessionId, (sid) => {
  if (!sid) return
  const session = sessionStore.sessions.find(s => s.id === sid)
  if (!session?.planId) return
  const plan = planStore.plans.find(p => p.id === session.planId)
  if (plan?.competencyItemId && !form.value.skillMapUpdate.competencyItemId) {
    form.value.skillMapUpdate.competencyItemId = plan.competencyItemId
  }
})

// Auto-fill current level when auditor + item both selected
watch(
  [() => form.value.auditorId, () => form.value.skillMapUpdate.competencyItemId],
  ([aid, iid]) => {
    if (aid && iid) form.value.skillMapUpdate.before = currentLevel(aid, iid)
  }
)

const calcAvg   = computed(() => calcRataRataNilaiA(form.value.scoresUmum, form.value.scoresKhusus))
const calcClass = computed(() => classifyNilai(calcAvg.value))

const sessionAuditors = computed(() => {
  const sid = form.value.sessionId
  if (!sid) return auditorStore.auditors.filter(a => a.status === 'Aktif')
  const session = sessionStore.sessions.find(s => s.id === sid)
  if (!session) return []
  return (session.attendees ?? session.participants ?? []).map(id => ({
    id, name: auditorName(id),
  }))
})

const afterLevels = computed(() => {
  const rank = LEVEL_RANK[form.value.skillMapUpdate.before] ?? 0
  return LEVELS_UP.filter(l => LEVEL_RANK[l] > rank)
})

const isLmsSourced = computed(() => form.value.testSource === 'LMS')

const lmsSuggestion = computed(() => {
  if (!isLmsSourced.value) return null
  const r = suggestLevelFromLms({
    testScore: Number(form.value.hasilTesTertulis) || 0,
    workshopScore: form.value.workshopScore,
    before: form.value.skillMapUpdate.before,
    target: form.value.skillMapUpdate.target || '◆',
    avgEval: calcAvg.value,
  })
  if (!r.suggested) return null
  return {
    suggestedLevel: r.suggested,
    starEligible: r.starEligible,
    note: r.starEligible ? 'memenuhi syarat ★ (perlu approval khusus)' : '',
  }
})

function switchToManual() {
  form.value.testSource = 'Manual'
  form.value.testAttemptId = null
}

function openCreate(sessionId = '', auditorId = '') {
  editingId.value = null
  form.value = { ...emptyForm(), sessionId: sessionId || filterSessionId.value || '', auditorId }
  formErrors.value = {}
  formOpen.value = true
}
function openEdit(ev) {
  editingId.value = ev.id
  form.value = {
    sessionId: ev.sessionId, auditorId: ev.auditorId, evaluationDate: ev.evaluationDate,
    scoresUmum: { ...ev.scoresUmum },
    scoresKhusus: ev.scoresKhusus ? ev.scoresKhusus.map(k => ({ ...k })) : [],
    hasilTesTertulis: ev.hasilTesTertulis,
    skillMapUpdate: { ...(ev.skillMapUpdate ?? { competencyItemId: '', before: '', after: '', target: '' }) },
    kesimpulan: ev.kesimpulan ?? '',
    testSource: ev.testSource ?? 'Manual',
    testAttemptId: ev.testAttemptId ?? null,
    workshopScore: ev.workshopScore ?? null,
  }
  formErrors.value = {}
  formOpen.value = true
}

function addKhusus()      { form.value.scoresKhusus.push({ label: '', score: null }) }
function removeKhusus(i)  { form.value.scoresKhusus.splice(i, 1) }

function validateForm() {
  const e = {}
  if (!form.value.sessionId)      e.sessionId = 'Pilih sesi training'
  if (!form.value.auditorId)      e.auditorId = 'Pilih auditor'
  if (!form.value.evaluationDate) e.evaluationDate = 'Isi tanggal evaluasi'
  for (const f of SCORE_FIELDS) {
    const v = Number(form.value.scoresUmum[f.key])
    if (form.value.scoresUmum[f.key] === null || form.value.scoresUmum[f.key] === '' || isNaN(v) || v < 0 || v > 100)
      e[`score_${f.key}`] = true
  }
  if (form.value.hasilTesTertulis === null || form.value.hasilTesTertulis === '')
    e.hasilTesTertulis = 'Isi nilai tes tertulis'
  return e
}

function buildRecord(submitMode) {
  const avg   = calcRataRataNilaiA(form.value.scoresUmum, form.value.scoresKhusus)
  const total = SCORE_FIELDS.reduce((s, f) => s + (Number(form.value.scoresUmum[f.key]) || 0), 0)
  const existing = editingId.value ? evalStore.evaluations.find(e => e.id === editingId.value) : null
  return {
    id: editingId.value ?? `ev-${Date.now()}`,
    sessionId: form.value.sessionId,
    auditorId: form.value.auditorId,
    evaluationDate: form.value.evaluationDate,
    scoresUmum: { ...form.value.scoresUmum },
    scoresKhusus: form.value.scoresKhusus.filter(k => k.label?.trim() && k.score !== null),
    totalNilaiA: total,
    rataRataNilaiA: avg,
    hasilTesTertulis: Number(form.value.hasilTesTertulis),
    skillMapUpdate: form.value.skillMapUpdate.competencyItemId
      ? { ...form.value.skillMapUpdate }
      : null,
    kesimpulan: form.value.kesimpulan.trim(),
    approvalChain: submitMode ? buildApprovalChain() : (existing?.approvalChain ?? []),
    finalStatus: submitMode ? 'Menunggu Approval' : (existing?.finalStatus ?? 'Draft'),
    testSource: form.value.testSource,
    testAttemptId: form.value.testAttemptId,
    workshopScore: form.value.workshopScore,
  }
}

function saveDraft() {
  formErrors.value = validateForm()
  if (Object.keys(formErrors.value).length) return
  formLoading.value = true
  try {
    const rec = buildRecord(false)
    editingId.value ? evalStore.updateEvaluation(rec) : evalStore.addEvaluation(rec)
    toast.success('Draft evaluasi disimpan.')
    formOpen.value = false
  } finally { formLoading.value = false }
}

function submitApproval() {
  formErrors.value = validateForm()
  if (Object.keys(formErrors.value).length) {
    toast.error('Lengkapi semua nilai sebelum mengirim.')
    return
  }
  formLoading.value = true
  try {
    const rec = buildRecord(true)
    editingId.value ? evalStore.updateEvaluation(rec) : evalStore.addEvaluation(rec)
    toast.success(`Evaluasi ${auditorName(form.value.auditorId)} dikirim untuk approval.`)
    formOpen.value = false
  } finally { formLoading.value = false }
}

function submitExistingDraft(ev) {
  const updated = { ...ev, approvalChain: buildApprovalChain(), finalStatus: 'Menunggu Approval' }
  evalStore.updateEvaluation(updated)
  toast.success(`Evaluasi ${ev.auditorName} dikirim untuk approval.`)
}

// ─── Detail modal ──────────────────────────────────────────
const detailOpen = ref(false)
const detailEval = ref(null)
function openDetail(ev) { detailEval.value = ev; detailOpen.value = true }

// ─── UI helpers ────────────────────────────────────────────
function scoreBarClass(val) {
  const n = Number(val) || 0
  if (n >= 85) return 'bg-emerald-500'
  if (n >= 70) return 'bg-amber-400'
  return 'bg-red-400'
}
function classColor(cls) {
  return { Memuaskan: 'text-emerald-600', Baik: 'text-blue-600', Cukup: 'text-amber-600', Kurang: 'text-red-600' }[cls] ?? ''
}
</script>

<template>
  <div class="p-6 fade-in">
    <!-- Header -->
    <div class="flex items-start justify-between mb-5">
      <div>
        <h1 class="text-2xl font-bold text-slate-800">Evaluasi Training</h1>
        <p class="text-slate-500 text-sm mt-1">Form evaluasi, penilaian, dan rekomendasi skill map auditor</p>
      </div>
      <BaseButton variant="primary" @click="openCreate()">
        <ClipboardCheck class="w-4 h-4" /> Input Evaluasi
      </BaseButton>
    </div>

    <!-- Session context panel -->
    <div v-if="contextSession" class="ct-card mb-5 border-blue-200 bg-blue-50/30 overflow-hidden">
      <div class="px-5 py-3 border-b border-blue-100 flex items-center gap-3">
        <ClipboardCheck class="w-5 h-5 text-blue-500 shrink-0" />
        <div class="flex-1">
          <p class="font-semibold text-slate-800">{{ contextSession.trainingName }}</p>
          <p class="text-xs text-slate-500 mt-0.5">{{ contextSession.date }} · Trainer: {{ contextSession.trainer }}</p>
        </div>
        <button class="btn-secondary text-xs flex items-center gap-1" @click="filterSessionId = ''">
          <X class="w-3 h-3" /> Hapus Filter
        </button>
      </div>
      <div class="divide-y divide-blue-50/50">
        <div
          v-for="p in contextParticipants"
          :key="p.id"
          class="px-5 py-2.5 flex items-center gap-3"
        >
          <p class="flex-1 font-medium text-slate-700 text-sm">{{ p.name }}</p>
          <StatusBadge v-if="p.evalStatus" :status="p.evalStatus" />
          <span v-else class="ct-badge ct-badge-slate text-xs">Belum dievaluasi</span>
          <template v-if="!p.evalStatus">
            <BaseButton variant="primary" size="sm" @click="openCreate(contextSession.id, p.id)">
              Input Evaluasi
            </BaseButton>
          </template>
          <template v-else-if="p.evalStatus === 'Draft'">
            <BaseButton variant="secondary" size="sm" @click="openEdit(evalFor(contextSession.id, p.id))">
              Edit Draft
            </BaseButton>
            <BaseButton variant="submit" size="sm" @click="submitExistingDraft(enrichedEvals.find(e => e.id === evalFor(contextSession.id, p.id)?.id))">
              <Send class="w-3 h-3" /> Kirim
            </BaseButton>
          </template>
          <template v-else>
            <button class="ct-action-btn-view" @click="openDetail(enrichedEvals.find(e => e.id === evalFor(contextSession.id, p.id)?.id))">
              <Eye class="w-3.5 h-3.5" />
            </button>
          </template>
        </div>
      </div>
    </div>

    <!-- Stats chips -->
    <div class="flex flex-wrap gap-3 mb-4">
      <div
        v-for="s in ['Draft','Menunggu Approval','Approved','Ditolak']"
        :key="s"
        class="ct-card px-4 py-2 flex items-center gap-2 cursor-pointer"
        :class="filterStatus === s ? 'border-blue-400 bg-blue-50/60' : ''"
        @click="filterStatus = filterStatus === s ? 'Semua' : s"
      >
        <span class="w-2 h-2 rounded-full" :class="{
          'bg-slate-400': s === 'Draft',
          'bg-amber-400': s === 'Menunggu Approval',
          'bg-emerald-500': s === 'Approved',
          'bg-red-400': s === 'Ditolak',
        }" />
        <span class="text-xs text-slate-600">{{ s }}: <strong>{{ evalStats[s] ?? 0 }}</strong></span>
      </div>
    </div>

    <!-- Filter row -->
    <div class="flex flex-wrap items-center gap-3 mb-4">
      <div class="flex gap-1">
        <button v-for="s in STATUS_OPTS" :key="s"
          :class="filterStatus === s ? 'btn-primary' : 'btn-secondary'"
          class="text-xs px-3 py-1.5"
          @click="filterStatus = s"
        >{{ s }}</button>
      </div>
      <select v-model="filterSessionId" class="ct-input w-auto text-xs ml-auto">
        <option value="">Semua Sesi</option>
        <option v-for="s in completedSessions" :key="s.id" :value="s.id">{{ s.trainingName }}</option>
      </select>
    </div>

    <!-- Evaluations table -->
    <div class="ct-card overflow-hidden">
      <div v-if="filteredEvals.length" class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-slate-50 border-b border-slate-200">
              <th class="px-4 py-3 text-left text-slate-600 font-semibold">Auditor</th>
              <th class="px-4 py-3 text-left text-slate-600 font-semibold">Training</th>
              <th class="px-4 py-3 text-left text-slate-600 font-semibold">Tanggal</th>
              <th class="px-4 py-3 text-center text-slate-600 font-semibold">Avg</th>
              <th class="px-4 py-3 text-center text-slate-600 font-semibold">Tes Tertulis</th>
              <th class="px-4 py-3 text-center text-slate-600 font-semibold">Klasifikasi</th>
              <th class="px-4 py-3 text-center text-slate-600 font-semibold">Status</th>
              <th class="px-4 py-3 text-center text-slate-600 font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="ev in filteredEvals" :key="ev.id" class="hover:bg-blue-50/20 transition-colors">
              <td class="px-4 py-3 font-medium text-slate-700">{{ ev.auditorName }}</td>
              <td class="px-4 py-3 text-slate-600 max-w-[200px] truncate">{{ ev.sessionName }}</td>
              <td class="px-4 py-3 text-slate-600">{{ ev.evaluationDate }}</td>
              <td class="px-4 py-3 text-center">
                <span class="font-bold" :class="scoreBarClass(ev.rataRataNilaiA) === 'bg-emerald-500' ? 'text-emerald-600' : scoreBarClass(ev.rataRataNilaiA) === 'bg-amber-400' ? 'text-amber-600' : 'text-red-600'">
                  {{ ev.rataRataNilaiA?.toFixed(1) }}
                </span>
              </td>
              <td class="px-4 py-3 text-center">
                <span class="font-medium" :class="Number(ev.hasilTesTertulis) >= 80 ? 'text-emerald-600' : 'text-amber-600'">
                  {{ ev.hasilTesTertulis }}
                </span>
              </td>
              <td class="px-4 py-3 text-center">
                <span class="text-xs font-semibold" :class="classColor(classifyNilai(ev.rataRataNilaiA ?? 0))">
                  {{ classifyNilai(ev.rataRataNilaiA ?? 0) }}
                </span>
              </td>
              <td class="px-4 py-3 text-center"><StatusBadge :status="ev.finalStatus" /></td>
              <td class="px-4 py-3">
                <div class="flex items-center justify-center gap-1.5">
                  <button class="ct-action-btn-view" title="Detail" @click="openDetail(ev)">
                    <Eye class="w-3.5 h-3.5" />
                  </button>
                  <button v-if="ev.finalStatus === 'Draft'" class="ct-action-btn-edit" title="Edit" @click="openEdit(ev)">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                  </button>
                  <button
                    v-if="ev.finalStatus === 'Draft'"
                    class="btn-submit flex items-center gap-1 px-2 py-1 text-xs"
                    title="Kirim untuk Approval"
                    @click="submitExistingDraft(ev)"
                  >
                    <Send class="w-3 h-3" /> Kirim
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="py-16 text-center">
        <div class="ct-empty-icon-wrap"><ClipboardCheck class="w-9 h-9 text-slate-300" /></div>
        <p class="text-slate-400 italic text-sm">Belum ada data evaluasi
          <span v-if="filterStatus !== 'Semua'"> dengan status "{{ filterStatus }}"</span>
        </p>
      </div>
    </div>

    <!-- ── Create / Edit Form Modal ── -->
    <BaseModal v-model="formOpen" :title="editingId ? 'Edit Evaluasi Training' : 'Input Evaluasi Training'" size="xl">
      <div class="space-y-6">

        <!-- [1] Identifikasi -->
        <div>
          <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Identifikasi</h3>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="md:col-span-2">
              <label class="ct-label">Sesi Training <span class="text-red-500">*</span></label>
              <select v-model="form.sessionId" class="ct-input" :class="formErrors.sessionId ? 'border-red-400' : ''">
                <option value="">-- Pilih sesi --</option>
                <option v-for="s in completedSessions" :key="s.id" :value="s.id">
                  {{ s.trainingName }} · {{ s.date }}
                </option>
              </select>
              <p v-if="formErrors.sessionId" class="text-red-500 text-xs mt-1">{{ formErrors.sessionId }}</p>
            </div>
            <div>
              <label class="ct-label">Tanggal Evaluasi <span class="text-red-500">*</span></label>
              <input v-model="form.evaluationDate" type="date" class="ct-input" :class="formErrors.evaluationDate ? 'border-red-400' : ''" />
            </div>
          </div>
          <div class="mt-3">
            <label class="ct-label">Auditor yang Dievaluasi <span class="text-red-500">*</span></label>
            <select v-model="form.auditorId" class="ct-input" :class="formErrors.auditorId ? 'border-red-400' : ''">
              <option value="">-- Pilih auditor --</option>
              <option v-for="a in sessionAuditors" :key="a.id" :value="a.id">{{ a.name }}</option>
            </select>
            <p v-if="formErrors.auditorId" class="text-red-500 text-xs mt-1">{{ formErrors.auditorId }}</p>
          </div>
        </div>

        <!-- [2] Nilai A -->
        <div>
          <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            Nilai A — Kepuasan Training
            <span class="normal-case text-slate-300 ml-1">(masing-masing 0–100)</span>
          </h3>
          <div class="space-y-2.5">
            <div v-for="f in SCORE_FIELDS" :key="f.key" class="flex items-center gap-3">
              <label class="w-52 text-sm text-slate-600 shrink-0">{{ f.label }}</label>
              <input
                v-model.number="form.scoresUmum[f.key]"
                type="number" min="0" max="100"
                class="ct-input w-20 text-center font-medium py-1.5"
                :class="formErrors[`score_${f.key}`] ? 'border-red-400' : ''"
                placeholder="—"
              />
              <span class="text-slate-300 text-xs">/100</span>
              <div class="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  :class="['h-full rounded-full transition-all duration-300', scoreBarClass(form.scoresUmum[f.key])]"
                  :style="`width: ${Math.min(Math.max(Number(form.scoresUmum[f.key]) || 0, 0), 100)}%`"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- [3] Nilai B (khusus, optional) -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400">Nilai B — Kompetensi Khusus (opsional)</h3>
            <button class="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1" @click="addKhusus">
              <Plus class="w-3 h-3" /> Tambah Item
            </button>
          </div>
          <div v-if="!form.scoresKhusus.length" class="text-slate-300 text-xs italic">Tidak ada item khusus</div>
          <div v-for="(k, idx) in form.scoresKhusus" :key="idx" class="flex items-center gap-2 mb-2">
            <input v-model="k.label" type="text" class="ct-input flex-1 py-1.5" placeholder="Label penilaian" />
            <input v-model.number="k.score" type="number" min="0" max="100" class="ct-input w-20 text-center py-1.5" placeholder="0" />
            <button class="w-7 h-7 flex items-center justify-center text-red-400 hover:text-red-600" @click="removeKhusus(idx)">
              <Trash2 class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <!-- [4] Tes Tertulis -->
        <div>
          <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Tes Tertulis</h3>

          <!-- LMS-sourced: read-only with badge -->
          <div v-if="isLmsSourced" class="space-y-2">
            <div class="flex items-center gap-3">
              <div class="w-24 text-center">
                <p class="text-2xl font-bold" :class="Number(form.hasilTesTertulis) >= 80 ? 'text-emerald-600' : 'text-amber-600'">
                  {{ form.hasilTesTertulis }}
                </p>
                <p class="text-slate-400 text-xs">/100</p>
              </div>
              <div class="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  :class="['h-full rounded-full', scoreBarClass(form.hasilTesTertulis)]"
                  :style="`width: ${Math.min(Number(form.hasilTesTertulis) || 0, 100)}%`"
                />
              </div>
              <span class="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold bg-blue-100 text-blue-700">
                <Monitor class="w-3 h-3" /> Dari LMS
              </span>
            </div>
            <div class="flex items-center gap-3">
              <router-link
                v-if="form.testAttemptId"
                :to="{ name: 'AdminPenilaian' }"
                class="text-xs text-blue-600 hover:text-blue-800"
              >
                Lihat percobaan
              </router-link>
              <button class="btn-secondary text-xs px-2 py-1" @click="switchToManual">
                Ubah manual
              </button>
            </div>
            <div v-if="form.workshopScore != null" class="flex items-center gap-2 text-sm">
              <span class="text-slate-500">Nilai Workshop:</span>
              <span class="font-bold" :class="Number(form.workshopScore) >= 80 ? 'text-emerald-600' : 'text-amber-600'">
                {{ Number(form.workshopScore).toFixed(1) }}
              </span>
              <span class="text-slate-400">/100</span>
              <span class="text-xs text-slate-400 italic">(dari LMS, read-only)</span>
            </div>
          </div>

          <!-- Manual: editable -->
          <div v-else class="flex items-center gap-3">
            <input
              v-model.number="form.hasilTesTertulis"
              type="number" min="0" max="100"
              class="ct-input w-24 text-center font-bold text-lg"
              :class="formErrors.hasilTesTertulis ? 'border-red-400' : ''"
              placeholder="0"
            />
            <span class="text-slate-400">/100</span>
            <div class="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                :class="['h-full rounded-full transition-all duration-300', scoreBarClass(form.hasilTesTertulis)]"
                :style="`width: ${Math.min(Number(form.hasilTesTertulis) || 0, 100)}%`"
              />
            </div>
          </div>
          <p v-if="formErrors.hasilTesTertulis" class="text-red-500 text-xs mt-1">{{ formErrors.hasilTesTertulis }}</p>
        </div>

        <!-- [5] Ringkasan -->
        <div class="bg-slate-50 rounded-xl px-4 py-3 flex items-center gap-6 text-sm">
          <div>
            <p class="text-slate-400 text-xs uppercase tracking-wider">Rata-rata Nilai A</p>
            <p class="text-2xl font-bold" :class="scoreBarClass(calcAvg) === 'bg-emerald-500' ? 'text-emerald-600' : scoreBarClass(calcAvg) === 'bg-amber-400' ? 'text-amber-600' : 'text-red-600'">
              {{ calcAvg.toFixed(1) }}
            </p>
          </div>
          <div class="border-l border-slate-200 pl-5">
            <p class="text-slate-400 text-xs uppercase tracking-wider">Klasifikasi</p>
            <p class="font-bold text-lg" :class="classColor(calcClass)">{{ calcClass }}</p>
          </div>
          <div class="border-l border-slate-200 pl-5">
            <p class="text-slate-400 text-xs uppercase tracking-wider">Total Nilai A</p>
            <p class="font-semibold text-slate-700">{{ SCORE_FIELDS.reduce((s,f) => s + (Number(form.scoresUmum[f.key]) || 0), 0) }}</p>
          </div>
        </div>

        <!-- [6] Skill Map Update -->
        <div>
          <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Rekomendasi Skill Map Update (opsional)</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="md:col-span-2">
              <label class="ct-label">Item Kompetensi</label>
              <select v-model="form.skillMapUpdate.competencyItemId" class="ct-input">
                <option value="">-- Tidak ada update skill map --</option>
                <optgroup
                  v-for="cat in ['Auditor QMS','Audit Manufaktur dan Shift','Audit Produk','Audit Supplier']"
                  :key="cat" :label="cat"
                >
                  <option v-for="item in competency.items.filter(i => i.category === cat)" :key="item.id" :value="item.id">
                    {{ item.itemName }}
                  </option>
                </optgroup>
              </select>
            </div>
            <div v-if="form.skillMapUpdate.competencyItemId" class="flex items-center gap-4 md:col-span-2">
              <div>
                <p class="ct-label">Level Sebelum (saat ini)</p>
                <div class="flex items-center gap-2">
                  <CompetencySymbol :level="form.skillMapUpdate.before" class="text-base" />
                  <span class="text-slate-500 text-xs">{{ form.skillMapUpdate.before || '— (Belum Dinilai)' }}</span>
                </div>
              </div>
              <span class="text-slate-400 text-lg">→</span>
              <div>
                <label class="ct-label">Level Rekomendasi</label>
                <div class="flex items-center gap-2">
                  <button
                    v-for="l in afterLevels"
                    :key="l"
                    :class="form.skillMapUpdate.after === l ? 'ring-2 ring-blue-500' : 'ring-1 ring-slate-200'"
                    class="px-3 py-1.5 rounded-lg text-sm font-bold transition-all hover:ring-blue-300"
                    @click="form.skillMapUpdate.after = l"
                  >
                    {{ l }}
                  </button>
                  <span v-if="!afterLevels.length" class="text-slate-400 text-xs italic">Sudah level tertinggi</span>
                </div>
              </div>
            </div>

            <!-- LMS level suggestion chip -->
            <div v-if="lmsSuggestion && form.skillMapUpdate.competencyItemId" class="md:col-span-2">
              <div class="flex items-center gap-2 p-3 bg-blue-50/60 rounded-xl border border-blue-100">
                <Monitor class="w-4 h-4 text-blue-500 shrink-0" />
                <p class="text-xs text-slate-600">
                  <span class="font-semibold text-blue-700">Usulan LMS:</span>
                  naik ke level
                  <span class="font-bold text-blue-700">{{ lmsSuggestion.suggestedLevel }}</span>
                  <span v-if="lmsSuggestion.note" class="text-slate-500"> — {{ lmsSuggestion.note }}</span>
                </p>
                <button
                  v-if="afterLevels.includes(lmsSuggestion.suggestedLevel)"
                  class="ml-auto text-xs text-blue-600 hover:text-blue-800 font-medium"
                  @click="form.skillMapUpdate.after = lmsSuggestion.suggestedLevel"
                >
                  Terapkan
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- [7] Kesimpulan -->
        <div>
          <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Kesimpulan & Catatan</h3>
          <textarea
            v-model="form.kesimpulan"
            class="ct-input resize-none"
            rows="3"
            placeholder="Catatan evaluator mengenai perkembangan kompetensi auditor..."
          />
        </div>

      </div>

      <template #footer>
        <BaseButton variant="secondary" @click="formOpen = false">Batal</BaseButton>
        <BaseButton variant="secondary" :loading="formLoading" @click="saveDraft">
          Simpan Draft
        </BaseButton>
        <BaseButton variant="submit" :loading="formLoading" @click="submitApproval">
          <Send class="w-3.5 h-3.5" /> Kirim untuk Approval
        </BaseButton>
      </template>
    </BaseModal>

    <!-- ── Detail Modal ── -->
    <BaseModal v-model="detailOpen" :title="`Detail Evaluasi — ${detailEval?.auditorName ?? ''}`" size="xl">
      <template v-if="detailEval">

        <!-- Session + meta info -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5 p-4 bg-slate-50 rounded-xl text-sm">
          <div><p class="ct-label">Sesi Training</p><p class="font-medium text-slate-700">{{ detailEval.sessionName }}</p></div>
          <div><p class="ct-label">Tanggal</p><p class="font-medium text-slate-700">{{ detailEval.evaluationDate }}</p></div>
          <div><p class="ct-label">Klasifikasi</p>
            <p class="font-bold" :class="classColor(classifyNilai(detailEval.rataRataNilaiA ?? 0))">
              {{ classifyNilai(detailEval.rataRataNilaiA ?? 0) }}
            </p>
          </div>
          <div><p class="ct-label">Status</p><StatusBadge :status="detailEval.finalStatus" /></div>
        </div>

        <!-- Score breakdown -->
        <div class="mb-5">
          <p class="ct-label mb-3">Nilai A — Kepuasan Training</p>
          <div class="space-y-2">
            <div v-for="f in SCORE_FIELDS" :key="f.key" class="flex items-center gap-3 text-sm">
              <span class="w-52 text-slate-600 shrink-0">{{ f.label }}</span>
              <span class="w-10 font-bold text-center" :class="scoreBarClass(detailEval.scoresUmum?.[f.key]) === 'bg-emerald-500' ? 'text-emerald-600' : scoreBarClass(detailEval.scoresUmum?.[f.key]) === 'bg-amber-400' ? 'text-amber-600' : 'text-red-600'">
                {{ detailEval.scoresUmum?.[f.key] ?? '—' }}
              </span>
              <div class="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  :class="['h-full rounded-full', scoreBarClass(detailEval.scoresUmum?.[f.key])]"
                  :style="`width: ${Math.min(Number(detailEval.scoresUmum?.[f.key]) || 0, 100)}%`"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Summary row -->
        <div class="flex flex-wrap gap-4 mb-5 p-3 bg-slate-50 rounded-xl text-sm">
          <div>
            <p class="ct-label">Rata-rata Nilai A</p>
            <p class="text-2xl font-bold" :class="classColor(classifyNilai(detailEval.rataRataNilaiA ?? 0))">
              {{ detailEval.rataRataNilaiA?.toFixed(1) }}
            </p>
          </div>
          <div class="border-l pl-4">
            <p class="ct-label">Tes Tertulis</p>
            <p class="text-2xl font-bold" :class="Number(detailEval.hasilTesTertulis) >= 80 ? 'text-emerald-600' : 'text-amber-600'">
              {{ detailEval.hasilTesTertulis }}
            </p>
          </div>
          <div v-if="detailEval.skillMapUpdate?.competencyItemId" class="border-l pl-4">
            <p class="ct-label">Skill Map Update</p>
            <div class="flex items-center gap-2 mt-1">
              <CompetencySymbol :level="detailEval.skillMapUpdate.before" />
              <span class="text-slate-400">→</span>
              <CompetencySymbol :level="detailEval.skillMapUpdate.after" />
              <span class="text-xs text-slate-500">{{ itemName(detailEval.skillMapUpdate.competencyItemId) }}</span>
            </div>
          </div>
        </div>

        <!-- Approval chain -->
        <div v-if="detailEval.approvalChain?.length" class="mb-5">
          <p class="ct-label mb-2">Approval Chain</p>
          <ApprovalChainStepper :chain="detailEval.approvalChain" />
        </div>

        <!-- Kesimpulan -->
        <div v-if="detailEval.kesimpulan" class="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-100">
          <p class="ct-label mb-1">Kesimpulan Evaluator</p>
          <p class="text-slate-600 text-sm">{{ detailEval.kesimpulan }}</p>
        </div>

        <!-- Actions for Draft -->
        <div v-if="detailEval.finalStatus === 'Draft'" class="flex justify-end gap-3 pt-3 border-t border-slate-100">
          <BaseButton variant="secondary" @click="() => { detailOpen = false; openEdit(detailEval) }">Edit</BaseButton>
          <BaseButton variant="submit" @click="() => { submitExistingDraft(detailEval); detailOpen = false }">
            <Send class="w-3.5 h-3.5" /> Kirim untuk Approval
          </BaseButton>
        </div>

      </template>

      <template #footer>
        <BaseButton variant="secondary" @click="detailOpen = false">Tutup</BaseButton>
      </template>
    </BaseModal>

  </div>
</template>
