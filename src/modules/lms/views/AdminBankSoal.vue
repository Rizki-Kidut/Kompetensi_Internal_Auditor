<script setup>
import { FileQuestion } from '@lucide/vue'
</script>

<template>
  <div class="p-6 fade-in">
    <div class="flex items-start justify-between mb-5">
      <div>
        <h1 class="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <FileQuestion class="w-6 h-6 text-amber-500" />
          Bank Soal
        </h1>
        <p class="text-slate-500 text-sm mt-1">Kelola bank soal: PG, Benar/Salah, Isian, Esai, Kasus</p>
      </div>
    </div>
    <div class="ct-card py-16 text-center">
      <div class="ct-empty-icon-wrap"><FileQuestion class="w-10 h-10 text-slate-300" /></div>
      <p class="text-slate-500 font-medium">Halaman ini akan menampilkan bank soal LMS</p>
      <p class="text-slate-400 text-sm mt-1">Fase berikutnya: CRUD soal + kunci jawaban, kategorisasi per kursus</p>
    </div>
  </div>
</template>
