<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { GraduationCap, ArrowRight, Lock } from '@lucide/vue'
import { useLmsEnrollmentStore }  from '../../../stores/lmsEnrollmentStore.js'
import { useLmsCourseStore }      from '../../../stores/lmsCourseStore.js'
import { useCompetencyStore }     from '../../../stores/competencyStore.js'
import { useTrainingSessionStore } from '../../../stores/trainingSessionStore.js'
import { useLmsRole }             from '../../../shared/composables/useLmsRole.js'
import BaseButton    from '../../../shared/components/BaseButton.vue'
import StatusBadge   from '../../../shared/components/StatusBadge.vue'
import CompetencySymbol from '../../../shared/components/CompetencySymbol.vue'

const router = useRouter()
const enrollmentStore = useLmsEnrollmentStore()
const courseStore     = useLmsCourseStore()
const competency      = useCompetencyStore()
const sessionStore    = useTrainingSessionStore()
const { auditorId, isAuditor } = useLmsRole()

const selectedAuditorId = ref('')

onMounted(() => {
  enrollmentStore.load(); courseStore.load(); competency.load(); sessionStore.load()
})

const activeAuditorId = computed(() => isAuditor.value && auditorId.value ? auditorId.value : selectedAuditorId.value)

const myEnrollments = computed(() =>
  activeAuditorId.value ? enrollmentStore.enrollmentsByAuditor(activeAuditorId.value) : []
)

const courseCards = computed(() =>
  myEnrollments.value.map(en => {
    const course = courseStore.courses.find(c => c.id === en.courseId)
    const session = sessionStore.sessions.find(s => s.id === en.sessionId)
    const item = competency.items.find(i => i.id === course?.competencyItemId)
    const modCount = course ? courseStore.modulesByCourse(course.id).length : 0
    return { ...en, course, session, itemName: item?.itemName ?? '—', category: item?.category ?? '', modCount }
  })
)

function openCourse(courseId) {
  router.push(`/lms/kursus/${courseId}`)
}
</script>

<template>
  <div class="p-6 fade-in">
    <div class="flex items-start justify-between mb-5">
      <div>
        <h1 class="text-2xl font-bold text-slate-800">Kursus Saya</h1>
        <p class="text-slate-500 text-sm mt-1">Daftar kursus LMS yang tersedia untuk Anda</p>
      </div>
    </div>

    <!-- Auditor selector (only for Admin/Assessor preview) -->
    <div v-if="!isAuditor" class="ct-card p-3 mb-4 flex items-center gap-3">
      <label class="text-xs text-slate-500 shrink-0">Lihat sebagai auditor:</label>
      <select v-model="selectedAuditorId" class="ct-input text-xs">
        <option value="">-- Pilih --</option>
        <option v-for="en in enrollmentStore.enrollments.map(e => e.auditorId).filter((v, i, a) => a.indexOf(v) === i)" :key="en" :value="en">{{ en }}</option>
      </select>
    </div>

    <div v-if="!activeAuditorId" class="ct-card py-16 text-center">
      <div class="ct-empty-icon-wrap"><GraduationCap class="w-9 h-9 text-slate-300" /></div>
      <p class="text-slate-400 italic text-sm">Pilih auditor untuk melihat kursus.</p>
    </div>

    <div v-else-if="courseCards.length" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="card in courseCards"
        :key="card.id"
        class="ct-card p-5 cursor-pointer hover:shadow-md transition-all group"
        @click="openCourse(card.course?.id)"
      >
        <div class="flex items-start justify-between mb-3">
          <div class="flex-1 min-w-0">
            <h3 class="font-bold text-slate-800 text-sm truncate group-hover:text-blue-600 transition-colors">{{ card.course?.title ?? '—' }}</h3>
            <p class="text-xs text-slate-400 mt-0.5">{{ card.category }}</p>
          </div>
          <CompetencySymbol v-if="card.course?.targetLevel" :level="card.course.targetLevel" size="sm" />
        </div>

        <p class="text-xs text-slate-500 mb-3 line-clamp-2">{{ card.itemName }}</p>

        <!-- Progress bar -->
        <div class="mb-3">
          <div class="flex items-center justify-between mb-1">
            <span class="text-xs text-slate-400">Progres</span>
            <span class="text-xs font-bold text-slate-600">{{ card.progress }}%</span>
          </div>
          <div class="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-500"
              :class="card.progress === 100 ? 'bg-emerald-500' : 'bg-blue-500'"
              :style="`width: ${card.progress}%`"
            />
          </div>
          <p class="text-xs text-slate-400 mt-1">{{ card.modCount }} modul</p>
        </div>

        <div class="flex items-center justify-between pt-3 border-t border-slate-100">
          <div>
            <p class="text-xs text-slate-400">Sesi</p>
            <p class="text-xs font-medium text-slate-600 truncate max-w-[140px]">{{ card.session?.trainingName ?? '—' }}</p>
          </div>
          <div class="flex items-center gap-2">
            <StatusBadge :status="card.status" />
            <ArrowRight class="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
          </div>
        </div>
      </div>
    </div>

    <div v-else class="ct-card py-16 text-center">
      <div class="ct-empty-icon-wrap"><GraduationCap class="w-9 h-9 text-slate-300" /></div>
      <p class="text-slate-400 italic text-sm">Belum ada kursus terdaftar untuk Anda.</p>
    </div>
  </div>
</template>
