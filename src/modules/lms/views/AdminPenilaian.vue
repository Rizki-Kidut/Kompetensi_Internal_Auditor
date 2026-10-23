<script setup>
import { ClipboardCheck } from '@lucide/vue'
</script>

<template>
  <div class="p-6 fade-in">
    <div class="flex items-start justify-between mb-5">
      <div>
        <h1 class="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <ClipboardCheck class="w-6 h-6 text-amber-500" />
          Penilaian
        </h1>
        <p class="text-slate-500 text-sm mt-1">Penilaian manual soal Esai/Kasus dan tugas workshop</p>
      </div>
    </div>
    <div class="ct-card py-16 text-center">
      <div class="ct-empty-icon-wrap"><ClipboardCheck class="w-10 h-10 text-slate-300" /></div>
      <p class="text-slate-500 font-medium">Halaman ini akan menampilkan antrean penilaian</p>
      <p class="text-slate-400 text-sm mt-1">Fase berikutnya: nilai soal Esai/Kasus, nilai workshop dengan rubrik</p>
    </div>
  </div>
</template>
