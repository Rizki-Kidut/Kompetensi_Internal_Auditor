<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeft, Lock, CheckCircle2, Circle, FileText, Link as LinkIcon,
  Video, FileType, ClipboardCheck, Save,
} from '@lucide/vue'
import { useLmsCourseStore }      from '../../../stores/lmsCourseStore.js'
import { useLmsEnrollmentStore }  from '../../../stores/lmsEnrollmentStore.js'
import { useLmsTestStore }        from '../../../stores/lmsTestStore.js'
import { useLmsRole }             from '../../../shared/composables/useLmsRole.js'
import { useToast }               from '../../../shared/composables/useToast.js'
import BaseButton    from '../../../shared/components/BaseButton.vue'

const route = useRouter()
const router = useRouter()
const courseStore     = useLmsCourseStore()
const enrollmentStore = useLmsEnrollmentStore()
const testStore       = useLmsTestStore()
const { auditorId, isAuditor } = useLmsRole()
const toast = useToast()

const courseId = ref('')
const selectedAuditorId = ref('')
const activeModuleId = ref(null)
const activeMaterialIdx = ref(0)

onMounted(() => {
  courseId.value = route.currentRoute.value.params.id
  courseStore.load(); enrollmentStore.load(); testStore.load()
})

const activeAuditorId = computed(() => isAuditor.value && auditorId.value ? auditorId.value : selectedAuditorId.value)

const course = computed(() => courseStore.courses.find(c => c.id === courseId.value))
const modules = computed(() => courseStore.modulesByCourse(courseId.value))
const tests = computed(() => testStore.testsByCourse(courseId.value))

const enrollment = computed(() =>
  activeAuditorId.value
    ? enrollmentStore.enrollments.find(e => e.courseId === courseId.value && e.auditorId === activeAuditorId.value)
    : null
)

const completedModules = computed(() => enrollment.value?.completedModules ?? [])

const modulesWithStatus = computed(() =>
  modules.value.map((m, idx) => {
    const isComplete = completedModules.value.includes(m.id)
    const prevModule = idx > 0 ? modules.value[idx - 1] : null
    const prevComplete = !prevModule || completedModules.value.includes(prevModule.id) || !m.prerequisiteModuleId
    const prereqMet = !m.prerequisiteModuleId || completedModules.value.includes(m.prerequisiteModuleId)
    const isLocked = !isComplete && !prereqMet
    return { ...m, isComplete, isLocked, canAccess: !isLocked }
  })
)

const activeModule = computed(() => modulesWithStatus.value.find(m => m.id === activeModuleId.value))
const activeMaterials = computed(() =>
  activeModuleId.value ? courseStore.materialsByModule(activeModuleId.value) : []
)
const activeMaterial = computed(() => activeMaterials.value[activeMaterialIdx.value] ?? null)

function selectModule(m) {
  if (m.isLocked) { toast.error('Selesaikan modul prasyarat terlebih dahulu.'); return }
  activeModuleId.value = m.id
  activeMaterialIdx.value = 0
}

const materialIcon = (type) => ({
  PDF: FileText, PPT: FileType, Video, Link: LinkIcon, Teks: FileText,
}[type] ?? FileText)

async function markModuleComplete() {
  if (!enrollment.value || !activeModuleId.value) return
  const completed = [...new Set([...completedModules.value, activeModuleId.value])]
  const totalMods = modules.value.length
  const progress = Math.round((completed.length / totalMods) * 100)
  await enrollmentStore.updateEnrollment({ ...enrollment.value, completedModules: completed, progress })
  toast.success('Modul ditandai selesai.')
}

const allModulesComplete = computed(() =>
  modules.value.length > 0 && modules.value.every(m => completedModules.value.includes(m.id))
)

function goToTest() {
  if (!tests.value.length) return
  router.push(`/lms/tes/${tests.value[0].id}`)
}

watch(modules, (mods) => {
  if (mods.length && !activeModuleId.value) {
    const first = modulesWithStatus.value.find(m => m.canAccess)
    if (first) {
      activeModuleId.value = first.id
      activeMaterialIdx.value = 0
    }
  }
}, { immediate: true })
</script>

<template>
  <div class="p-6 fade-in">
    <button class="btn-secondary text-xs flex items-center gap-1 mb-4" @click="router.push('/lms/kursus')">
      <ArrowLeft class="w-3 h-3" /> Kembali
    </button>

    <div v-if="!course" class="ct-card py-16 text-center">
      <p class="text-slate-400 text-sm">Kursus tidak ditemukan.</p>
    </div>

    <template v-else>
      <div class="mb-4">
        <h1 class="text-2xl font-bold text-slate-800">{{ course.title }}</h1>
        <p class="text-slate-500 text-sm mt-1">{{ course.description }}</p>
      </div>

      <!-- Auditor selector for admin preview -->
      <div v-if="!isAuditor" class="ct-card p-3 mb-4 flex items-center gap-3">
        <label class="text-xs text-slate-500 shrink-0">Lihat sebagai auditor:</label>
        <select v-model="selectedAuditorId" class="ct-input text-xs">
          <option value="">-- Pilih --</option>
          <option v-for="en in enrollmentStore.enrollments.filter(e => e.courseId === courseId)" :key="en.id" :value="en.auditorId">{{ en.auditorId }}</option>
        </select>
      </div>

      <div v-if="activeAuditorId && !enrollment" class="ct-card py-12 text-center">
        <p class="text-slate-400 text-sm">Anda belum terdaftar di kursus ini.</p>
      </div>

      <div v-else-if="activeAuditorId" class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <!-- Left: module list -->
        <div class="lg:col-span-1">
          <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Daftar Modul</h3>
          <div class="space-y-2">
            <button
              v-for="(m, idx) in modulesWithStatus"
              :key="m.id"
              :class="[
                activeModuleId === m.id ? 'border-blue-400 bg-blue-50/60' : 'border-slate-200 bg-white',
                m.isLocked ? 'opacity-60 cursor-not-allowed' : 'hover:border-blue-300 cursor-pointer',
              ]"
              class="ct-card p-3 w-full text-left transition-all"
              @click="selectModule(m)"
            >
              <div class="flex items-center gap-2">
                <Lock v-if="m.isLocked" class="w-4 h-4 text-slate-400 shrink-0" />
                <CheckCircle2 v-else-if="m.isComplete" class="w-4 h-4 text-emerald-500 shrink-0" />
                <Circle v-else class="w-4 h-4 text-slate-300 shrink-0" />
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-slate-700 truncate">{{ idx + 1 }}. {{ m.title }}</p>
                </div>
              </div>
            </button>
          </div>

          <!-- Test button -->
          <div v-if="allModulesComplete && tests.length" class="mt-4">
            <BaseButton variant="primary" class="w-full" @click="goToTest">
              <ClipboardCheck class="w-4 h-4" /> Mulai Tes
            </BaseButton>
          </div>
          <div v-else-if="!allModulesComplete" class="mt-4 ct-card p-3 bg-amber-50/40 border-amber-200">
            <p class="text-xs text-amber-600">Selesaikan semua modul untuk membuka tes.</p>
          </div>
        </div>

        <!-- Right: material player -->
        <div class="lg:col-span-2">
          <div v-if="activeModule" class="ct-card p-5">
            <h3 class="font-bold text-slate-800 mb-3">{{ activeModule.title }}</h3>

            <!-- Material tabs -->
            <div v-if="activeMaterials.length > 1" class="flex gap-1 mb-4 border-b border-slate-100 overflow-x-auto">
              <button
                v-for="(mat, mi) in activeMaterials"
                :key="mat.id"
                :class="activeMaterialIdx === mi ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'"
                class="flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap"
                @click="activeMaterialIdx = mi"
              >
                <component :is="materialIcon(mat.type)" class="w-3.5 h-3.5" /> {{ mat.title }}
              </button>
            </div>

            <!-- Material content -->
            <div v-if="activeMaterial" class="space-y-3">
              <div class="flex items-center gap-2 text-xs text-slate-400">
                <component :is="materialIcon(activeMaterial.type)" class="w-4 h-4" />
                <span>{{ activeMaterial.type }}</span>
                <span v-if="activeMaterial.docNumber">· Doc: {{ activeMaterial.docNumber }}</span>
                <span v-if="activeMaterial.revision">· Rev: {{ activeMaterial.revision }}</span>
              </div>

              <!-- PDF in iframe -->
              <div v-if="activeMaterial.type === 'PDF' && activeMaterial.url" class="border border-slate-200 rounded-xl overflow-hidden">
                <iframe :src="activeMaterial.url" class="w-full h-[500px]" frameborder="0" />
              </div>

              <!-- Video embed -->
              <div v-else-if="activeMaterial.type === 'Video' && activeMaterial.url" class="border border-slate-200 rounded-xl overflow-hidden">
                <video v-if="!activeMaterial.url.includes('youtube') && !activeMaterial.url.includes('vimeo')" :src="activeMaterial.url" controls class="w-full" />
                <iframe v-else :src="activeMaterial.url" class="w-full h-[400px]" frameborder="0" allowfullscreen />
              </div>

              <!-- Link -->
              <a
                v-else-if="activeMaterial.type === 'Link' && activeMaterial.url"
                :href="activeMaterial.url"
                target="_blank"
                class="ct-card p-4 flex items-center gap-3 hover:border-blue-300 transition-all"
              >
                <LinkIcon class="w-5 h-5 text-blue-500" />
                <span class="text-sm text-blue-600 hover:underline">{{ activeMaterial.url }}</span>
              </a>

              <!-- PPT -->
              <a
                v-else-if="activeMaterial.type === 'PPT' && activeMaterial.url"
                :href="activeMaterial.url"
                target="_blank"
                class="ct-card p-4 flex items-center gap-3 hover:border-blue-300 transition-all"
              >
                <FileType class="w-5 h-5 text-amber-500" />
                <span class="text-sm text-blue-600 hover:underline">Unduh / buka presentasi</span>
              </a>

              <!-- Teks -->
              <div v-else-if="activeMaterial.type === 'Teks'" class="prose prose-sm max-w-none">
                <p v-if="activeMaterial.url" class="text-sm text-slate-600">
                  <a :href="activeMaterial.url" target="_blank" class="text-blue-600 hover:underline">{{ activeMaterial.url }}</a>
                </p>
                <div class="text-sm text-slate-700 whitespace-pre-wrap">{{ activeMaterial.content }}</div>
              </div>

              <div v-else class="ct-card p-8 text-center text-slate-400 text-sm">
                Materi tidak tersedia.
              </div>
            </div>

            <div v-else class="py-12 text-center">
              <p class="text-slate-400 text-sm italic">Belum ada materi di modul ini.</p>
            </div>

            <!-- Mark complete -->
            <div class="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
              <div class="flex items-center gap-2 text-sm">
                <CheckCircle2 v-if="activeModule.isComplete" class="w-4 h-4 text-emerald-500" />
                <span :class="activeModule.isComplete ? 'text-emerald-600' : 'text-slate-400'">
                  {{ activeModule.isComplete ? 'Modul selesai' : 'Belum selesai' }}
                </span>
              </div>
              <BaseButton
                v-if="!activeModule.isComplete"
                variant="success" size="sm"
                @click="markModuleComplete"
              >
                <Save class="w-3.5 h-3.5" /> Tandai Selesai
              </BaseButton>
            </div>
          </div>

          <div v-else class="ct-card py-16 text-center">
            <p class="text-slate-400 text-sm">Pilih modul di samping untuk mulai belajar.</p>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
