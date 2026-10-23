<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import {
  LayoutDashboard,
  Users,
  UserPlus,
  UserMinus,
  Grid3X3,
  BookOpen,
  PlayCircle,
  ClipboardCheck,
  History,
  BarChart3,
  ShieldCheck,
  Archive,
  GraduationCap,
  CalendarDays,
  FilePen,
  Wrench,
  Award,
  FileQuestion,
  ClipboardPenLine,
  Hammer,
  UserCog,
} from '@lucide/vue'
import { useLmsRole } from '../composables/useLmsRole.js'
import { useAuditorStore } from '../../stores/auditorStore.js'

const route = useRoute()
const { role, auditorId, isAdminOrAssessor, isAuditor, roles } = useLmsRole()
const auditorStore = useAuditorStore()

onMounted(() => auditorStore.load())

const activeAuditors = computed(() => auditorStore.auditors.filter(a => a.status === 'Aktif'))

const navGroups = computed(() => {
  const groups = [
    {
      label: 'Utama',
      items: [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      ],
    },
    {
      label: 'Manajemen Auditor',
      items: [
        { name: 'Daftar Auditor', path: '/auditor', icon: Users },
        { name: 'Pengajuan Auditor Baru', path: '/auditor/tambah', icon: UserPlus },
        { name: 'Pengajuan Non-Aktif', path: '/auditor/nonaktif', icon: UserMinus },
      ],
    },
    {
      label: 'Kompetensi',
      items: [
        { name: 'Matrix Kompetensi', path: '/kompetensi', icon: Grid3X3 },
      ],
    },
    {
      label: 'Training',
      items: [
        { name: 'Perencanaan Training', path: '/training/rencana', icon: BookOpen },
        { name: 'Pelaksanaan Training', path: '/training/pelaksanaan', icon: PlayCircle },
        { name: 'Evaluasi Training', path: '/training/evaluasi', icon: ClipboardCheck },
      ],
    },
    {
      label: 'Belajar (LMS)',
      items: [
        { name: 'Kursus Saya', path: '/lms/kursus', icon: GraduationCap },
        { name: 'Jadwal Saya', path: '/lms/jadwal', icon: CalendarDays },
        { name: 'Tes Tertulis', path: '/lms/tes', icon: FilePen },
        { name: 'Workshop Saya', path: '/lms/workshop', icon: Wrench },
        { name: 'Hasil & Sertifikat', path: '/lms/hasil', icon: Award },
      ],
    },
    {
      label: 'Riwayat & Laporan',
      items: [
        { name: 'Kartu Riwayat Auditor', path: '/kartu-riwayat', icon: History },
        { name: 'Laporan & Export', path: '/laporan', icon: BarChart3 },
        { name: 'History Auditor', path: '/history', icon: Archive },
      ],
    },
    {
      label: 'Persetujuan',
      amber: true,
      items: [
        { name: 'Approval Center', path: '/approval', icon: ShieldCheck, amber: true },
      ],
    },
  ]

  if (isAdminOrAssessor.value) {
    groups.push({
      label: 'Admin LMS',
      amber: true,
      items: [
        { name: 'Kursus & Materi', path: '/lms/admin/kursus', icon: BookOpen, amber: true },
        { name: 'Bank Soal', path: '/lms/admin/soal', icon: FileQuestion, amber: true },
        { name: 'Tes Tertulis', path: '/lms/admin/tes', icon: ClipboardPenLine, amber: true },
        { name: 'Workshop', path: '/lms/admin/workshop', icon: Hammer, amber: true },
        { name: 'Penilaian', path: '/lms/admin/penilaian', icon: ClipboardCheck, amber: true },
        { name: 'Laporan LMS', path: '/lms/admin/laporan', icon: BarChart3, amber: true },
      ],
    })
  }

  return groups
})

function isActive(path) {
  return route.path === path || route.path.startsWith(path + '/')
}
</script>

<template>
  <div class="flex min-h-screen bg-slate-50">
    <!-- Sidebar -->
    <aside class="w-64 bg-blue-800 text-white flex flex-col shrink-0 fixed inset-y-0 left-0 z-30 overflow-y-auto">
      <!-- Logo / Header -->
      <div class="h-16 flex items-center px-6 bg-blue-900 border-b border-blue-700/50 shrink-0">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
            <span class="text-white font-black text-base leading-none">C</span>
          </div>
          <div>
            <div class="text-white font-bold text-base leading-tight">CertiTrack</div>
            <div class="text-blue-300 leading-none" style="font-size:10px">Kompetensi Auditor</div>
          </div>
        </div>
      </div>

      <!-- Nav -->
      <nav class="flex-1 px-3 py-3">
        <template v-for="group in navGroups" :key="group.label">
          <div class="sidebar-group-label">{{ group.label }}</div>
          <RouterLink
            v-for="item in group.items"
            :key="item.path"
            :to="item.path"
            custom
            v-slot="{ navigate }"
          >
            <button
              :class="[
                'w-full flex items-center gap-2.5 text-left transition-colors duration-150 rounded-lg',
                item.amber
                  ? (isActive(item.path) ? 'sidebar-nav-amber-active' : 'sidebar-nav-amber-inactive')
                  : (isActive(item.path) ? 'sidebar-nav-active' : 'sidebar-nav-inactive'),
              ]"
              @click="navigate"
            >
              <component :is="item.icon" class="w-4 h-4 shrink-0" />
              <span class="text-sm">{{ item.name }}</span>
            </button>
          </RouterLink>
        </template>
      </nav>

      <!-- Footer: Role switcher + version -->
      <div class="px-4 py-3 border-t border-blue-700/50 shrink-0 space-y-2">
        <!-- TODO: ganti dengan Supabase Auth -->
        <div class="flex items-center gap-1.5">
          <UserCog class="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span class="text-blue-400 text-xs font-bold">Peran:</span>
          <select
            v-model="role"
            class="flex-1 bg-blue-900 border border-blue-700 text-blue-100 rounded text-xs px-1.5 py-1 focus:ring-1 focus:ring-blue-400 focus:outline-none"
          >
            <option v-for="r in roles" :key="r" :value="r">{{ r }}</option>
          </select>
        </div>
        <!-- Auditor selector when role is Auditor -->
        <div v-if="isAuditor" class="flex items-center gap-1.5">
          <span class="text-blue-400 text-xs font-bold shrink-0">Sebagai:</span>
          <select
            v-model="auditorId"
            class="flex-1 bg-blue-900 border border-blue-700 text-blue-100 rounded text-xs px-1.5 py-1 focus:ring-1 focus:ring-blue-400 focus:outline-none"
          >
            <option value="">-- Pilih auditor --</option>
            <option v-for="a in activeAuditors" :key="a.id" :value="a.id">{{ a.name }} ({{ a.nik }})</option>
          </select>
        </div>
        <p class="text-blue-400 text-center" style="font-size:10px">CertiTrack v1.0 · ISO 9001 / IATF 16949</p>
      </div>
    </aside>

    <!-- Main content area -->
    <main class="flex-1 ml-64 min-h-screen overflow-x-hidden">
      <slot />
    </main>
  </div>
</template>
