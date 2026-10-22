<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { History, Download, FileText, Award, GraduationCap } from '@lucide/vue'
import { useAuditorStore }         from '../../../stores/auditorStore.js'
import { useAuditorHistoryStore }  from '../../../stores/auditorHistoryStore.js'
import { useRevisionLogStore }     from '../../../stores/revisionLogStore.js'
import { useEvaluationStore }      from '../../../stores/evaluationStore.js'
import { useTrainingSessionStore } from '../../../stores/trainingSessionStore.js'
import { useCompetencyStore }      from '../../../stores/competencyStore.js'
import { useToast }                from '../../../shared/composables/useToast.js'
import StatusBadge                 from '../../../shared/components/StatusBadge.vue'
import CompetencySymbol             from '../../../shared/components/CompetencySymbol.vue'
import { exportQualificationCard } from '../../../services/exportService/exportQualificationCard.js'
import { exportEvaluationForm }    from '../../../services/exportService/exportEvaluationForm.js'

const route          = useRoute()
const auditorStore   = useAuditorStore()
const historyStore    = useAuditorHistoryStore()
const revisionStore   = useRevisionLogStore()
const evalStore       = useEvaluationStore()
const sessionStore    = useTrainingSessionStore()
const competency      = useCompetencyStore()
const toast           = useToast()

onMounted(() => {
  auditorStore.load(); historyStore.load(); revisionStore.load()
  evalStore.load(); sessionStore.load(); competency.load()
  const qNik = route.query.nik
  if (qNik) {
    const match = selectableAuditors.value.find(a => a.nik === String(qNik))
    if (match) selectedId.value = match.id
  }
})

// Active auditors + archived (non-active/resign) auditors, unified for the dropdown.
const archivedAuditors = computed(() =>
  historyStore.entries.map(h => ({
    id: `hist-${h.nik}`,
    nik: h.nik,
    name: h.name,
    section: h.section,
    position: '—',
    status: h.reason === 'Resign' ? 'Resign' : 'Tidak Aktif',
    scopeAuditor: h.lastScope ?? {},
    areaAuditPermission: {},
    joinAsAuditorDate: '—',
    _archived: true,
    _deactivatedDate: h.deactivatedDate,
    _reason: h.reason,
  }))
)

const selectableAuditors = computed(() => [
  ...auditorStore.auditors,
  ...archivedAuditors.value,
])

const selectedId = ref('')
const selected   = computed(() => selectableAuditors.value.find(a => a.id === selectedId.value))

const revisions = computed(() =>
  selectedId.value
    ? revisionStore.entries.filter(e => e.description.includes(selected.value?.name ?? ''))
    : []
)

const trainings = computed(() =>
  selectedId.value
    ? evalStore.evaluations
        .filter(e => e.auditorId === selectedId.value)
        .map(e => {
          const session = sessionStore.sessions.find(s => s.id === e.sessionId)
          return {
            id: e.id,
            date: e.evaluationDate,
            name: session?.trainingName ?? '-',
            organizer: session?.organizer ?? '-',
            trainer: session?.trainer ?? '-',
            score: e.rataRataNilaiA?.toFixed(1),
            testScore: e.hasilTesTertulis,
            status: e.finalStatus,
            session,
            evaluation: e,
          }
        })
    : []
)

const approvedTrainings = computed(() => trainings.value.filter(t => t.status === 'Approved'))

function classifyNilai(avg) {
  if (avg >= 90) return 'Memuaskan'
  if (avg >= 80) return 'Baik'
  if (avg >= 70) return 'Cukup'
  return 'Kurang'
}

const loading = ref('')

function exportCard() {
  if (!selected.value) return
  loading.value = 'card'
  try {
    exportQualificationCard(selected.value, revisions.value, approvedTrainings.value, false)
    toast.success('Kartu riwayat berhasil diunduh.')
  } catch (e) {
    toast.error('Gagal export: ' + e.message)
  } finally {
    loading.value = ''
  }
}

function exportEvalForm(training) {
  loading.value = 'eval'
  try {
    const auditor = selected.value
    const itemName = training.evaluation.skillMapUpdate?.competencyItemId
      ? competency.items.find(i => i.id === training.evaluation.skillMapUpdate.competencyItemId)?.itemName ?? ''
      : ''
    exportEvaluationForm(training.evaluation, auditor, training.session, itemName)
    toast.success('Form evaluasi berhasil diunduh.')
  } catch (e) {
    toast.error('Gagal export: ' + e.message)
  } finally {
    loading.value = ''
  }
}
</script>

<template>
  <div class="p-6 fade-in">
    <div class="flex items-start justify-between mb-5">
      <div>
        <h1 class="text-2xl font-bold text-slate-800">Kartu Riwayat Auditor</h1>
        <p class="text-slate-500 text-sm mt-1">Riwayat kualifikasi & pelatihan per auditor (Q-119-ISE-001-FORM-006)</p>
      </div>
      <button
        v-if="selected"
        class="btn-primary flex items-center gap-2"
        :disabled="loading === 'card'"
        @click="exportCard"
      >
        <svg v-if="loading === 'card'" class="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        <Download v-else class="w-4 h-4" />
        Export Excel
      </button>
    </div>

    <div class="ct-card p-4 mb-5">
      <label class="ct-label">Pilih Auditor</label>
      <select v-model="selectedId" class="ct-input max-w-xs">
        <option value="">-- Pilih auditor --</option>
        <optgroup label="Auditor Aktif">
          <option v-for="a in selectableAuditors.filter(a => !a._archived)" :key="a.id" :value="a.id">{{ a.name }} ({{ a.nik }}) · {{ a.status }}</option>
        </optgroup>
        <optgroup v-if="selectableAuditors.some(a => a._archived)" label="Arsip (Non-Aktif / Resign)">
          <option v-for="a in selectableAuditors.filter(a => a._archived)" :key="a.id" :value="a.id">{{ a.name }} ({{ a.nik }}) · {{ a.status }}</option>
        </optgroup>
      </select>
    </div>

    <template v-if="selected">
      <!-- Profile -->
      <div class="ct-card p-5 mb-5">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div><p class="ct-label">NIK</p><p class="font-medium text-slate-700">{{ selected.nik }}</p></div>
          <div><p class="ct-label">Nama</p><p class="font-medium text-slate-700">{{ selected.name }}</p></div>
          <div><p class="ct-label">Seksi</p><p class="font-medium text-slate-700">{{ selected.section }}</p></div>
          <div><p class="ct-label">Jabatan</p><p class="font-medium text-slate-700">{{ selected.position }}</p></div>
          <div><p class="ct-label">Status</p><StatusBadge :status="selected.status" /></div>
          <div><p class="ct-label">Bergabung Sejak</p><p class="font-medium text-slate-700">{{ selected.joinAsAuditorDate }}</p></div>
          <div v-if="selected._archived"><p class="ct-label">Tgl Non-Aktif</p><p class="font-medium text-slate-700">{{ selected._deactivatedDate }}</p></div>
          <div v-if="selected._archived"><p class="ct-label">Alasan</p><p class="font-medium text-slate-700">{{ selected._reason }}</p></div>
        </div>
      </div>

      <!-- Revision history -->
      <div class="ct-card p-5 mb-4">
        <div class="flex items-center gap-2 mb-3">
          <Award class="w-5 h-5 text-amber-500" />
          <h2 class="font-semibold text-slate-700">Riwayat Perubahan Kualifikasi</h2>
          <span class="ct-badge ct-badge-slate ml-auto">{{ revisions.length }} entri</span>
        </div>
        <div v-if="revisions.length" class="space-y-2">
          <div v-for="r in revisions" :key="r.id" class="p-3 bg-slate-50 rounded-lg text-sm border border-slate-100">
            <div class="flex items-center gap-2 mb-1">
              <span class="ct-badge ct-badge-blue">{{ r.type }}</span>
              <span class="text-slate-500">{{ r.date }}</span>
              <span class="ml-auto text-slate-400 text-xs">{{ r.revisionNumber }}</span>
            </div>
            <p class="text-slate-700">{{ r.description }}</p>
          </div>
        </div>
        <p v-else class="text-slate-400 italic text-sm text-center py-4">Belum ada riwayat perubahan kualifikasi</p>
      </div>

      <!-- Training history -->
      <div class="ct-card p-5">
        <div class="flex items-center gap-2 mb-3">
          <GraduationCap class="w-5 h-5 text-blue-500" />
          <h2 class="font-semibold text-slate-700">Riwayat Pendidikan & Pelatihan</h2>
          <span class="ct-badge ct-badge-slate ml-auto">{{ trainings.length }} entri</span>
        </div>
        <div v-if="trainings.length" class="overflow-x-auto">
          <table class="text-sm w-full">
            <thead>
              <tr class="ct-table-header">
                <th class="px-3 py-2 text-left">Tanggal</th>
                <th class="px-3 py-2 text-left">Nama Pelatihan</th>
                <th class="px-3 py-2 text-left">Penyelenggara</th>
                <th class="px-3 py-2 text-left">Trainer</th>
                <th class="px-3 py-2 text-center">Avg</th>
                <th class="px-3 py-2 text-center">Tes</th>
                <th class="px-3 py-2 text-center">Status</th>
                <th class="px-3 py-2 text-center">Form</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="t in trainings" :key="t.id" class="hover:bg-blue-50/40">
                <td class="px-3 py-2">{{ t.date }}</td>
                <td class="px-3 py-2 font-medium text-slate-700">{{ t.name }}</td>
                <td class="px-3 py-2 text-slate-500">{{ t.organizer }}</td>
                <td class="px-3 py-2 text-slate-500">{{ t.trainer }}</td>
                <td class="px-3 py-2 text-center font-bold" :class="Number(t.score) >= 80 ? 'text-emerald-600' : 'text-amber-600'">{{ t.score }}</td>
                <td class="px-3 py-2 text-center">{{ t.testScore }}</td>
                <td class="px-3 py-2 text-center"><StatusBadge :status="t.status" /></td>
                <td class="px-3 py-2 text-center">
                  <button
                    v-if="t.status === 'Approved'"
                    class="ct-action-btn-view"
                    title="Export Form Evaluasi"
                    :disabled="loading === 'eval'"
                    @click="exportEvalForm(t)"
                  >
                    <FileText class="w-3.5 h-3.5" />
                  </button>
                  <span v-else class="text-slate-300 text-xs">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="text-slate-400 italic text-sm text-center py-4">Belum ada riwayat pelatihan</p>
      </div>
    </template>

    <div v-else class="ct-card py-16 text-center">
      <div class="ct-empty-icon-wrap"><History class="w-9 h-9 text-slate-300" /></div>
      <p class="text-slate-400 italic text-sm">Pilih auditor untuk melihat kartu riwayat</p>
    </div>
  </div>
</template>
