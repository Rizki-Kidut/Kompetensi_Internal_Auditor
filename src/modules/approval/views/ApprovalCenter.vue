<script setup>
import { ref, computed, onMounted } from 'vue'
import {
  ShieldCheck, Check, X, ChevronDown, ChevronUp, AlertTriangle,
  Clock, History, CheckCircle, XCircle, ClipboardList, GraduationCap, UserCheck,
  FileCheck2,
} from '@lucide/vue'
import { useApprovalStore } from '../../../stores/approvalStore.js'
import { useAuditorStore } from '../../../stores/auditorStore.js'
import { useAuditorHistoryStore } from '../../../stores/auditorHistoryStore.js'
import { useCompetencyStore } from '../../../stores/competencyStore.js'
import { useEvaluationStore } from '../../../stores/evaluationStore.js'
import { useTrainingSessionStore } from '../../../stores/trainingSessionStore.js'
import { useRevisionLogStore } from '../../../stores/revisionLogStore.js'
import { useToast } from '../../../shared/composables/useToast.js'
import { classifyNilai } from '../../../services/calculationService.js'
import BaseModal from '../../../shared/components/BaseModal.vue'
import BaseButton from '../../../shared/components/BaseButton.vue'
import StatusBadge from '../../../shared/components/StatusBadge.vue'
import ApprovalChainStepper from '../../../shared/components/ApprovalChainStepper.vue'
import CompetencySymbol from '../../../shared/components/CompetencySymbol.vue'

const approvalStore  = useApprovalStore()
const auditorStore   = useAuditorStore()
const historyStore   = useAuditorHistoryStore()
const competencyStore= useCompetencyStore()
const evalStore      = useEvaluationStore()
const sessionStore   = useTrainingSessionStore()
const revisionStore  = useRevisionLogStore()
const toast = useToast()

onMounted(() => {
  approvalStore.load(); auditorStore.load(); historyStore.load()
  competencyStore.load(); evalStore.load(); sessionStore.load(); revisionStore.load()
})

// ─── Tabs ──────────────────────────────────────────────────
const tab = ref('pengajuan')

// ─── Expandable rows ───────────────────────────────────────
const expandedId = ref(null)
function toggleExpand(id) { expandedId.value = expandedId.value === id ? null : id }

// ─── Pending data ──────────────────────────────────────────
const pendingRequests = computed(() =>
  approvalStore.requests.filter(r => r.finalStatus === 'Pending')
)
const pendingEvals = computed(() =>
  evalStore.evaluations
    .filter(e => e.finalStatus === 'Menunggu Approval')
    .map(e => ({
      ...e,
      auditorName:  auditorStore.auditors.find(a => a.id === e.auditorId)?.name ?? e.auditorId,
      trainingName: sessionStore.sessions.find(s => s.id === e.sessionId)?.trainingName ?? e.sessionId,
      auditor:      auditorStore.auditors.find(a => a.id === e.auditorId),
      session:      sessionStore.sessions.find(s => s.id === e.sessionId),
    }))
)

// ─── History data ──────────────────────────────────────────
const completedRequests = computed(() =>
  approvalStore.requests.filter(r => r.finalStatus !== 'Pending')
)
const completedEvals = computed(() =>
  evalStore.evaluations
    .filter(e => e.finalStatus === 'Approved' || e.finalStatus === 'Ditolak')
    .map(e => ({
      ...e,
      auditorName:  auditorStore.auditors.find(a => a.id === e.auditorId)?.name ?? e.auditorId,
      trainingName: sessionStore.sessions.find(s => s.id === e.sessionId)?.trainingName ?? e.sessionId,
    }))
)

const historyFilter = ref('Semua')
const HISTORY_OPTS = ['Semua', 'Approved', 'Declined', 'Ditolak']

const filteredHistory = computed(() => {
  const all = [
    ...completedRequests.value.map(r => ({ ...r, _kind: 'request', _date: r.submittedDate })),
    ...completedEvals.value.map(e => ({ ...e, _kind: 'eval', _date: e.evaluationDate })),
  ]
  if (historyFilter.value === 'Approved')
    return all.filter(i => i.finalStatus === 'Approved')
  if (historyFilter.value === 'Declined' || historyFilter.value === 'Ditolak')
    return all.filter(i => i.finalStatus === 'Declined' || i.finalStatus === 'Ditolak')
  return all.sort((a, b) => b._date.localeCompare(a._date))
})

// ─── Summary stats ─────────────────────────────────────────
const stats = computed(() => [
  { label: 'Pengajuan Menunggu',  value: pendingRequests.value.length,   icon: ClipboardList, color: 'bg-amber-100 text-amber-600' },
  { label: 'Evaluasi Menunggu',   value: pendingEvals.value.length,      icon: GraduationCap, color: 'bg-blue-100 text-blue-600' },
  { label: 'Pengajuan Selesai',   value: completedRequests.value.length, icon: CheckCircle,   color: 'bg-emerald-100 text-emerald-600' },
  { label: 'Evaluasi Selesai',    value: completedEvals.value.length,    icon: FileCheck2,    color: 'bg-teal-100 text-teal-600' },
])

const totalPending = computed(() => pendingRequests.value.length + pendingEvals.value.length)

// ─── Score fields for eval detail ──────────────────────────
const SCORE_FIELDS = [
  { key: 'pemahamanIsi',         label: 'Pemahaman Isi Training' },
  { key: 'peningkatanSkill',     label: 'Peningkatan Skill' },
  { key: 'peningkatanKinerja',   label: 'Peningkatan Kinerja' },
  { key: 'implementasi',         label: 'Implementasi di Pekerjaan' },
  { key: 'improvement',          label: 'Ide Improvement' },
  { key: 'mengajarkanOrangLain', label: 'Mengajarkan ke Orang Lain' },
]

function scoreBarClass(val) {
  const n = Number(val) || 0
  if (n >= 85) return 'bg-emerald-500'
  if (n >= 70) return 'bg-amber-400'
  return 'bg-red-400'
}
function classColor(cls) {
  return { Memuaskan: 'text-emerald-600', Baik: 'text-blue-600', Cukup: 'text-amber-600', Kurang: 'text-red-600' }[cls] ?? ''
}
function itemName(id) {
  return competencyStore.items.find(i => i.id === id)?.itemName ?? id
}

// ─── Approval action modal ─────────────────────────────────
const actionModal  = ref(false)
const actionMode   = ref('approve')
const actionTarget = ref(null)
const actionTargetType = ref('')
const approverName = ref('')
const approverNote = ref('')
const actionLoading = ref(false)
const approverNameError = ref('')

function getPendingStep(chain) {
  return chain?.find(s => s.status === 'Pending')
}

function openAction(item, type, mode) {
  actionTarget.value = item
  actionTargetType.value = type
  actionMode.value = mode
  approverName.value = ''
  approverNote.value = ''
  approverNameError.value = ''
  actionModal.value = true
}

async function confirmAction() {
  if (!approverName.value.trim()) {
    approverNameError.value = 'Masukkan nama approver'
    return
  }
  approverNameError.value = ''
  actionLoading.value = true

  try {
    const pendingStep = getPendingStep(actionTarget.value.approvalChain)
    if (!pendingStep) return

    if (actionTargetType.value === 'request') {
      let result
      if (actionMode.value === 'approve') {
        result = approvalStore.approveStep(
          actionTarget.value.id, pendingStep.role,
          approverName.value.trim(), approverNote.value.trim(),
        )
        if (result.finalStatus === 'Approved') {
          await executeFinalApprovalRequest(result)
        } else {
          toast.success(`Step "${pendingStep.role}" disetujui.`)
        }
      } else {
        result = approvalStore.declineStep(
          actionTarget.value.id, pendingStep.role,
          approverName.value.trim(), approverNote.value.trim(),
        )
        toast.error(`Pengajuan "${result.name}" ditolak oleh ${approverName.value}.`)
      }
    } else {
      let result
      if (actionMode.value === 'approve') {
        result = evalStore.approveStep(
          actionTarget.value.id, pendingStep.role,
          approverName.value.trim(), approverNote.value.trim(),
        )
        if (result.finalStatus === 'Approved') {
          executeEvalApproved(result)
          toast.success(`Evaluasi training approved. Matrix kompetensi diperbarui.`)
        } else {
          toast.success(`Step "${pendingStep.role}" disetujui.`)
        }
      } else {
        result = evalStore.declineStep(
          actionTarget.value.id, pendingStep.role,
          approverName.value.trim(), approverNote.value.trim(),
        )
        toast.error(`Evaluasi ditolak oleh ${approverName.value}.`)
      }
    }

    actionModal.value = false
    expandedId.value = null
  } finally {
    actionLoading.value = false
  }
}

// ─── Post-approval side effects ────────────────────────────
function executeFinalApprovalRequest(req) {
  if (req.requestType === 'Tambah Auditor') {
    const newAuditor = {
      id: `aud-${Date.now()}`,
      nik: req.nik, name: req.name, section: req.section,
      position: req.position ?? 'Staff', status: 'Aktif',
      scopeAuditor: req.initialScope ?? { qms: false, manufakturShift: false, produk: false, supplier: false },
      areaAuditPermission: {},
      joinAsAuditorDate: new Date().toISOString().slice(0, 10),
    }
    auditorStore.add(newAuditor)
    competencyStore.addAuditorCells(newAuditor.id)
    addRevisionLog('Daftar Auditor',
      `Penambahan auditor baru: ${req.name} (${req.nik}), Seksi ${req.section}. Pengajuan ${req.id} disetujui.`)
    toast.success(`Auditor baru "${req.name}" berhasil ditambahkan ke sistem.`)
  } else if (req.requestType === 'Non-Aktif Auditor') {
    const auditor = auditorStore.auditors.find(a => a.nik === req.nik)
    if (auditor) {
      const finalStatus = req.reason === 'Resign' ? 'Resign' : 'Tidak Aktif'
      historyStore.addEntry({
        id: `hist-${Date.now()}`,
        nik: auditor.nik, name: auditor.name, section: auditor.section,
        lastScope: { ...auditor.scopeAuditor },
        lastCompetencyLevel: '◆',
        deactivatedDate: new Date().toISOString().slice(0, 10),
        reason: req.reason, sourceRequestId: req.id,
      })
      auditorStore.setStatus(auditor.id, finalStatus)
      addRevisionLog('Daftar Auditor',
        `Non-aktif auditor: ${auditor.name} (${auditor.nik}), alasan: ${req.reason}. Pengajuan ${req.id} disetujui.`)
      toast.success(`Auditor "${auditor.name}" berhasil di-non-aktifkan.`)
    }
  }
}

function executeEvalApproved(ev) {
  if (!ev.skillMapUpdate) return
  const { competencyItemId, after, before } = ev.skillMapUpdate
  const auditor = auditorStore.auditors.find(a => a.id === ev.auditorId)
  competencyStore.updateCell(ev.auditorId, competencyItemId, after, auditor?.name ?? 'System', ev.id)
  const item = competencyStore.items.find(i => i.id === competencyItemId)
  addRevisionLog('Matrix Kompetensi',
    `Update kompetensi ${auditor?.name ?? ev.auditorId}: ${item?.itemName ?? competencyItemId} dari ${before} ke ${after}, berdasarkan Evaluasi Training tanggal ${ev.evaluationDate}.`)
}

function addRevisionLog(type, description) {
  revisionStore.addEntry({
    id: `rl-${Date.now()}`,
    date: new Date().toISOString().slice(0, 10),
    type, description,
    revisionNumber: `Rev.${String(revisionStore.entries.length + 1).padStart(2, '0')}`,
  })
}

// ─── Type badge ────────────────────────────────────────────
const TYPE_COLOR = {
  'Tambah Auditor':    'ct-badge-emerald',
  'Non-Aktif Auditor': 'ct-badge-red',
}


</script>

<template>
  <div class="p-6 fade-in">
    <!-- Header -->
    <div class="flex items-start justify-between mb-5">
      <div>
        <h1 class="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <ShieldCheck class="w-6 h-6 text-amber-500" />
          Approval Center
        </h1>
        <p class="text-slate-500 text-sm mt-1">Pusat persetujuan semua pengajuan yang membutuhkan approval</p>
      </div>
      <div v-if="totalPending > 0" class="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-50 border border-amber-200">
        <Clock class="w-4 h-4 text-amber-600" />
        <span class="text-sm font-bold text-amber-700">{{ totalPending }} menunggu</span>
      </div>
    </div>

    <!-- Summary stats -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
      <div v-for="stat in stats" :key="stat.label" class="ct-card p-4 flex items-center gap-3">
        <div :class="['w-10 h-10 rounded-lg flex items-center justify-center', stat.color]">
          <component :is="stat.icon" class="w-5 h-5" />
        </div>
        <div>
          <p class="text-2xl font-bold text-slate-800 leading-none">{{ stat.value }}</p>
          <p class="text-xs text-slate-500 mt-1">{{ stat.label }}</p>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex gap-1 mb-5 bg-slate-100 p-1 rounded-xl w-fit">
      <button
        :class="tab === 'pengajuan' ? 'bg-white shadow-sm text-slate-800 font-semibold' : 'text-slate-500 hover:text-slate-700'"
        class="px-5 py-2 rounded-lg text-sm transition-all"
        @click="tab = 'pengajuan'"
      >
        Pengajuan Auditor
        <span v-if="pendingRequests.length" class="ml-1.5 bg-amber-500 text-white rounded-full px-1.5 py-0.5 text-xs font-bold">{{ pendingRequests.length }}</span>
      </button>
      <button
        :class="tab === 'evaluasi' ? 'bg-white shadow-sm text-slate-800 font-semibold' : 'text-slate-500 hover:text-slate-700'"
        class="px-5 py-2 rounded-lg text-sm transition-all"
        @click="tab = 'evaluasi'"
      >
        Evaluasi Training
        <span v-if="pendingEvals.length" class="ml-1.5 bg-amber-500 text-white rounded-full px-1.5 py-0.5 text-xs font-bold">{{ pendingEvals.length }}</span>
      </button>
      <button
        :class="tab === 'history' ? 'bg-white shadow-sm text-slate-800 font-semibold' : 'text-slate-500 hover:text-slate-700'"
        class="px-5 py-2 rounded-lg text-sm transition-all"
        @click="tab = 'history'"
      >
        <History class="w-3.5 h-3.5 inline mr-1" /> Riwayat
      </button>
    </div>

    <!-- ── Tab: Pengajuan Auditor ── -->
    <div v-if="tab === 'pengajuan'">
      <div v-if="pendingRequests.length" class="space-y-3">
        <div v-for="req in pendingRequests" :key="req.id" class="ct-card overflow-hidden">
          <div
            class="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-slate-50 transition-colors"
            @click="toggleExpand(req.id)"
          >
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <span :class="['ct-badge', TYPE_COLOR[req.requestType] ?? 'ct-badge-blue']">{{ req.requestType }}</span>
                <StatusBadge :status="req.finalStatus" />
              </div>
              <p class="font-semibold text-slate-800">{{ req.name }}
                <span class="text-slate-400 font-normal text-xs ml-1">({{ req.nik }} · {{ req.section }})</span>
              </p>
              <p class="text-xs text-slate-500 mt-0.5">
                Diajukan oleh <strong>{{ req.submittedBy }}</strong> · {{ req.submittedDate }}
                <span v-if="req.reason" class="ml-2">· Alasan: {{ req.reason }}</span>
              </p>
            </div>
            <div class="hidden md:block shrink-0">
              <ApprovalChainStepper :chain="req.approvalChain" :compact="true" />
            </div>
            <component :is="expandedId === req.id ? ChevronUp : ChevronDown" class="w-4 h-4 text-slate-400 shrink-0" />
          </div>

          <div v-if="expandedId === req.id" class="border-t border-slate-100 px-5 py-4 bg-slate-50/60">
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-sm">
              <div><p class="ct-label">Jabatan</p><p class="text-slate-700">{{ req.position ?? '—' }}</p></div>
              <div v-if="req.requestType === 'Tambah Auditor' && req.initialScope">
                <p class="ct-label">Scope Awal</p>
                <div class="flex flex-wrap gap-1">
                  <span v-if="req.initialScope.qms"            class="ct-badge ct-badge-blue">QMS</span>
                  <span v-if="req.initialScope.manufakturShift" class="ct-badge ct-badge-amber">Mfg Shift</span>
                  <span v-if="req.initialScope.produk"          class="ct-badge ct-badge-emerald">Produk</span>
                  <span v-if="req.initialScope.supplier"        class="ct-badge ct-badge-red">Supplier</span>
                  <span v-if="!Object.values(req.initialScope).some(Boolean)" class="text-slate-400 text-xs italic">Tidak ada</span>
                </div>
              </div>
              <div class="col-span-full" v-if="req.reasonDetail">
                <p class="ct-label">Keterangan</p>
                <p class="text-slate-600">{{ req.reasonDetail }}</p>
              </div>
            </div>

            <div class="mb-4">
              <p class="ct-label mb-2">Approval Chain</p>
              <ApprovalChainStepper :chain="req.approvalChain" />
            </div>

            <div v-if="getPendingStep(req.approvalChain)" class="flex items-center gap-3 pt-3 border-t border-slate-200">
              <div class="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg border border-amber-100">
                <AlertTriangle class="w-3.5 h-3.5" />
                Menunggu: <strong>{{ getPendingStep(req.approvalChain)?.role }}</strong>
              </div>
              <div class="ml-auto flex gap-2">
                <button class="btn-danger-outline flex items-center gap-1.5" @click="openAction(req, 'request', 'decline')">
                  <X class="w-3.5 h-3.5" /> Tolak
                </button>
                <button class="btn-success flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold" @click="openAction(req, 'request', 'approve')">
                  <Check class="w-3.5 h-3.5" /> Setujui
                </button>
              </div>
            </div>
            <div v-else class="flex items-center gap-2 pt-3 border-t border-slate-200">
              <StatusBadge :status="req.finalStatus" />
              <span class="text-xs text-slate-500">Tidak ada step yang perlu di-approve</span>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="ct-card py-16 text-center">
        <div class="ct-empty-icon-wrap"><ShieldCheck class="w-10 h-10 text-slate-300" /></div>
        <p class="text-slate-500 font-medium">Tidak ada pengajuan auditor yang menunggu approval</p>
      </div>
    </div>

    <!-- ── Tab: Evaluasi Training ── -->
    <div v-if="tab === 'evaluasi'">
      <div v-if="pendingEvals.length" class="space-y-3">
        <div v-for="ev in pendingEvals" :key="ev.id" class="ct-card overflow-hidden">
          <div
            class="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-slate-50 transition-colors"
            @click="toggleExpand(ev.id)"
          >
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <span class="ct-badge ct-badge-blue">Evaluasi Training</span>
                <StatusBadge :status="ev.finalStatus" />
              </div>
              <p class="font-semibold text-slate-800">{{ ev.auditorName }}</p>
              <p class="text-xs text-slate-500 mt-0.5">{{ ev.trainingName }} · {{ ev.evaluationDate }}</p>
            </div>
            <div class="hidden md:block shrink-0">
              <ApprovalChainStepper :chain="ev.approvalChain" :compact="true" />
            </div>
            <component :is="expandedId === ev.id ? ChevronUp : ChevronDown" class="w-4 h-4 text-slate-400 shrink-0" />
          </div>

          <div v-if="expandedId === ev.id" class="border-t border-slate-100 px-5 py-4 bg-slate-50/60">
            <!-- Score breakdown -->
            <div class="mb-4">
              <p class="ct-label mb-2">Rincian Penilaian</p>
              <div class="space-y-1.5">
                <div v-for="f in SCORE_FIELDS" :key="f.key" class="flex items-center gap-3 text-sm">
                  <span class="w-48 text-slate-600 text-xs shrink-0">{{ f.label }}</span>
                  <span class="w-8 text-center font-bold text-xs" :class="scoreBarClass(ev.scoresUmum?.[f.key]) === 'bg-emerald-500' ? 'text-emerald-600' : scoreBarClass(ev.scoresUmum?.[f.key]) === 'bg-amber-400' ? 'text-amber-600' : 'text-red-600'">
                    {{ ev.scoresUmum?.[f.key] ?? '—' }}
                  </span>
                  <div class="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div :class="['h-full rounded-full', scoreBarClass(ev.scoresUmum?.[f.key])]" :style="`width: ${Math.min(Number(ev.scoresUmum?.[f.key]) || 0, 100)}%`" />
                  </div>
                </div>
              </div>
            </div>

            <!-- Summary row -->
            <div class="flex flex-wrap gap-4 mb-4 p-3 bg-white rounded-lg border border-slate-100">
              <div>
                <p class="ct-label">Rata-rata</p>
                <p class="text-xl font-bold" :class="classColor(classifyNilai(ev.rataRataNilaiA ?? 0))">{{ ev.rataRataNilaiA?.toFixed(1) }}</p>
              </div>
              <div class="border-l pl-4">
                <p class="ct-label">Klasifikasi</p>
                <p class="font-bold" :class="classColor(classifyNilai(ev.rataRataNilaiA ?? 0))">{{ classifyNilai(ev.rataRataNilaiA ?? 0) }}</p>
              </div>
              <div class="border-l pl-4">
                <p class="ct-label">Tes Tertulis</p>
                <p class="font-bold text-slate-700">{{ ev.hasilTesTertulis ?? '—' }}</p>
              </div>
              <div v-if="ev.skillMapUpdate" class="border-l pl-4">
                <p class="ct-label">Skill Map Update</p>
                <div class="flex items-center gap-2 mt-1">
                  <CompetencySymbol :level="ev.skillMapUpdate.before" size="sm" />
                  <span class="text-slate-400 text-xs">→</span>
                  <CompetencySymbol :level="ev.skillMapUpdate.after" size="sm" />
                  <span class="text-xs text-slate-500">{{ itemName(ev.skillMapUpdate.competencyItemId) }}</span>
                </div>
              </div>
            </div>

            <!-- Kesimpulan -->
            <div v-if="ev.kesimpulan" class="mb-4 p-3 bg-white rounded-lg border border-slate-100">
              <p class="ct-label mb-1">Kesimpulan Evaluator</p>
              <p class="text-sm text-slate-600">{{ ev.kesimpulan }}</p>
            </div>

            <!-- Chain -->
            <div class="mb-4">
              <p class="ct-label mb-2">Approval Chain</p>
              <ApprovalChainStepper :chain="ev.approvalChain" />
            </div>

            <!-- Actions -->
            <div v-if="getPendingStep(ev.approvalChain)" class="flex items-center gap-3 pt-3 border-t border-slate-200">
              <div class="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg border border-amber-100">
                <AlertTriangle class="w-3.5 h-3.5" />
                Menunggu: <strong>{{ getPendingStep(ev.approvalChain)?.role }}</strong>
              </div>
              <div class="ml-auto flex gap-2">
                <button class="btn-danger-outline flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold" @click="openAction(ev, 'eval', 'decline')">
                  <X class="w-3.5 h-3.5" /> Tolak
                </button>
                <button class="btn-success flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold" @click="openAction(ev, 'eval', 'approve')">
                  <Check class="w-3.5 h-3.5" /> Setujui
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="ct-card py-16 text-center">
        <div class="ct-empty-icon-wrap"><ShieldCheck class="w-10 h-10 text-slate-300" /></div>
        <p class="text-slate-500 font-medium">Tidak ada evaluasi yang menunggu approval</p>
      </div>
    </div>

    <!-- ── Tab: History ── -->
    <div v-if="tab === 'history'">
      <div class="flex gap-1 mb-4">
        <button
          v-for="opt in HISTORY_OPTS"
          :key="opt"
          :class="historyFilter === opt ? 'btn-primary' : 'btn-secondary'"
          class="text-xs px-3 py-1.5"
          @click="historyFilter = opt"
        >{{ opt }}</button>
      </div>

      <div v-if="filteredHistory.length" class="ct-card overflow-hidden">
        <table class="w-full text-sm">
          <thead>
            <tr class="ct-table-header">
              <th class="px-4 py-3 text-left text-slate-600 font-semibold">Jenis</th>
              <th class="px-4 py-3 text-left text-slate-600 font-semibold">Subjek</th>
              <th class="px-4 py-3 text-left text-slate-600 font-semibold">Tanggal</th>
              <th class="px-4 py-3 text-center text-slate-600 font-semibold">Approval Chain</th>
              <th class="px-4 py-3 text-center text-slate-600 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="item in filteredHistory" :key="item.id" class="hover:bg-slate-50 transition-colors">
              <td class="px-4 py-3">
                <span :class="['ct-badge', item._kind === 'request' ? (TYPE_COLOR[item.requestType] ?? 'ct-badge-blue') : 'ct-badge-blue']">
                  {{ item._kind === 'request' ? item.requestType : 'Evaluasi' }}
                </span>
              </td>
              <td class="px-4 py-3 font-medium text-slate-700">
                {{ item.name ?? item.auditorName }}
                <span v-if="item._kind === 'eval'" class="text-slate-400 text-xs block">{{ item.trainingName }}</span>
              </td>
              <td class="px-4 py-3 text-slate-500 text-xs">{{ item._date }}</td>
              <td class="px-4 py-3">
                <div class="flex justify-center">
                  <ApprovalChainStepper :chain="item.approvalChain" :compact="true" />
                </div>
              </td>
              <td class="px-4 py-3 text-center"><StatusBadge :status="item.finalStatus" /></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="ct-card py-16 text-center">
        <div class="ct-empty-icon-wrap"><History class="w-10 h-10 text-slate-300" /></div>
        <p class="text-slate-500 font-medium">Belum ada riwayat approval</p>
      </div>
    </div>

    <!-- Approval action modal -->
    <BaseModal
      v-model="actionModal"
      :title="actionMode === 'approve' ? 'Konfirmasi Persetujuan' : 'Konfirmasi Penolakan'"
      size="sm"
    >
      <template v-if="actionTarget">
        <div class="mb-4 p-3 rounded-lg" :class="actionMode === 'approve' ? 'bg-emerald-50 border border-emerald-100' : 'bg-red-50 border border-red-100'">
          <p class="text-sm font-medium" :class="actionMode === 'approve' ? 'text-emerald-700' : 'text-red-700'">
            {{ actionMode === 'approve' ? 'Menyetujui' : 'Menolak' }}:
            <strong>{{ actionTarget.name ?? actionTarget.auditorName }}</strong>
          </p>
          <p class="text-xs mt-0.5" :class="actionMode === 'approve' ? 'text-emerald-600' : 'text-red-600'">
            Role: {{ getPendingStep(actionTarget.approvalChain)?.role }}
          </p>
        </div>

        <div class="space-y-3">
          <div>
            <label class="ct-label">Nama Approver <span class="text-red-500">*</span></label>
            <input
              v-model="approverName"
              type="text"
              class="ct-input"
              :class="approverNameError ? 'border-red-400' : ''"
              placeholder="Masukkan nama Anda"
            />
            <p v-if="approverNameError" class="text-red-500 text-xs mt-1">{{ approverNameError }}</p>
          </div>
          <div>
            <label class="ct-label">Catatan / Note (opsional)</label>
            <textarea v-model="approverNote" class="ct-input resize-none" rows="2" placeholder="Catatan..." />
          </div>
        </div>
      </template>

      <template #footer>
        <BaseButton variant="secondary" @click="actionModal = false">Batal</BaseButton>
        <BaseButton
          :variant="actionMode === 'approve' ? 'success' : 'danger'"
          :loading="actionLoading"
          @click="confirmAction"
        >
          {{ actionMode === 'approve' ? 'Setujui' : 'Tolak' }}
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>
