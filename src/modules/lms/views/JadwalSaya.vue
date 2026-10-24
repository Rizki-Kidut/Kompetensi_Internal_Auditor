<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { CalendarDays, ArrowRight, Video, MapPin, Monitor } from '@lucide/vue'
import { useTrainingSessionStore } from '../../../stores/trainingSessionStore.js'
import { useLmsCourseStore }       from '../../../stores/lmsCourseStore.js'
import { useLmsRole }              from '../../../shared/composables/useLmsRole.js'
import BaseButton  from '../../../shared/components/BaseButton.vue'
import StatusBadge from '../../../shared/components/StatusBadge.vue'

const router = useRouter()
const sessionStore = useTrainingSessionStore()
const courseStore  = useLmsCourseStore()
const { auditorId, isAuditor } = useLmsRole()

const selectedAuditorId = ref('')

onMounted(() => { sessionStore.load(); courseStore.load() })

const activeAuditorId = computed(() => isAuditor.value && auditorId.value ? auditorId.value : selectedAuditorId.value)

const mySessions = computed(() => {
  if (!activeAuditorId.value) return []
  return sessionStore.sessions
    .filter(s => (s.participants ?? []).includes(activeAuditorId.value))
    .sort((a, b) => (a.date > b.date ? -1 : 1))
})

function deliveryIcon(mode) {
  return { 'Tatap Muka': MapPin, 'LMS': Monitor, 'Blended': Video }[mode] ?? MapPin
}

function openCourse(session) {
  if (session.lmsCourseId) router.push(`/lms/kursus/${session.lmsCourseId}`)
}
</script>

<template>
  <div class="p-6 fade-in">
    <div class="flex items-start justify-between mb-5">
      <div>
        <h1 class="text-2xl font-bold text-slate-800">Jadwal Saya</h1>
        <p class="text-slate-500 text-sm mt-1">Jadwal sesi training dan tes LMS Anda</p>
      </div>
    </div>

    <div v-if="!isAuditor" class="ct-card p-3 mb-4 flex items-center gap-3">
      <label class="text-xs text-slate-500 shrink-0">Lihat sebagai auditor:</label>
      <select v-model="selectedAuditorId" class="ct-input text-xs">
        <option value="">-- Pilih --</option>
        <option v-for="s in sessionStore.sessions.flatMap(s => s.participants ?? []).filter((v, i, a) => a.indexOf(v) === i)" :key="s" :value="s">{{ s }}</option>
      </select>
    </div>

    <div v-if="!activeAuditorId" class="ct-card py-16 text-center">
      <div class="ct-empty-icon-wrap"><CalendarDays class="w-9 h-9 text-slate-300" /></div>
      <p class="text-slate-400 italic text-sm">Pilih auditor untuk melihat jadwal.</p>
    </div>

    <div v-else-if="mySessions.length" class="ct-card overflow-hidden">
      <table class="w-full text-sm">
        <thead>
          <tr class="bg-slate-50 border-b border-slate-200">
            <th class="px-4 py-3 text-left text-slate-600 font-semibold">Tanggal</th>
            <th class="px-4 py-3 text-left text-slate-600 font-semibold">Nama Training</th>
            <th class="px-4 py-3 text-center text-slate-600 font-semibold">Metode</th>
            <th class="px-4 py-3 text-center text-slate-600 font-semibold">Status</th>
            <th class="px-4 py-3 text-center text-slate-600 font-semibold">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-for="s in mySessions" :key="s.id" class="hover:bg-blue-50/20">
            <td class="px-4 py-3 text-slate-600 font-medium whitespace-nowrap">{{ s.date }}</td>
            <td class="px-4 py-3 font-medium text-slate-700">{{ s.trainingName }}</td>
            <td class="px-4 py-3 text-center">
              <span class="inline-flex items-center gap-1 text-xs text-slate-600">
                <component :is="deliveryIcon(s.deliveryMode)" class="w-3.5 h-3.5 text-slate-400" />
                {{ s.deliveryMode }}
              </span>
            </td>
            <td class="px-4 py-3 text-center"><StatusBadge :status="s.status" /></td>
            <td class="px-4 py-3 text-center">
              <button
                v-if="s.lmsCourseId"
                class="text-xs text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
                @click="openCourse(s)"
              >
                Buka Kursus <ArrowRight class="w-3 h-3" />
              </button>
              <span v-else class="text-xs text-slate-300">—</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else class="ct-card py-16 text-center">
      <div class="ct-empty-icon-wrap"><CalendarDays class="w-9 h-9 text-slate-300" /></div>
      <p class="text-slate-400 italic text-sm">Belum ada jadwal training untuk Anda.</p>
    </div>
  </div>
</template>
