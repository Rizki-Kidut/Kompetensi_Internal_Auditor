<script setup>
import { CalendarDays } from '@lucide/vue'
</script>

<template>
  <div class="p-6 fade-in">
    <div class="flex items-start justify-between mb-5">
      <div>
        <h1 class="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <CalendarDays class="w-6 h-6 text-blue-500" />
          Jadwal Saya
        </h1>
        <p class="text-slate-500 text-sm mt-1">Jadwal sesi training dan tes LMS Anda</p>
      </div>
    </div>
    <div class="ct-card py-16 text-center">
      <div class="ct-empty-icon-wrap"><CalendarDays class="w-10 h-10 text-slate-300" /></div>
      <p class="text-slate-500 font-medium">Halaman ini akan menampilkan jadwal training & tes Anda</p>
      <p class="text-slate-400 text-sm mt-1">Fase berikutnya: kalender sesi, jendela tes, dan tenggat workshop</p>
    </div>
  </div>
</template>
