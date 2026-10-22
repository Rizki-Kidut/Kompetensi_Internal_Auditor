<script setup>
import { ref, onMounted } from 'vue'
import { FileText, Table, Download } from '@lucide/vue'
import { useAuditorStore }         from '../../../stores/auditorStore.js'
import { useCompetencyStore }      from '../../../stores/competencyStore.js'
import { useRevisionLogStore }     from '../../../stores/revisionLogStore.js'
import { useEvaluationStore }      from '../../../stores/evaluationStore.js'
import { useTrainingSessionStore } from '../../../stores/trainingSessionStore.js'
import { useToast }                from '../../../shared/composables/useToast.js'
import { exportAuditorList }       from '../../../services/exportService/exportAuditorList.js'
import { exportCompetencyMatrix } from '../../../services/exportService/exportCompetencyMatrix.js'
import { exportQualificationCard, exportQualificationCardBatch } from '../../../services/exportService/exportQualificationCard.js'

const auditorStore  = useAuditorStore()
const competency    = useCompetencyStore()
const revisionStore  = useRevisionLogStore()
const evalStore      = useEvaluationStore()
const sessionStore   = useTrainingSessionStore()
const toast          = useToast()

const loading       = ref('')
const cardAuditorId = ref('')

onMounted(() => {
  auditorStore.load(); competency.load(); revisionStore.load()
  evalStore.load(); sessionStore.load()
})

function classifyNilai(avg) {
  if (avg >= 90) return 'Memuaskan'
  if (avg >= 80) return 'Baik'
  if (avg >= 70) return 'Cukup'
  return 'Kurang'
}

function runExport(key, fn) {
  loading.value = key
  try {
    fn()
    toast.success('Export berhasil diunduh.')
  } catch (e) {
    console.error(e)
    toast.error('Gagal export: ' + e.message)
  } finally {
    loading.value = ''
  }
}

function doAuditorList() {
  runExport('auditor', () =>
    exportAuditorList(auditorStore.auditors, revisionStore.entries)
  )
}

function doMatrix() {
  runExport('matrix', () =>
    exportCompetencyMatrix(auditorStore.auditors, competency.items, competency.matrix, revisionStore.entries)
  )
}

function doCardOne() {
  if (!cardAuditorId.value) return
  runExport('card', () => {
    const a = auditorStore.auditors.find(a => a.id === cardAuditorId.value)
    const revs = revisionStore.entries.filter(r => r.description.includes(a.name))
    const trains = evalStore.evaluations
      .filter(e => e.auditorId === a.id && e.finalStatus === 'Approved')
      .map(e => ({
        date: e.evaluationDate,
        name: sessionStore.sessions.find(s => s.id === e.sessionId)?.trainingName ?? '-',
        trainer: sessionStore.sessions.find(s => s.id === e.sessionId)?.trainer ?? '-',
        score: e.rataRataNilaiA?.toFixed(1),
        classification: classifyNilai(e.rataRataNilaiA ?? 0),
      }))
    exportQualificationCard(a, revs, trains, false)
  })
}

function doCardBatch() {
  runExport('batch', () => {
    const revMap = {}
    const trainMap = {}
    for (const a of auditorStore.auditors.filter(a => a.status === 'Aktif')) {
      revMap[a.id] = revisionStore.entries.filter(r => r.description.includes(a.name))
      trainMap[a.id] = evalStore.evaluations
        .filter(e => e.auditorId === a.id && e.finalStatus === 'Approved')
        .map(e => ({
          date: e.evaluationDate,
          name: sessionStore.sessions.find(s => s.id === e.sessionId)?.trainingName ?? '-',
          trainer: sessionStore.sessions.find(s => s.id === e.sessionId)?.trainer ?? '-',
          score: e.rataRataNilaiA?.toFixed(1),
          classification: classifyNilai(e.rataRataNilaiA ?? 0),
        }))
    }
    exportQualificationCardBatch(auditorStore.auditors, revMap, trainMap)
  })
}
</script>

<template>
  <div class="p-6 fade-in">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-slate-800">Laporan & Export</h1>
      <p class="text-slate-500 text-sm mt-1">Export dokumen resmi sesuai format form ISO/IATF</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
      <!-- Daftar Auditor -->
      <div class="ct-card p-6 flex flex-col">
        <div class="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-4">
          <FileText class="w-6 h-6" />
        </div>
        <div class="mb-1 text-xs font-bold text-slate-400 uppercase tracking-wide">Q-120-ISE-001-FORM-012</div>
        <h3 class="font-semibold text-slate-800 text-base mb-2">Daftar Internal Auditor</h3>
        <p class="text-slate-500 text-sm flex-1 mb-5">PDF daftar auditor aktif beserta scope & penugasan area audit, riwayat revisi, dan blok tanda tangan.</p>
        <button
          class="btn-primary w-full justify-center flex items-center gap-2"
          :disabled="loading === 'auditor'"
          @click="doAuditorList"
        >
          <svg v-if="loading === 'auditor'" class="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          <FileText v-else class="w-4 h-4" />
          {{ loading === 'auditor' ? 'Generating...' : 'Export PDF' }}
        </button>
      </div>

      <!-- Matrix Kompetensi -->
      <div class="ct-card p-6 flex flex-col">
        <div class="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
          <Table class="w-6 h-6" />
        </div>
        <div class="mb-1 text-xs font-bold text-slate-400 uppercase tracking-wide">Q-120-ISE-001-FORM-013</div>
        <h3 class="font-semibold text-slate-800 text-base mb-2">Standard Kompetensi Auditor</h3>
        <p class="text-slate-500 text-sm flex-1 mb-5">PDF matrix kompetensi seluruh auditor aktif per 4 kategori, riwayat revisi, legenda simbol, & tanda tangan.</p>
        <button
          class="btn-success w-full justify-center flex items-center gap-2"
          :disabled="loading === 'matrix'"
          @click="doMatrix"
        >
          <svg v-if="loading === 'matrix'" class="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          <Table v-else class="w-4 h-4" />
          {{ loading === 'matrix' ? 'Generating...' : 'Export PDF' }}
        </button>
      </div>
    </div>

    <!-- Kartu Riwayat (per auditor) -->
    <div class="ct-card p-6 mb-5">
      <div class="flex items-start gap-4">
        <div class="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
          <Download class="w-6 h-6" />
        </div>
        <div class="flex-1">
          <div class="mb-1 text-xs font-bold text-slate-400 uppercase tracking-wide">Q-119-ISE-001-FORM-006</div>
          <h3 class="font-semibold text-slate-800 text-base mb-1">Kartu Riwayat Kualifikasi (per Auditor)</h3>
          <p class="text-slate-500 text-sm mb-3">Pilih auditor untuk export Excel kartu riwayat individu.</p>
          <div class="flex flex-wrap items-center gap-3">
            <select v-model="cardAuditorId" class="ct-input max-w-xs">
              <option value="">-- Pilih auditor --</option>
              <option v-for="a in auditorStore.auditors.filter(a => a.status === 'Aktif')" :key="a.id" :value="a.id">
                {{ a.name }} ({{ a.nik }})
              </option>
            </select>
            <button
              class="btn-secondary flex items-center gap-2"
              :disabled="!cardAuditorId || loading === 'card'"
              @click="doCardOne"
            >
              <svg v-if="loading === 'card'" class="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              <Download v-else class="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Batch export -->
    <div class="ct-card p-5 flex items-center justify-between">
      <div>
        <p class="font-semibold text-slate-700">Export Semua Kartu Riwayat (Batch)</p>
        <p class="text-slate-500 text-sm mt-0.5">Satu file Excel, satu sheet per auditor aktif</p>
      </div>
      <button
        class="btn-success flex items-center gap-2"
        :disabled="loading === 'batch'"
        @click="doCardBatch"
      >
        <svg v-if="loading === 'batch'" class="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        <Download v-else class="w-4 h-4" />
        {{ loading === 'batch' ? 'Generating...' : 'Export Semua' }}
      </button>
    </div>
  </div>
</template>
