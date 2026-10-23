import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  { path: '/', redirect: '/dashboard' },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('../modules/dashboard/views/DashboardKompetensi.vue'),
  },
  // Auditor Master
  {
    path: '/auditor',
    name: 'DaftarAuditor',
    component: () => import('../modules/auditor-master/views/DaftarAuditor.vue'),
  },
  // Auditor Request
  {
    path: '/auditor/tambah',
    name: 'PengajuanAuditorBaru',
    component: () => import('../modules/auditor-request/views/PengajuanAuditorBaru.vue'),
  },
  {
    path: '/auditor/nonaktif',
    name: 'PengajuanNonAktif',
    component: () => import('../modules/auditor-request/views/PengajuanNonAktifAuditor.vue'),
  },
  // Competency Matrix
  {
    path: '/kompetensi',
    name: 'MatrixKompetensi',
    component: () => import('../modules/competency-matrix/views/MatrixKompetensi.vue'),
  },
  // Training Plan
  {
    path: '/training/rencana',
    name: 'PerencanaanTraining',
    component: () => import('../modules/training-plan/views/PerencanaanTraining.vue'),
  },
  // Training Session
  {
    path: '/training/pelaksanaan',
    name: 'PelaksanaanTraining',
    component: () => import('../modules/training-session/views/PelaksanaanTraining.vue'),
  },
  // Evaluation
  {
    path: '/training/evaluasi',
    name: 'EvaluasiTraining',
    component: () => import('../modules/evaluation/views/EvaluasiTraining.vue'),
  },
  {
    path: '/training/evaluasi/:sessionId/:auditorId',
    name: 'EvaluasiTrainingForm',
    component: () => import('../modules/evaluation/views/EvaluasiTraining.vue'),
  },
  // Qualification Card
  {
    path: '/kartu-riwayat',
    name: 'KartuRiwayat',
    component: () => import('../modules/qualification-card/views/KartuRiwayatAuditor.vue'),
  },
  // Report
  {
    path: '/laporan',
    name: 'Report',
    component: () => import('../modules/report/views/Report.vue'),
  },
  // Approval Center
  {
    path: '/approval',
    name: 'ApprovalCenter',
    component: () => import('../modules/approval/views/ApprovalCenter.vue'),
  },
  // Auditor History
  {
    path: '/history',
    name: 'HistoryAuditor',
    component: () => import('../modules/auditor-history/views/HistoryAuditor.vue'),
  },
  // ── LMS: Auditor-facing ──
  {
    path: '/lms/kursus',
    name: 'LmsKursusSaya',
    component: () => import('../modules/lms/views/KursusSaya.vue'),
  },
  {
    path: '/lms/jadwal',
    name: 'LmsJadwalSaya',
    component: () => import('../modules/lms/views/JadwalSaya.vue'),
  },
  {
    path: '/lms/tes',
    name: 'LmsTesTertulis',
    component: () => import('../modules/lms/views/TesTertulis.vue'),
  },
  {
    path: '/lms/workshop',
    name: 'LmsWorkshopSaya',
    component: () => import('../modules/lms/views/WorkshopSaya.vue'),
  },
  {
    path: '/lms/hasil',
    name: 'LmsHasilSertifikat',
    component: () => import('../modules/lms/views/HasilSertifikat.vue'),
  },
  // ── LMS: Admin ──
  {
    path: '/lms/admin/kursus',
    name: 'LmsAdminKursusMateri',
    component: () => import('../modules/lms/views/AdminKursusMateri.vue'),
  },
  {
    path: '/lms/admin/soal',
    name: 'LmsAdminBankSoal',
    component: () => import('../modules/lms/views/AdminBankSoal.vue'),
  },
  {
    path: '/lms/admin/tes',
    name: 'LmsAdminTesTertulis',
    component: () => import('../modules/lms/views/AdminTesTertulis.vue'),
  },
  {
    path: '/lms/admin/workshop',
    name: 'LmsAdminWorkshop',
    component: () => import('../modules/lms/views/AdminWorkshop.vue'),
  },
  {
    path: '/lms/admin/penilaian',
    name: 'LmsAdminPenilaian',
    component: () => import('../modules/lms/views/AdminPenilaian.vue'),
  },
  {
    path: '/lms/admin/laporan',
    name: 'LmsAdminLaporan',
    component: () => import('../modules/lms/views/AdminLaporan.vue'),
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

export default router
