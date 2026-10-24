<script setup>
import { ref, computed, onMounted } from 'vue'
import {
  BarChart3, Download, Users, ClipboardCheck, Award, TrendingUp,
} from '@lucide/vue'
import * as XLSX from 'xlsx'
import { useLmsEnrollmentStore }  from '../../../stores/lmsEnrollmentStore.js'
import { useLmsTestStore }        from '../../../stores/lmsTestStore.js'
import { useLmsWorkshopStore }    from '../../../stores/lmsWorkshopStore.js'
import { useLmsCourseStore }      from '../../../stores/lmsCourseStore.js'
import { useAuditorStore }        from '../../../stores/auditorStore.js'
import { useTrainingSessionStore } from '../../../stores/trainingSessionStore.js'
import { useToast }               from '../../../shared/composables/useToast.js'
import BaseButton  from '../../../shared/components/BaseButton.vue'
import StatusBadge from '../../../shared/components/StatusBadge.vue'

const enrollmentStore = useLmsEnrollmentStore()
const testStore       = useLmsTestStore()
const workshopStore   = useLmsWorkshopStore()
const courseStore     = useLmsCourseStore()
const auditorStore    = useAuditorStore()
const sessionStore    = useTrainingSessionStore()
const toast           = useToast()

onMounted(() => {
  enrollmentStore.load(); testStore.load(); workshopStore.load()
  courseStore.load(); auditorStore.load(); sessionStore.load()
})

// ── Filters ───────────────────────────────────────────────
const filterSessionId = ref('')

function auditorName(id) { return auditorStore.auditors.find(a => a.id === id)?.name ?? id }
function sessionName(id) { return sessionStore.sessions.find(s => s.id === id)?.trainingName ?? id }
function courseTitle(id) { return courseStore.courses.find(c => c.id === id)?.title ?? '—' }

const lmsSessions = computed(() =>
  sessionStore.sessions.filter(s => s.deliveryMode === 'LMS' || s.deliveryMode === 'Blended')
)

// ── Summary cards ─────────────────────────────────────────
const totalEnrollments = computed(() => enrollmentStore.enrollments.length)
const completedCount   = computed(() => enrollmentStore.enrollments.filter(e => e.status === 'Selesai').length)
const passedTests      = computed(() => enrollmentStore.attempts.filter(a => a.passed).length)
const avgScore         = computed(() => {
  const scored = enrollmentStore.attempts.filter(a => a.finalScore != null)
  if (!scored.length) return 0
  return Math.round(scored.reduce((s, a) => s + a.finalScore, 0) / scored.length)
})

// ── Per-auditor report ────────────────────────────────────
const auditorRows = computed(() => {
  const sessionFilter = filterSessionId.value
  const enrollments = sessionFilter
    ? enrollmentStore.enrollments.filter(e => e.sessionId === sessionFilter)
    : enrollmentStore.enrollments

  return enrollments.map(en => {
    const attempts = enrollmentStore.attempts.filter(a =>
      a.auditorId === en.auditorId && a.sessionId === en.sessionId && a.finalScore != null
    )
    const bestTest = attempts.length
      ? Math.max(...attempts.map(a => a.finalScore))
      : null

    const submissions = workshopStore.submissions.filter(s =>
      s.auditorId === en.auditorId && s.sessionId === en.sessionId && s.score != null
    )
    const workshopScore = submissions.length
      ? Math.max(...submissions.map(s => s.score))
      : null

    return {
      auditorName: auditorName(en.auditorId),
      sessionName: sessionName(en.sessionId),
      courseTitle: courseTitle(en.courseId),
      progress: en.progress,
      bestTest,
      workshopScore,
      status: en.status,
    }
  })
})

// ── Per-session report ────────────────────────────────────
const sessionRows = computed(() => {
  const sessions = filterSessionId.value
    ? lmsSessions.value.filter(s => s.id === filterSessionId.value)
    : lmsSessions.value

  return sessions.map(s => {
    const enrollments = enrollmentStore.enrollments.filter(e => e.sessionId === s.id)
    const attempts = enrollmentStore.attempts.filter(a => a.sessionId === s.id && a.finalScore != null)
    const passed = enrollmentStore.attempts.filter(a => a.sessionId === s.id && a.passed).length
    const subs = workshopStore.submissions.filter(sub => sub.sessionId === s.id && sub.score != null)

    return {
      sessionName: s.trainingName,
      date: s.date,
      courseTitle: courseTitle(s.lmsCourseId),
      participants: enrollments.length,
      avgTest: attempts.length ? Math.round(attempts.reduce((sum, a) => sum + a.finalScore, 0) / attempts.length) : null,
      passedCount: passed,
      avgWorkshop: subs.length ? Math.round(subs.reduce((sum, sub) => sum + sub.score, 0) / subs.length) : null,
    }
  })
})

// ── Excel export ──────────────────────────────────────────
function exportExcel() {
  const wb = XLSX.utils.book_new()

  // Per-auditor sheet
  const auditorData = auditorRows.value.map(r => ({
    'Auditor': r.auditorName,
    'Sesi': r.sessionName,
    'Kursus': r.courseTitle,
    'Progres (%)': r.progress,
    'Nilai Tes Terbaik': r.bestTest ?? '—',
    'Nilai Workshop': r.workshopScore ?? '—',
    'Status': r.status,
  }))
  const ws1 = XLSX.utils.json_to_sheet(auditorData)
  XLSX.utils.book_append_sheet(wb, ws1, 'Per Auditor')

  // Per-session sheet
  const sessionData = sessionRows.value.map(r => ({
    'Sesi': r.sessionName,
    'Tanggal': r.date,
    'Kursus': r.courseTitle,
    'Peserta': r.participants,
    'Rata-rata Tes': r.avgTest ?? '—',
    'Lulus': r.passedCount,
    'Rata-rata Workshop': r.avgWorkshop ?? '—',
  }))
  const ws2 = XLSX.utils.json_to_sheet(sessionData)
  XLSX.utils.book_append_sheet(wb, ws2, 'Per Sesi')

  XLSX.writeFile(wb, `laporan_lms_${new Date().toISOString().slice(0, 10)}.xlsx`)
  toast.success('Laporan diunduh.')
}
</script>

<template>
  <div class="p-6 fade-in">
    <!-- Header -->
    <div class="flex items-start justify-between mb-5">
      <div>
        <h1 class="text-2xl font-bold text-slate-800">Laporan LMS</h1>
        <p class="text-slate-500 text-sm mt-1">Progres, hasil tes, nilai workshop, dan status kelulusan peserta</p>
      </div>
      <div class="flex gap-2">
        <select v-model="filterSessionId" class="ct-input w-auto text-xs">
          <option value="">Semua Sesi</option>
          <option v-for="s in lmsSessions" :key="s.id" :value="s.id">{{ s.trainingName }}</option>
        </select>
        <BaseButton variant="secondary" @click="exportExcel"><Download class="w-4 h-4" /> Export Excel</BaseButton>
      </div>
    </div>

    <!-- Summary cards -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
      <div class="ct-card p-4">
        <div class="flex items-center gap-2 mb-1">
          <Users class="w-4 h-4 text-blue-400" />
          <span class="text-xs text-slate-500">Total Pendaftar</span>
        </div>
        <p class="text-2xl font-bold text-slate-800">{{ totalEnrollments }}</p>
      </div>
      <div class="ct-card p-4">
        <div class="flex items-center gap-2 mb-1">
          <ClipboardCheck class="w-4 h-4 text-emerald-400" />
          <span class="text-xs text-slate-500">Selesai</span>
        </div>
        <p class="text-2xl font-bold text-slate-800">{{ completedCount }}</p>
      </div>
      <div class="ct-card p-4">
        <div class="flex items-center gap-2 mb-1">
          <Award class="w-4 h-4 text-amber-400" />
          <span class="text-xs text-slate-500">Lulus Tes</span>
        </div>
        <p class="text-2xl font-bold text-slate-800">{{ passedTests }}</p>
      </div>
      <div class="ct-card p-4">
        <div class="flex items-center gap-2 mb-1">
          <TrendingUp class="w-4 h-4 text-blue-400" />
          <span class="text-xs text-slate-500">Rata-rata Nilai</span>
        </div>
        <p class="text-2xl font-bold text-slate-800">{{ avgScore }}</p>
      </div>
    </div>

    <!-- Per-session table -->
    <div class="mb-5">
      <h3 class="text-sm font-bold text-slate-700 mb-2">Ringkasan per Sesi</h3>
      <div class="ct-card overflow-hidden">
        <div v-if="sessionRows.length" class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-200">
                <th class="px-4 py-3 text-left text-slate-600 font-semibold">Sesi</th>
                <th class="px-4 py-3 text-left text-slate-600 font-semibold">Tanggal</th>
                <th class="px-4 py-3 text-left text-slate-600 font-semibold">Kursus</th>
                <th class="px-4 py-3 text-center text-slate-600 font-semibold">Peserta</th>
                <th class="px-4 py-3 text-center text-slate-600 font-semibold">Rata-rata Tes</th>
                <th class="px-4 py-3 text-center text-slate-600 font-semibold">Lulus</th>
                <th class="px-4 py-3 text-center text-slate-600 font-semibold">Rata-rata Workshop</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="r in sessionRows" :key="r.sessionName" class="hover:bg-blue-50/20">
                <td class="px-4 py-3 font-medium text-slate-700">{{ r.sessionName }}</td>
                <td class="px-4 py-3 text-slate-600">{{ r.date }}</td>
                <td class="px-4 py-3 text-slate-600 text-xs">{{ r.courseTitle }}</td>
                <td class="px-4 py-3 text-center text-slate-600">{{ r.participants }}</td>
                <td class="px-4 py-3 text-center">
                  <span v-if="r.avgTest != null" class="font-bold" :class="r.avgTest >= 80 ? 'text-emerald-600' : 'text-amber-600'">{{ r.avgTest }}</span>
                  <span v-else class="text-slate-300">—</span>
                </td>
                <td class="px-4 py-3 text-center text-slate-600">{{ r.passedCount }}</td>
                <td class="px-4 py-3 text-center">
                  <span v-if="r.avgWorkshop != null" class="font-medium text-slate-700">{{ r.avgWorkshop }}</span>
                  <span v-else class="text-slate-300">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="py-12 text-center">
          <div class="ct-empty-icon-wrap"><BarChart3 class="w-9 h-9 text-slate-300" /></div>
          <p class="text-slate-400 italic text-sm">Belum ada sesi LMS.</p>
        </div>
      </div>
    </div>

    <!-- Per-auditor table -->
    <div>
      <h3 class="text-sm font-bold text-slate-700 mb-2">Detail per Auditor</h3>
      <div class="ct-card overflow-hidden">
        <div v-if="auditorRows.length" class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-200">
                <th class="px-4 py-3 text-left text-slate-600 font-semibold">Auditor</th>
                <th class="px-4 py-3 text-left text-slate-600 font-semibold">Sesi</th>
                <th class="px-4 py-3 text-left text-slate-600 font-semibold">Kursus</th>
                <th class="px-4 py-3 text-center text-slate-600 font-semibold">Progres</th>
                <th class="px-4 py-3 text-center text-slate-600 font-semibold">Tes Terbaik</th>
                <th class="px-4 py-3 text-center text-slate-600 font-semibold">Workshop</th>
                <th class="px-4 py-3 text-center text-slate-600 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="(r, i) in auditorRows" :key="i" class="hover:bg-blue-50/20">
                <td class="px-4 py-3 font-medium text-slate-700">{{ r.auditorName }}</td>
                <td class="px-4 py-3 text-slate-600 text-xs max-w-[140px] truncate">{{ r.sessionName }}</td>
                <td class="px-4 py-3 text-slate-600 text-xs">{{ r.courseTitle }}</td>
                <td class="px-4 py-3 text-center">
                  <div class="flex items-center gap-1.5 justify-center">
                    <div class="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div class="h-full bg-blue-500 rounded-full" :style="`width: ${r.progress}%`" />
                    </div>
                    <span class="text-xs text-slate-500">{{ r.progress }}%</span>
                  </div>
                </td>
                <td class="px-4 py-3 text-center">
                  <span v-if="r.bestTest != null" class="font-bold" :class="r.bestTest >= 80 ? 'text-emerald-600' : 'text-amber-600'">{{ r.bestTest }}</span>
                  <span v-else class="text-slate-300">—</span>
                </td>
                <td class="px-4 py-3 text-center">
                  <span v-if="r.workshopScore != null" class="font-medium text-slate-700">{{ r.workshopScore }}</span>
                  <span v-else class="text-slate-300">—</span>
                </td>
                <td class="px-4 py-3 text-center"><StatusBadge :status="r.status" /></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="py-12 text-center">
          <div class="ct-empty-icon-wrap"><Users class="w-9 h-9 text-slate-300" /></div>
          <p class="text-slate-400 italic text-sm">Belum ada pendaftar LMS.</p>
        </div>
      </div>
    </div>

  </div>
</template>
