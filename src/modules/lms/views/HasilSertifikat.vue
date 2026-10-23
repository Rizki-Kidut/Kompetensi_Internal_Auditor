<script setup>
import { Award } from '@lucide/vue'
</script>

<template>
  <div class="p-6 fade-in">
    <div class="flex items-start justify-between mb-5">
      <div>
        <h1 class="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Award class="w-6 h-6 text-blue-500" />
          Hasil & Sertifikat
        </h1>
        <p class="text-slate-500 text-sm mt-1">Riwayat hasil tes, nilai workshop, dan sertifikat</p>
      </div>
    </div>
    <div class="ct-card py-16 text-center">
      <div class="ct-empty-icon-wrap"><Award class="w-10 h-10 text-slate-300" /></div>
      <p class="text-slate-500 font-medium">Halaman ini akan menampilkan hasil & sertifikat Anda</p>
      <p class="text-slate-400 text-sm mt-1">Fase berikutnya: riwayat nilai, status kelulusan, dan cetak sertifikat</p>
    </div>
  </div>
</template>
