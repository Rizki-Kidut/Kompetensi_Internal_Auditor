<script setup>
import { Wrench } from '@lucide/vue'
</script>

<template>
  <div class="p-6 fade-in">
    <div class="flex items-start justify-between mb-5">
      <div>
        <h1 class="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Wrench class="w-6 h-6 text-blue-500" />
          Workshop Saya
        </h1>
        <p class="text-slate-500 text-sm mt-1">Tugas workshop dan pengumpulan hasil kerja</p>
      </div>
    </div>
    <div class="ct-card py-16 text-center">
      <div class="ct-empty-icon-wrap"><Wrench class="w-10 h-10 text-slate-300" /></div>
      <p class="text-slate-500 font-medium">Halaman ini akan menampilkan tugas workshop Anda</p>
      <p class="text-slate-400 text-sm mt-1">Fase berikutnya: submit tugas, lihat rubrik, dan terima feedback</p>
    </div>
  </div>
</template>
