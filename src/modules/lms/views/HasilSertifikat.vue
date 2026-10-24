<script setup>
import { ref, computed, onMounted } from 'vue'
import {
  Award, Download, CheckCircle2, AlertTriangle, Clock, FilePen, Wrench,
} from '@lucide/vue'
import jsPDF from 'jspdf'
import { useLmsEnrollmentStore }  from '../../../stores/lmsEnrollmentStore.js'
import { useLmsTestStore }        from '../../../stores/lmsTestStore.js'
import { useLmsWorkshopStore }    from '../../../stores/lmsWorkshopStore.js'
import { useLmsCourseStore }      from '../../../stores/lmsCourseStore.js'
import { useCompetencyStore }     from '../../../stores/competencyStore.js'
import { useAuditorStore }        from '../../../stores/auditorStore.js'
import { useTrainingSessionStore } from '../../../stores/trainingSessionStore.js'
import { useLmsRole }             from '../../../shared/composables/useLmsRole.js'
import { useToast }               from '../../../shared/composables/useToast.js'
import BaseButton      from '../../../shared/components/BaseButton.vue'
import StatusBadge     from '../../../shared/components/StatusBadge.vue'
import CompetencySymbol from '../../../shared/components/CompetencySymbol.vue'

const enrollmentStore = useLmsEnrollmentStore()
const testStore       = useLmsTestStore()
const workshopStore   = useLmsWorkshopStore()
const courseStore     = useLmsCourseStore()
const competency      = useCompetencyStore()
const auditorStore    = useAuditorStore()
const sessionStore    = useTrainingSessionStore()
const { auditorId, isAuditor } = useLmsRole()
const toast = useToast()

const selectedAuditorId = ref('')
const activeAuditorId = computed(() => isAuditor.value && auditorId.value ? auditorId.value : selectedAuditorId.value)

onMounted(() => {
  enrollmentStore.load(); testStore.load(); workshopStore.load()
  courseStore.load(); competency.load(); auditorStore.load(); sessionStore.load()
})

function testTitle(id) { return testStore.tests.find(t => t.id === id)?.title ?? id }
function courseTitle(id) { return courseStore.courses.find(c => c.id === id)?.title ?? '—' }
function sessionName(id) { return sessionStore.sessions.find(s => s.id === id)?.trainingName ?? id }
function auditorName(id) { return auditorStore.auditors.find(a => a.id === id)?.name ?? id }
function itemName(id) { return competency.items.find(i => i.id === id)?.itemName ?? '—' }

// ── Test attempts ─────────────────────────────────────────
const myAttempts = computed(() =>
  activeAuditorId.value
    ? enrollmentStore.attempts.filter(a => a.auditorId === activeAuditorId.value).sort((a, b) => a.testId.localeCompare(b.testId) || a.attemptNo - b.attemptNo)
    : []
)

const attemptsByTest = computed(() => {
  const map = {}
  for (const a of myAttempts.value) {
    if (!map[a.testId]) map[a.testId] = []
    map[a.testId].push(a)
  }
  return map
})

// ── Workshop results ──────────────────────────────────────
const myWorkshopSubs = computed(() =>
  activeAuditorId.value
    ? workshopStore.submissionsByAuditor(activeAuditorId.value).filter(s => s.status === 'Dinilai')
    : []
)

// ── Overall pass/fail ─────────────────────────────────────
const myEnrollments = computed(() =>
  activeAuditorId.value ? enrollmentStore.enrollmentsByAuditor(activeAuditorId.value) : []
)

const courseResults = computed(() =>
  myEnrollments.value.map(en => {
    const course = courseStore.courses.find(c => c.id === en.courseId)
    const tests = testStore.testsByCourse(en.courseId)
    const testPassed = tests.length > 0 && tests.every(t => {
      const attempts = enrollmentStore.attempts.filter(a => a.testId === t.id && a.auditorId === activeAuditorId.value)
      return attempts.some(a => a.passed)
    })
    const workshops = workshopStore.tasks.filter(w => w.sessionId === en.sessionId)
    const workshopPassed = workshops.length > 0 && workshops.every(w => {
      const sub = workshopStore.submissions.find(s => s.taskId === w.id && s.auditorId === activeAuditorId.value)
      return sub?.status === 'Dinilai' && (sub.score ?? 0) >= (w.maxScore * 0.8)
    })
    const hasTests = tests.length > 0
    const hasWorkshops = workshops.length > 0
    const allPassed = (hasTests ? testPassed : true) && (hasWorkshops ? workshopPassed : true)
    return {
      courseId: en.courseId,
      courseTitle: course?.title ?? '—',
      competencyItemId: course?.competencyItemId ?? '',
      targetLevel: course?.targetLevel ?? '',
      testPassed: hasTests ? testPassed : null,
      workshopPassed: hasWorkshops ? workshopPassed : null,
      allPassed,
    }
  })
)

const currentAuditor = computed(() =>
  activeAuditorId.value ? auditorStore.auditors.find(a => a.id === activeAuditorId.value) : null
)

function getCompetencyLevel(itemId) {
  const cell = competency.getCell(activeAuditorId.value, itemId)
  return cell?.level ?? ''
}

// ── Certificate download ──────────────────────────────────
function downloadCertificate(cr) {
  if (!cr.allPassed) return
  const auditorNameVal = auditorName(activeAuditorId.value)
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  // Border
  doc.setDrawColor(30, 64, 175)
  doc.setLineWidth(2)
  doc.rect(10, 10, 277, 190)

  doc.setLineWidth(0.5)
  doc.setDrawColor(148, 163, 184)
  doc.rect(15, 15, 267, 180)

  // Title
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(28)
  doc.setTextColor(30, 64, 175)
  doc.text('SERTIFIKAT KOMPETENSI', 148.5, 45, { align: 'center' })

  doc.setFontSize(12)
  doc.setTextColor(100, 116, 139)
  doc.text('CertiTrack LMS — Internal Auditor Certification', 148.5, 55, { align: 'center' })

  // Recipient
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(71, 85, 105)
  doc.text('Diberikan kepada:', 148.5, 75, { align: 'center' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.setTextColor(15, 23, 42)
  doc.text(auditorNameVal, 148.5, 88, { align: 'center' })

  // Course
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(71, 85, 105)
  doc.text('atas penyelesaian dan kelulusan kursus:', 148.5, 100, { align: 'center' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(30, 64, 175)
  doc.text(cr.courseTitle, 148.5, 112, { align: 'center' })

  // Competency item
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(100, 116, 139)
  doc.text(`Item Kompetensi: ${itemName(cr.competencyItemId)}`, 148.5, 122, { align: 'center' })
  doc.text(`Level: ${cr.targetLevel}`, 148.5, 128, { align: 'center' })

  // Date
  doc.setFontSize(10)
  doc.text(`Tanggal: ${new Date().toLocaleDateString('id-ID')}`, 148.5, 145, { align: 'center' })

  // Signature line
  doc.setDrawColor(148, 163, 184)
  doc.setLineWidth(0.3)
  doc.line(80, 165, 120, 165)
  doc.line(180, 165, 220, 165)

  doc.setFontSize(9)
  doc.setTextColor(100, 116, 139)
  doc.text('Auditor', 100, 170, { align: 'center' })
  doc.text('CertiTrack LMS', 200, 170, { align: 'center' })

  doc.save(`sertifikat_${cr.courseTitle.replace(/\s+/g, '_')}.pdf`)
  toast.success('Sertifikat diunduh.')
}
</script>

<template>
  <div class="p-6 fade-in">
    <div class="flex items-start justify-between mb-5">
      <div>
        <h1 class="text-2xl font-bold text-slate-800">Hasil & Sertifikat</h1>
        <p class="text-slate-500 text-sm mt-1">Riwayat hasil tes, nilai workshop, dan sertifikat kelulusan</p>
      </div>
    </div>

    <div v-if="!isAuditor" class="ct-card p-3 mb-4 flex items-center gap-3">
      <label class="text-xs text-slate-500 shrink-0">Lihat sebagai auditor:</label>
      <select v-model="selectedAuditorId" class="ct-input text-xs">
        <option value="">-- Pilih --</option>
        <option v-for="en in [...new Set(enrollmentStore.enrollments.map(e => e.auditorId))]" :key="en" :value="en">{{ en }}</option>
      </select>
    </div>

    <div v-if="!activeAuditorId" class="ct-card py-16 text-center">
      <div class="ct-empty-icon-wrap"><Award class="w-9 h-9 text-slate-300" /></div>
      <p class="text-slate-400 italic text-sm">Pilih auditor untuk melihat hasil.</p>
    </div>

    <template v-else>
      <!-- Test results -->
      <div class="mb-6">
        <h3 class="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2"><FilePen class="w-4 h-4 text-blue-400" /> Riwayat Tes Tertulis</h3>
        <div class="ct-card overflow-hidden">
          <div v-if="myAttempts.length" class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="bg-slate-50 border-b border-slate-200">
                  <th class="px-4 py-3 text-left text-slate-600 font-semibold">Tes</th>
                  <th class="px-4 py-3 text-center text-slate-600 font-semibold">Percobaan</th>
                  <th class="px-4 py-3 text-center text-slate-600 font-semibold">Nilai</th>
                  <th class="px-4 py-3 text-center text-slate-600 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <template v-for="(attempts, tId) in attemptsByTest" :key="tId">
                  <tr v-for="a in attempts" :key="a.id" class="hover:bg-blue-50/20">
                    <td class="px-4 py-3 font-medium text-slate-700">{{ testTitle(a.testId) }}</td>
                    <td class="px-4 py-3 text-center text-slate-600">{{ a.attemptNo }}</td>
                    <td class="px-4 py-3 text-center">
                      <span v-if="a.finalScore != null" class="font-bold" :class="a.passed ? 'text-emerald-600' : 'text-amber-600'">{{ a.finalScore }}</span>
                      <span v-else class="text-slate-300">—</span>
                    </td>
                    <td class="px-4 py-3 text-center"><StatusBadge :status="a.status" /></td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
          <div v-else class="py-12 text-center">
            <p class="text-slate-400 italic text-sm">Belum ada percobaan tes.</p>
          </div>
        </div>
      </div>

      <!-- Workshop results -->
      <div class="mb-6">
        <h3 class="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2"><Wrench class="w-4 h-4 text-amber-400" /> Nilai Workshop</h3>
        <div class="ct-card overflow-hidden">
          <div v-if="myWorkshopSubs.length" class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="bg-slate-50 border-b border-slate-200">
                  <th class="px-4 py-3 text-left text-slate-600 font-semibold">Tugas</th>
                  <th class="px-4 py-3 text-center text-slate-600 font-semibold">Nilai</th>
                  <th class="px-4 py-3 text-left text-slate-600 font-semibold">Feedback</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr v-for="sub in myWorkshopSubs" :key="sub.id" class="hover:bg-blue-50/20">
                  <td class="px-4 py-3 font-medium text-slate-700">
                    {{ workshopStore.tasks.find(t => t.id === sub.taskId)?.title ?? sub.taskId }}
                  </td>
                  <td class="px-4 py-3 text-center">
                    <span class="font-bold text-slate-700">{{ sub.score }}</span>
                    <span class="text-slate-400 text-xs">/{{ workshopStore.tasks.find(t => t.id === sub.taskId)?.maxScore ?? 100 }}</span>
                  </td>
                  <td class="px-4 py-3 text-slate-600 text-xs max-w-xs truncate">{{ sub.feedback || '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="py-12 text-center">
            <p class="text-slate-400 italic text-sm">Belum ada nilai workshop.</p>
          </div>
        </div>
      </div>

      <!-- Certificate cards -->
      <div>
        <h3 class="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2"><Award class="w-4 h-4 text-amber-400" /> Status Kelulusan & Sertifikat</h3>
        <div v-if="courseResults.length" class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div v-for="cr in courseResults" :key="cr.courseId" class="ct-card p-5">
            <div class="flex items-start justify-between mb-3">
              <div class="flex-1 min-w-0">
                <h4 class="font-bold text-slate-800 text-sm">{{ cr.courseTitle }}</h4>
                <p class="text-xs text-slate-500 mt-0.5">{{ itemName(cr.competencyItemId) }}</p>
              </div>
              <CompetencySymbol :level="getCompetencyLevel(cr.competencyItemId)" size="md" />
            </div>

            <div class="grid grid-cols-2 gap-2 mb-4">
              <div class="ct-card p-2 text-center">
                <p class="text-xs text-slate-400">Tes</p>
                <div class="flex items-center justify-center gap-1 mt-1">
                  <CheckCircle2 v-if="cr.testPassed" class="w-4 h-4 text-emerald-500" />
                  <AlertTriangle v-else-if="cr.testPassed === false" class="w-4 h-4 text-amber-500" />
                  <Clock v-else class="w-4 h-4 text-slate-300" />
                  <span class="text-xs font-medium" :class="cr.testPassed ? 'text-emerald-600' : cr.testPassed === false ? 'text-amber-600' : 'text-slate-400'">
                    {{ cr.testPassed ? 'Lulus' : cr.testPassed === false ? 'Remedial' : 'N/A' }}
                  </span>
                </div>
              </div>
              <div class="ct-card p-2 text-center">
                <p class="text-xs text-slate-400">Workshop</p>
                <div class="flex items-center justify-center gap-1 mt-1">
                  <CheckCircle2 v-if="cr.workshopPassed" class="w-4 h-4 text-emerald-500" />
                  <AlertTriangle v-else-if="cr.workshopPassed === false" class="w-4 h-4 text-amber-500" />
                  <Clock v-else class="w-4 h-4 text-slate-300" />
                  <span class="text-xs font-medium" :class="cr.workshopPassed ? 'text-emerald-600' : cr.workshopPassed === false ? 'text-amber-600' : 'text-slate-400'">
                    {{ cr.workshopPassed ? 'Lulus' : cr.workshopPassed === false ? 'Remedial' : 'N/A' }}
                  </span>
                </div>
              </div>
            </div>

            <BaseButton
              v-if="cr.allPassed"
              variant="success" class="w-full"
              @click="downloadCertificate(cr)"
            >
              <Download class="w-4 h-4" /> Unduh Sertifikat
            </BaseButton>
            <div v-else class="ct-card p-2 bg-amber-50/40 border-amber-200 text-center">
              <p class="text-xs text-amber-600">Lengkapi semua tes & workshop untuk membuka sertifikat.</p>
            </div>
          </div>
        </div>
        <div v-else class="ct-card py-12 text-center">
          <div class="ct-empty-icon-wrap"><Award class="w-9 h-9 text-slate-300" /></div>
          <p class="text-slate-400 italic text-sm">Belum ada hasil kursus.</p>
        </div>
      </div>
    </template>
  </div>
</template>
