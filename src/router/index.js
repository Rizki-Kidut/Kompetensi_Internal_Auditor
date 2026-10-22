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
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

export default router
