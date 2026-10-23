<script setup>
import { ClipboardPenLine } from '@lucide/vue'
</script>

<template>
  <div class="p-6 fade-in">
    <div class="flex items-start justify-between mb-5">
      <div>
        <h1 class="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <ClipboardPenLine class="w-6 h-6 text-amber-500" />
          Tes Tertulis (Admin)
        </h1>
        <p class="text-slate-500 text-sm mt-1">Konfigurasi tes: durasi, nilai lulus, percobaan, jendela waktu</p>
      </div>
    </div>
    <div class="ct-card py-16 text-center">
      <div class="ct-empty-icon-wrap"><ClipboardPenLine class="w-10 h-10 text-slate-300" /></div>
      <p class="text-slate-500 font-medium">Halaman ini akan menampilkan konfigurasi tes LMS</p>
      <p class="text-slate-400 text-sm mt-1">Fase berikutnya: CRUD tes, pilih soal, atur shuffle & jendela waktu</p>
    </div>
  </div>
</template>
