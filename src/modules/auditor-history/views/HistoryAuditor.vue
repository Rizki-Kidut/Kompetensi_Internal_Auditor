<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Archive, Eye, Search, UserX, CalendarClock } from '@lucide/vue'
import { useAuditorHistoryStore } from '../../../stores/auditorHistoryStore.js'
import { useAuditorStore }        from '../../../stores/auditorStore.js'
import BaseTable   from '../../../shared/components/BaseTable.vue'
import StatusBadge from '../../../shared/components/StatusBadge.vue'

const router       = useRouter()
const historyStore = useAuditorHistoryStore()
const auditorStore = useAuditorStore()

onMounted(() => { historyStore.load(); auditorStore.load() })

const search = ref('')

const reasonFilter = ref('Semua')
const REASON_OPTS = ['Semua', 'Resign', 'Mutasi', 'Tidak Aktif', 'Lainnya']

const filteredEntries = computed(() => {
  const q = search.value.trim().toLowerCase()
  return historyStore.entries.filter(e => {
    if (reasonFilter.value !== 'Semua' && e.reason !== reasonFilter.value) return false
    if (!q) return true
    return [e.nik, e.name, e.section].some(v => String(v ?? '').toLowerCase().includes(q))
  })
})

const stats = computed(() => {
  const total = historyStore.entries.length
  const resign = historyStore.entries.filter(e => e.reason === 'Resign').length
  const mutasi = historyStore.entries.filter(e => e.reason === 'Mutasi').length
  const nonaktif = historyStore.entries.filter(e => e.reason === 'Tidak Aktif').length
  return { total, resign, mutasi, nonaktif }
})

const SCOPE_LABELS = {
  qms: 'QMS',
  manufakturShift: 'Mfg Shift',
  produk: 'Produk',
  supplier: 'Supplier',
}
const SCOPE_BADGE = {
  qms: 'ct-badge-blue',
  manufakturShift: 'ct-badge-amber',
  produk: 'ct-badge-emerald',
  supplier: 'ct-badge-red',
}

const columns = [
  { key: 'nik',             label: 'NIK' },
  { key: 'name',            label: 'Nama' },
  { key: 'section',         label: 'Seksi' },
  { key: 'lastScope',       label: 'Scope Terakhir' },
  { key: 'reason',          label: 'Alasan' },
  { key: 'deactivatedDate', label: 'Tgl Non-Aktif', align: 'center' },
  { key: '_actions',        label: 'Aksi',          align: 'center' },
]

function viewCard(entry) {
  router.push({ path: '/kartu-riwayat', query: { nik: entry.nik } })
}
</script>

<template>
  <div class="p-6 fade-in">
    <!-- Header -->
    <div class="flex items-start justify-between mb-5">
      <div>
        <h1 class="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Archive class="w-6 h-6 text-slate-500" />
          History Auditor
        </h1>
        <p class="text-slate-500 text-sm mt-1">Arsip auditor non-aktif & resign (read-only)</p>
      </div>
    </div>

    <!-- Summary stats -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
      <div class="ct-card p-4 flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center">
          <Archive class="w-5 h-5" />
        </div>
        <div>
          <p class="text-2xl font-bold text-slate-800 leading-none">{{ stats.total }}</p>
          <p class="text-xs text-slate-500 mt-1">Total Arsip</p>
        </div>
      </div>
      <div class="ct-card p-4 flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center">
          <UserX class="w-5 h-5" />
        </div>
        <div>
          <p class="text-2xl font-bold text-slate-800 leading-none">{{ stats.resign }}</p>
          <p class="text-xs text-slate-500 mt-1">Resign</p>
        </div>
      </div>
      <div class="ct-card p-4 flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
          <CalendarClock class="w-5 h-5" />
        </div>
        <div>
          <p class="text-2xl font-bold text-slate-800 leading-none">{{ stats.mutasi }}</p>
          <p class="text-xs text-slate-500 mt-1">Mutasi</p>
        </div>
      </div>
      <div class="ct-card p-4 flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
          <UserX class="w-5 h-5" />
        </div>
        <div>
          <p class="text-2xl font-bold text-slate-800 leading-none">{{ stats.nonaktif }}</p>
          <p class="text-xs text-slate-500 mt-1">Tidak Aktif</p>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="ct-card p-4 mb-4 flex flex-wrap items-center gap-3">
      <div class="relative flex-1 min-w-[200px] max-w-xs">
        <Search class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          v-model="search"
          type="text"
          placeholder="Cari NIK / nama / seksi..."
          class="ct-input pl-9"
        />
      </div>
      <div class="flex gap-1">
        <button
          v-for="opt in REASON_OPTS"
          :key="opt"
          :class="reasonFilter === opt ? 'btn-primary' : 'btn-secondary'"
          class="text-xs px-3 py-1.5"
          @click="reasonFilter = opt"
        >{{ opt }}</button>
      </div>
    </div>

    <!-- Table -->
    <div class="ct-card overflow-hidden">
      <BaseTable :columns="columns" :rows="filteredEntries" empty-message="Belum ada auditor non-aktif dalam arsip">
        <template #lastScope="{ row }">
          <div class="flex flex-wrap gap-1">
            <span
              v-for="(val, key) in row.lastScope"
              :key="key"
              v-show="val"
              :class="['ct-badge', SCOPE_BADGE[key] ?? 'ct-badge-slate']"
            >{{ SCOPE_LABELS[key] ?? key }}</span>
            <span
              v-if="!row.lastScope || !Object.values(row.lastScope).some(Boolean)"
              class="text-slate-400 text-xs italic"
            >Tidak ada</span>
          </div>
        </template>

        <template #reason="{ row }">
          <StatusBadge :status="row.reason" variant="slate">{{ row.reason }}</StatusBadge>
        </template>

        <template #deactivatedDate="{ row }">
          <span class="text-slate-500 text-xs">{{ row.deactivatedDate }}</span>
        </template>

        <template #_actions="{ row }">
          <button
            class="ct-action-btn-view"
            title="Lihat Kartu Riwayat"
            @click="viewCard(row)"
          >
            <Eye class="w-3.5 h-3.5" />
          </button>
        </template>
      </BaseTable>
    </div>

    <p class="mt-3 text-xs text-slate-400 italic">
      Data arsip bersifat read-only. Kartu Riwayat auditor non-aktif tetap dapat dilihat dari menu Kartu Riwayat Auditor.
    </p>
  </div>
</template>
