<script setup>
import { Hammer } from '@lucide/vue'
</script>

<template>
  <div class="p-6 fade-in">
    <div class="flex items-start justify-between mb-5">
      <div>
        <h1 class="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Hammer class="w-6 h-6 text-amber-500" />
          Workshop (Admin)
        </h1>
        <p class="text-slate-500 text-sm mt-1">Kelola tugas workshop, rubrik penilaian, dan tenggat</p>
      </div>
    </div>
    <div class="ct-card py-16 text-center">
      <div class="ct-empty-icon-wrap"><Hammer class="w-10 h-10 text-slate-300" /></div>
      <p class="text-slate-500 font-medium">Halaman ini akan menampilkan pengelolaan workshop</p>
      <p class="text-slate-400 text-sm mt-1">Fase berikutnya: CRUD tugas, rubrik multi-kriteria, dan assignment ke sesi</p>
    </div>
  </div>
</template>
