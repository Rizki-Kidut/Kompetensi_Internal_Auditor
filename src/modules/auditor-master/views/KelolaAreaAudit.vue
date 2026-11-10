<script setup>
import { ref, onMounted } from 'vue'
import { Trash2 } from '@lucide/vue'
import { useAuditAreaStore } from '../../../stores/auditAreaStore.js'
import { useToast } from '../../../shared/composables/useToast.js'
import BaseButton from '../../../shared/components/BaseButton.vue'

const areaStore = useAuditAreaStore()
const toast = useToast()
onMounted(() => { areaStore.load() })

const newName = ref('')
const adding = ref(false)
const pendingDeleteId = ref('')
const deletingId = ref('')

async function addArea() {
  const name = newName.value.trim()
  if (!name) {
    toast.error('Nama area wajib diisi.')
    return
  }
  if (areaStore.areas.some(a => a.name.toLowerCase() === name.toLowerCase())) {
    toast.error('Area dengan nama tersebut sudah ada.')
    return
  }
  adding.value = true
  const ok = await areaStore.add(name)
  adding.value = false
  if (!ok) {
    toast.error('Area gagal ditambahkan. Coba lagi.')
    return
  }
  newName.value = ''
  toast.success(`Area "${name}" berhasil ditambahkan.`)
}

async function removeArea(area) {
  deletingId.value = area.id
  const ok = await areaStore.remove(area.id)
  deletingId.value = ''
  pendingDeleteId.value = ''
  if (!ok) {
    toast.error('Area gagal dihapus. Coba lagi.')
    return
  }
  toast.success(`Area "${area.name}" dihapus.`)
}
</script>

<template>
  <div class="p-6 fade-in">
    <div class="mb-5">
      <h1 class="text-2xl font-bold text-slate-800">Daftar Area Audit</h1>
      <p class="text-slate-500 text-sm mt-1">Daftar proses/area yang muncul sebagai kolom penugasan area audit auditor</p>
    </div>

    <div class="grid gap-5 max-w-3xl">
      <section class="ct-card p-5">
        <h2 class="font-semibold text-slate-700 mb-4">Tambah Area Baru</h2>
        <form class="flex flex-col sm:flex-row gap-3" @submit.prevent="addArea">
          <input v-model="newName" class="ct-input flex-1" placeholder="Contoh: Area Produksi C" />
          <BaseButton variant="primary" type="submit" :loading="adding">Tambah Area</BaseButton>
        </form>
      </section>

      <section class="ct-card overflow-hidden">
        <div class="px-5 py-4 border-b border-slate-100">
          <h2 class="font-semibold text-slate-700">Daftar Area ({{ areaStore.areas.length }})</h2>
        </div>

        <p v-if="areaStore.loading" class="px-5 py-6 text-sm text-slate-400">Memuat daftar area...</p>
        <p v-else-if="!areaStore.areas.length" class="px-5 py-6 text-sm text-slate-400 italic">Belum ada area. Tambahkan area di atas.</p>

        <ul v-else class="divide-y divide-slate-100">
          <li
            v-for="(area, index) in areaStore.areas"
            :key="area.id"
            class="flex items-center justify-between gap-3 px-5 py-3"
          >
            <div class="flex items-center gap-3 min-w-0">
              <span class="text-xs text-slate-400 w-6 text-right">{{ index + 1 }}</span>
              <span class="text-sm font-medium text-slate-700 truncate">{{ area.name }}</span>
            </div>

            <div v-if="pendingDeleteId === area.id" class="flex items-center gap-2 shrink-0">
              <span class="text-xs text-slate-500">Hapus area ini?</span>
              <button class="btn-secondary" :disabled="deletingId === area.id" @click="pendingDeleteId = ''">Batal</button>
              <button
                class="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                :disabled="deletingId === area.id"
                @click="removeArea(area)"
              >
                Ya, hapus
              </button>
            </div>
            <button
              v-else
              class="ct-action-btn-danger"
              title="Hapus area"
              @click="pendingDeleteId = area.id"
            >
              <Trash2 class="w-3.5 h-3.5" />
            </button>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>
