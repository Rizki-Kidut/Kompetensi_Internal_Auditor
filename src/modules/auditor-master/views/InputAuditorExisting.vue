<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuditorStore } from '../../../stores/auditorStore.js'
import { useCompetencyStore } from '../../../stores/competencyStore.js'
import { useRevisionLogStore } from '../../../stores/revisionLogStore.js'
import { useToast } from '../../../shared/composables/useToast.js'
import { AUDIT_AREAS, AUDIT_POSITIONS, AUDIT_SCOPES } from '../../../shared/constants/auditAreas.js'
import BaseButton from '../../../shared/components/BaseButton.vue'

const auditorStore    = useAuditorStore()
const competencyStore = useCompetencyStore()
const revisionStore   = useRevisionLogStore()
const toast = useToast()
onMounted(() => { auditorStore.load(); competencyStore.load() })

const LEVELS = ['', '●', '◆', '★']
const LEVEL_LABELS = { '': 'Belum dinilai', '●': '● Cukup Kompeten', '◆': '◆ Kompeten', '★': '★ Sangat Kompeten' }

function emptyForm() {
  return {
    nik: '', name: '', section: '', position: '', status: 'Aktif', joinAsAuditorDate: '',
    scopeAuditor: { qms: false, manufakturShift: false, produk: false, supplier: false },
    areaAuditPermission: Object.fromEntries(AUDIT_AREAS.map(area => [area, 'X'])),
    levels: {},
  }
}

const form = ref(emptyForm())
const errors = ref({})
const saving = ref(false)

const groupedItems = computed(() => {
  const groups = {}
  for (const item of competencyStore.items) (groups[item.category] ??= []).push(item)
  return Object.entries(groups)
})

function toggleArea(area) {
  form.value.areaAuditPermission[area] = form.value.areaAuditPermission[area] === 'O' ? 'X' : 'O'
}

function validate() {
  const e = {}
  const f = form.value
  if (!f.nik.trim()) e.nik = 'NIK wajib diisi'
  else if (auditorStore.auditors.some(a => a.nik === f.nik.trim())) e.nik = 'NIK sudah terdaftar di sistem'
  if (!f.name.trim())    e.name     = 'Nama wajib diisi'
  if (!f.section.trim()) e.section  = 'Seksi wajib diisi'
  if (!f.position)       e.position = 'Jabatan wajib dipilih'
  return e
}

async function save() {
  errors.value = validate()
  if (Object.keys(errors.value).length) return

  saving.value = true
  const f = form.value
  const id = `aud-${Date.now()}`
  const name = f.name.trim()
  const nik = f.nik.trim()

  await auditorStore.add({
    id, nik, name,
    section: f.section.trim(),
    position: f.position,
    status: f.status,
    scopeAuditor: { ...f.scopeAuditor },
    areaAuditPermission: { ...f.areaAuditPermission },
    joinAsAuditorDate: f.joinAsAuditorDate,
  })
  if (!auditorStore.auditors.some(a => a.id === id)) {
    saving.value = false
    toast.error('Data auditor gagal disimpan. Coba lagi.')
    return
  }

  await competencyStore.addAuditorCells(id)
  for (const [itemId, level] of Object.entries(f.levels)) {
    if (level) await competencyStore.updateCell(id, itemId, level, 'Input Data Existing')
  }

  revisionStore.addEntry({
    id: `rl-${Date.now()}`,
    date: new Date().toISOString().slice(0, 10),
    type: 'Daftar Auditor',
    description: `Input data auditor existing (hardcopy): ${name} (${nik}), Seksi ${f.section.trim()}.`,
    revisionNumber: `Rev.${String(revisionStore.entries.length + 1).padStart(2, '0')}`,
  })

  toast.success(`Auditor "${name}" berhasil dimasukkan ke sistem.`)
  form.value = emptyForm()
  errors.value = {}
  saving.value = false
}
</script>

<template>
  <div class="p-6 fade-in">
    <div class="mb-5">
      <h1 class="text-2xl font-bold text-slate-800">Input Auditor Existing</h1>
      <p class="text-slate-500 text-sm mt-1">Pindahkan data auditor dari hardcopy langsung ke sistem tanpa alur pengajuan</p>
    </div>

    <div class="grid gap-5 max-w-4xl">
      <section class="ct-card p-5">
        <h2 class="font-semibold text-slate-700 mb-4">Data Auditor</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="ct-label">NIK <span class="text-red-500">*</span></label>
            <input v-model="form.nik" class="ct-input" />
            <p v-if="errors.nik" class="text-red-500 text-xs mt-1">{{ errors.nik }}</p>
          </div>
          <div>
            <label class="ct-label">Nama <span class="text-red-500">*</span></label>
            <input v-model="form.name" class="ct-input" />
            <p v-if="errors.name" class="text-red-500 text-xs mt-1">{{ errors.name }}</p>
          </div>
          <div>
            <label class="ct-label">Seksi <span class="text-red-500">*</span></label>
            <input v-model="form.section" class="ct-input" />
            <p v-if="errors.section" class="text-red-500 text-xs mt-1">{{ errors.section }}</p>
          </div>
          <div>
            <label class="ct-label">Jabatan <span class="text-red-500">*</span></label>
            <select v-model="form.position" class="ct-input">
              <option value="">-- Pilih jabatan --</option>
              <option v-for="p in AUDIT_POSITIONS" :key="p" :value="p">{{ p }}</option>
            </select>
            <p v-if="errors.position" class="text-red-500 text-xs mt-1">{{ errors.position }}</p>
          </div>
          <div>
            <label class="ct-label">Status</label>
            <select v-model="form.status" class="ct-input">
              <option value="Aktif">Aktif</option>
              <option value="Tidak Aktif">Tidak Aktif</option>
            </select>
          </div>
          <div>
            <label class="ct-label">Tanggal Bergabung sebagai Auditor</label>
            <input v-model="form.joinAsAuditorDate" type="date" class="ct-input" />
          </div>
        </div>
      </section>

      <section class="ct-card p-5">
        <h2 class="font-semibold text-slate-700 mb-4">Scope Audit</h2>
        <div class="flex flex-wrap gap-4">
          <label v-for="scope in AUDIT_SCOPES" :key="scope.key" class="flex items-center gap-2 text-sm text-slate-600">
            <input v-model="form.scopeAuditor[scope.key]" type="checkbox" class="w-4 h-4" />
            {{ scope.label }}
          </label>
        </div>
      </section>

      <section class="ct-card p-5">
        <h2 class="font-semibold text-slate-700 mb-1">Area yang Boleh Diaudit</h2>
        <p class="text-xs text-slate-500 mb-4">Klik area untuk mengubah O (boleh) atau X (tidak boleh)</p>
        <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
          <button
            v-for="area in AUDIT_AREAS"
            :key="area"
            type="button"
            class="rounded-xl border px-3 py-3 text-sm font-medium transition-colors"
            :class="form.areaAuditPermission[area] === 'O'
              ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
              : 'border-slate-200 bg-white text-slate-400'"
            @click="toggleArea(area)"
          >
            <span class="block font-black text-lg">{{ form.areaAuditPermission[area] }}</span>
            {{ area }}
          </button>
        </div>
      </section>

      <section class="ct-card p-5">
        <h2 class="font-semibold text-slate-700 mb-1">Kompetensi</h2>
        <p class="text-xs text-slate-500 mb-4">Kosongkan jika belum ada penilaian untuk item tersebut</p>
        <div v-for="[category, items] in groupedItems" :key="category" class="mb-5 last:mb-0">
          <p class="ct-label mb-2">{{ category }}</p>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div v-for="item in items" :key="item.id" class="flex items-center justify-between gap-3">
              <span class="text-sm text-slate-600">{{ item.itemName }}</span>
              <select v-model="form.levels[item.id]" class="ct-input w-44">
                <option v-for="level in LEVELS" :key="level" :value="level">{{ LEVEL_LABELS[level] }}</option>
              </select>
            </div>
          </div>
        </div>
        <p v-if="!groupedItems.length" class="text-sm text-slate-400 italic">Daftar item kompetensi belum tersedia</p>
      </section>

      <div class="flex justify-end gap-3">
        <BaseButton variant="secondary" :disabled="saving" @click="form = emptyForm(); errors = {}">Reset</BaseButton>
        <BaseButton variant="primary" :loading="saving" @click="save">Simpan Auditor</BaseButton>
      </div>
    </div>
  </div>
</template>
