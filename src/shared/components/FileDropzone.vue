<script setup>
import { ref } from 'vue'
import { Upload, FileCheck2, X } from '@lucide/vue'

const props = defineProps({
  accept: { type: String, default: '' },
  fileName: { type: String, default: '' },
  loading: { type: Boolean, default: false },
  hint: { type: String, default: '' },
})
const emit = defineEmits(['select', 'clear'])

const input = ref(null)
const dragging = ref(false)

function onPick(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (file) emit('select', file)
}

function onDrop(e) {
  dragging.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) emit('select', file)
}
</script>

<template>
  <div
    class="relative rounded-xl border-2 border-dashed px-4 py-6 text-center transition-all cursor-pointer"
    :class="dragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/40'"
    @click="input?.click()"
    @dragover.prevent="dragging = true"
    @dragleave.prevent="dragging = false"
    @drop.prevent="onDrop"
  >
    <input ref="input" type="file" class="hidden" :accept="accept" @change="onPick" />

    <div v-if="loading" class="flex flex-col items-center gap-2">
      <span class="text-sm font-medium text-blue-600">Mengunggah file...</span>
    </div>

    <div v-else-if="fileName" class="flex items-center justify-center gap-2">
      <FileCheck2 class="w-5 h-5 text-emerald-500 shrink-0" />
      <span class="text-sm font-medium text-slate-700 truncate max-w-[280px]">{{ fileName }}</span>
      <button
        type="button"
        class="ml-1 text-slate-400 hover:text-red-500"
        title="Hapus file"
        @click.stop="emit('clear')"
      >
        <X class="w-4 h-4" />
      </button>
    </div>

    <div v-else class="flex flex-col items-center gap-2">
      <Upload class="w-6 h-6 text-slate-400" />
      <p class="text-sm text-slate-600">
        <span class="font-semibold text-blue-600">Klik untuk memilih</span> atau seret file ke sini
      </p>
      <p v-if="hint" class="text-xs text-slate-400">{{ hint }}</p>
    </div>
  </div>
</template>
