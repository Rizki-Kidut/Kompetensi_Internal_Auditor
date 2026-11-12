<script setup>
import { ref, computed, onMounted } from 'vue'
import { Pencil } from '@lucide/vue'
import { useCompetencyStore } from '../../../stores/competencyStore.js'
import { useAuditorStore } from '../../../stores/auditorStore.js'
import { useToast } from '../../../shared/composables/useToast.js'
import BaseButton from '../../../shared/components/BaseButton.vue'

const competency = useCompetencyStore()
const auditorStore = useAuditorStore()
const toast = useToast()
onMounted(() => { competency.load(); auditorStore.load() })

const groupedItems = computed(() =>
  competency.categories.map(category => ({
    category,
    items: competency.items.filter(i => i.category === category),
  }))
)

const newItem = ref({ category: '', itemName: '' })
const adding = ref(false)

async function addItem() {
  const category = newItem.value.category.trim()
  const itemName = newItem.value.itemName.trim()
  if (!category || !itemName) {
    toast.error('Kategori dan nama kompetensi wajib diisi.')
    return
  }
  if (competency.items.some(i => i.category === category && i.itemName.toLowerCase() === itemName.toLowerCase())) {
    toast.error('Kompetensi tersebut sudah ada di kategori ini.')
    return
  }
  adding.value = true
  const ok = await competency.addItem({ id: `ci-${Date.now()}`, category, itemName })
  if (!ok) {
    adding.value = false
    toast.error('Kompetensi gagal ditambahkan. Coba lagi.')
    return
  }
  for (const auditor of auditorStore.auditors) await competency.addAuditorCells(auditor.id)
  newItem.value = { category: '', itemName: '' }
  adding.value = false
  toast.success(`Kompetensi "${itemName}" berhasil ditambahkan.`)
}

const editingId = ref('')
const editName = ref('')
const savingEdit = ref(false)

function startEdit(item) {
  editingId.value = item.id
  editName.value = item.itemName
}

function cancelEdit() {
  editingId.value = ''
}

async function saveEdit(item) {
  const name = editName.value.trim()
  if (!name) {
    toast.error('Nama kompetensi wajib diisi.')
    return
  }
  if (name === item.itemName) {
    cancelEdit()
    return
  }
  savingEdit.value = true
  const ok = await competency.updateItemName(item.id, name)
  savingEdit.value = false
  if (!ok) {
    toast.error('Nama kompetensi gagal diubah. Coba lagi.')
    return
  }
  cancelEdit()
  toast.success('Nama kompetensi berhasil diubah.')
}
</script>

<template>
  <div class="p-6 fade-in">
    <div class="mb-5">
      <h1 class="text-2xl font-bold text-slate-800">Daftar Kompetensi</h1>
      <p class="text-slate-500 text-sm mt-1">Daftar kompetensi per kelompok. Matriks Kompetensi mengambil data dari daftar ini.</p>
    </div>

    <div class="grid gap-5 max-w-3xl">
      <section class="ct-card p-5">
        <h2 class="font-semibold text-slate-700 mb-4">Tambah Kompetensi Baru</h2>
        <form class="grid grid-cols-1 md:grid-cols-[1fr_2fr_auto] gap-3 items-end" @submit.prevent="addItem">
          <div>
            <label class="text-xs text-slate-500">Kelompok</label>
            <input v-model="newItem.category" list="competency-categories" class="ct-input" placeholder="Contoh: Audit Produk" />
            <datalist id="competency-categories">
              <option v-for="c in competency.categories" :key="c" :value="c" />
            </datalist>
          </div>
          <div>
            <label class="text-xs text-slate-500">Nama Kompetensi</label>
            <input v-model="newItem.itemName" class="ct-input" placeholder="Contoh: Audit Proses Produksi" />
          </div>
          <BaseButton variant="primary" type="submit" :loading="adding">Tambah Kompetensi</BaseButton>
        </form>
      </section>

      <section class="ct-card overflow-hidden">
        <div class="px-5 py-4 border-b border-slate-100">
          <h2 class="font-semibold text-slate-700">Daftar Kompetensi ({{ competency.items.length }})</h2>
        </div>

        <p v-if="competency.loading" class="px-5 py-6 text-sm text-slate-400">Memuat daftar kompetensi...</p>
        <p v-else-if="!competency.items.length" class="px-5 py-6 text-sm text-slate-400 italic">Belum ada kompetensi. Tambahkan di atas.</p>

        <div v-else>
          <div v-for="group in groupedItems" :key="group.category" class="border-b border-slate-100 last:border-b-0">
            <div class="px-5 py-3 bg-slate-50 flex items-center justify-between">
              <span class="text-sm font-semibold text-slate-700">{{ group.category }}</span>
              <span class="text-xs text-slate-400">{{ group.items.length }} kompetensi</span>
            </div>

            <ul class="divide-y divide-slate-100">
              <li v-for="(item, index) in group.items" :key="item.id" class="flex items-center justify-between gap-3 px-5 py-3">
                <div class="flex items-center gap-3 min-w-0 flex-1">
                  <span class="text-xs text-slate-400 w-6 text-right">{{ index + 1 }}</span>
                  <form v-if="editingId === item.id" class="flex flex-1 gap-2" @submit.prevent="saveEdit(item)">
                    <input v-model="editName" class="ct-input flex-1" />
                    <BaseButton variant="secondary" :disabled="savingEdit" @click="cancelEdit">Batal</BaseButton>
                    <BaseButton variant="primary" type="submit" :loading="savingEdit">Simpan</BaseButton>
                  </form>
                  <span v-else class="text-sm text-slate-700 truncate">{{ item.itemName }}</span>
                </div>

                <button
                  v-if="editingId !== item.id"
                  class="ct-action-btn-view"
                  title="Ubah nama kompetensi"
                  @click="startEdit(item)"
                >
                  <Pencil class="w-3.5 h-3.5" />
                </button>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
