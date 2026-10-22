<script setup>
import { ref, computed, onMounted } from 'vue'
import { Eye } from '@lucide/vue'
import { useAuditorStore } from '../../../stores/auditorStore.js'
import { useCompetencyStore } from '../../../stores/competencyStore.js'
import BaseTable from '../../../shared/components/BaseTable.vue'
import StatusBadge from '../../../shared/components/StatusBadge.vue'
import AuditorFormModal from '../components/AuditorFormModal.vue'

const auditorStore    = useAuditorStore()
const competencyStore = useCompetencyStore()
onMounted(() => { auditorStore.load(); competencyStore.load() })

const search    = ref('')
const filter    = ref('Aktif')
const detailOpen  = ref(false)
const detailAuditor = ref(null)

const AREAS = ['Area Produksi A', 'Area Produksi B', 'Gudang RM', 'Gudang FG', 'Maintenance']
const SCOPE_LABELS = { qms: 'QMS', manufakturShift: 'Mfg Shift', produk: 'Produk', supplier: 'Supplier' }
const SCOPE_COLOR  = { qms: 'ct-badge-blue', manufakturShift: 'ct-badge-amber', produk: 'ct-badge-emerald', supplier: 'ct-badge-red' }

const filtered = computed(() => auditorStore.auditors.filter(a => {
  const matchStatus = filter.value === 'Semua' || a.status === filter.value
  const q = search.value.toLowerCase()
  return matchStatus && (!q || a.name.toLowerCase().includes(q) || a.nik.includes(q) || a.section.toLowerCase().includes(q))
}))

const columns = [
  { key: 'nik',      label: 'NIK',      width: '80px' },
  { key: 'name',     label: 'Nama',     width: '180px' },
  { key: 'section',  label: 'Seksi',    width: '150px' },
  { key: 'position', label: 'Jabatan',  width: '140px' },
  { key: 'scope',    label: 'Scope Audit', width: '220px' },
  { key: 'status',   label: 'Status',   width: '90px', align: 'center' },
  { key: 'joinAsAuditorDate', label: 'Bergabung', width: '100px' },
  { key: 'actions',  label: '',         width: '50px', align: 'center' },
]

function buildCompetencySummary(auditorId) {
  const CATEGORIES = ['Auditor QMS', 'Audit Manufaktur dan Shift', 'Audit Produk', 'Audit Supplier']
  return CATEGORIES.map(cat => {
    const catItems = competencyStore.items.filter(i => i.category === cat)
    const cells = catItems.map(item => {
      const cell = competencyStore.getCell(auditorId, item.id)
      return { itemId: item.id, itemName: item.itemName, level: cell?.level ?? '' }
    })
    return { category: cat, cells }
  }).filter(c => c.cells.length)
}

function openDetail(auditor) {
  detailAuditor.value = auditor
  detailOpen.value = true
}

const activeCount   = computed(() => auditorStore.auditors.filter(a => a.status === 'Aktif').length)
const inactiveCount = computed(() => auditorStore.auditors.filter(a => a.status !== 'Aktif').length)
</script>

<template>
  <div class="p-6 fade-in">
    <!-- Header -->
    <div class="mb-5">
      <h1 class="text-2xl font-bold text-slate-800">Daftar Internal Auditor</h1>
      <p class="text-slate-500 text-sm mt-1">Master data auditor & penugasan area audit · Perubahan scope/area melalui Approval Center</p>
    </div>

    <!-- Quick stats -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
      <div class="ct-card p-3 flex items-center gap-3">
        <div class="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
          <span class="text-emerald-600 font-bold text-sm">{{ activeCount }}</span>
        </div>
        <p class="text-xs text-slate-600 font-medium">Auditor Aktif</p>
      </div>
      <div class="ct-card p-3 flex items-center gap-3">
        <div class="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
          <span class="text-slate-500 font-bold text-sm">{{ inactiveCount }}</span>
        </div>
        <p class="text-xs text-slate-600 font-medium">Tidak Aktif / Resign</p>
      </div>
    </div>

    <!-- Filters -->
    <div class="ct-card p-4 mb-4 flex flex-wrap items-center gap-3">
      <input v-model="search" class="ct-input max-w-xs" placeholder="Cari NIK, nama, atau seksi..." />
      <div class="flex gap-2 ml-auto">
        <button
          v-for="s in ['Aktif', 'Tidak Aktif', 'Semua']"
          :key="s"
          :class="filter === s ? 'btn-primary' : 'btn-secondary'"
          @click="filter = s"
        >
          {{ s }}
        </button>
      </div>
    </div>

    <!-- Main table -->
    <div class="ct-card overflow-hidden mb-5">
      <BaseTable :columns="columns" :rows="filtered" empty-message="Tidak ada auditor ditemukan">
        <template #scope="{ row }">
          <div class="flex flex-wrap gap-1">
            <template v-for="key in Object.keys(row.scopeAuditor)" :key="key">
              <span v-if="row.scopeAuditor[key]" :class="['ct-badge', SCOPE_COLOR[key]]">
                {{ SCOPE_LABELS[key] }}
              </span>
            </template>
            <span v-if="!Object.values(row.scopeAuditor).some(Boolean)" class="text-slate-300 italic text-xs">—</span>
          </div>
        </template>
        <template #status="{ row }">
          <StatusBadge :status="row.status" />
        </template>
        <template #joinAsAuditorDate="{ row }">
          <span class="text-slate-500">{{ row.joinAsAuditorDate }}</span>
        </template>
        <template #actions="{ row }">
          <button
            class="ct-action-btn-view"
            title="Lihat detail"
            @click="openDetail(row)"
          >
            <Eye class="w-3.5 h-3.5" />
          </button>
        </template>
      </BaseTable>
    </div>

    <!-- Area Assignment grid -->
    <div class="ct-card p-5">
      <div class="flex items-center justify-between mb-4">
        <p class="text-sm font-semibold text-slate-700">Penugasan Area Audit</p>
        <span class="ct-badge ct-badge-slate">O = Diizinkan &nbsp;·&nbsp; X = Tidak Diizinkan</span>
      </div>
      <div class="overflow-x-auto">
        <table class="text-sm w-full border-collapse">
          <thead>
            <tr class="bg-slate-50 border-b border-slate-200">
              <th class="px-3 py-2.5 text-left text-slate-600 font-semibold sticky left-0 bg-slate-50 min-w-[140px]">Nama</th>
              <th class="px-3 py-2.5 text-left text-slate-500 font-medium min-w-[120px]">Seksi</th>
              <th
                v-for="area in AREAS"
                :key="area"
                class="px-3 py-2.5 text-center text-slate-600 font-semibold whitespace-nowrap"
              >
                {{ area }}
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr
              v-for="a in filtered"
              :key="a.id"
              class="hover:bg-blue-50/40 cursor-pointer transition-colors"
              @click="openDetail(a)"
            >
              <td class="px-3 py-2.5 font-medium text-slate-700 sticky left-0 bg-white">{{ a.name }}</td>
              <td class="px-3 py-2.5 text-slate-500">{{ a.section }}</td>
              <td v-for="area in AREAS" :key="area" class="px-3 py-2.5 text-center">
                <span
                  :class="a.areaAuditPermission?.[area] === 'O'
                    ? 'text-emerald-600 font-black text-base'
                    : 'text-red-300 font-bold text-sm'"
                >
                  {{ a.areaAuditPermission?.[area] ?? 'X' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Detail modal -->
    <AuditorFormModal
      v-model="detailOpen"
      :auditor="detailAuditor"
      :areas="AREAS"
      :competency-summary="detailAuditor ? buildCompetencySummary(detailAuditor.id) : []"
    />
  </div>
</template>
