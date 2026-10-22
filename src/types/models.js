/**
 * @file types/models.js
 * JSDoc typedefs for all CertiTrack data entities.
 */

/**
 * @typedef {'Aktif'|'Tidak Aktif'|'Resign'} AuditorStatus
 *
 * @typedef {Object} ScopeAuditor
 * @property {boolean} qms
 * @property {boolean} manufakturShift
 * @property {boolean} produk
 * @property {boolean} supplier
 *
 * @typedef {Object} Auditor
 * @property {string} id
 * @property {string} nik
 * @property {string} name
 * @property {string} section
 * @property {string} position  - Staff | Group Leader | Section Manager | DDM/Dept Manager | Division Head
 * @property {AuditorStatus} status
 * @property {ScopeAuditor} scopeAuditor
 * @property {Object.<string, 'O'|'X'>} areaAuditPermission
 * @property {string} joinAsAuditorDate  - ISO date string
 */

/**
 * @typedef {'Auditor QMS'|'Audit Manufaktur dan Shift'|'Audit Produk'|'Audit Supplier'} CompetencyCategory
 *
 * @typedef {Object} CompetencyItem
 * @property {string} id
 * @property {CompetencyCategory} category
 * @property {string} itemName
 */

/**
 * @typedef {'★'|'◆'|'●'|'△'|''} CompetencyLevel
 *
 * @typedef {Object} CompetencyCell
 * @property {string} auditorId
 * @property {string} itemId
 * @property {CompetencyLevel} level
 * @property {string} lastUpdated  - ISO date string
 * @property {string} updatedBy
 * @property {string|null} sourceEvaluationId
 */

/**
 * @typedef {'Matrix Kompetensi'|'Area Assignment'|'Daftar Auditor'} RevisionType
 *
 * @typedef {Object} RevisionLogEntry
 * @property {string} id
 * @property {string} date  - ISO date string
 * @property {RevisionType} type
 * @property {string} description
 * @property {string} revisionNumber
 */

/**
 * @typedef {'Tambah Auditor'|'Non-Aktif Auditor'} RequestType
 * @typedef {'Resign'|'Mutasi'|'Tidak Aktif'|'Penambahan Baru'|'Lainnya'} RequestReason
 * @typedef {'Pending'|'Approved'|'Declined'} ApprovalStatus
 *
 * @typedef {Object} ApprovalStep
 * @property {string} role
 * @property {string} name
 * @property {ApprovalStatus} status
 * @property {string|null} date
 * @property {string} note
 *
 * @typedef {Object} AuditorRequest
 * @property {string} id
 * @property {RequestType} requestType
 * @property {string} nik
 * @property {string} name
 * @property {string} section
 * @property {string} position  - Used to build approval chain
 * @property {ScopeAuditor|null} initialScope
 * @property {RequestReason} reason
 * @property {string} reasonDetail
 * @property {string} submittedBy
 * @property {string} submittedDate
 * @property {ApprovalStep[]} approvalChain
 * @property {ApprovalStatus} finalStatus
 */

/**
 * @typedef {Object} AuditorHistoryEntry
 * @property {string} id
 * @property {string} nik
 * @property {string} name
 * @property {string} section
 * @property {ScopeAuditor} lastScope
 * @property {CompetencyLevel} lastCompetencyLevel
 * @property {string} deactivatedDate
 * @property {string} reason
 * @property {string} sourceRequestId
 */

/**
 * @typedef {'Gap Kompetensi'|'Auditor Baru'|'Update Standard'|'Penyegaran'} TrainingPlanReason
 * @typedef {'Draft'|'Disetujui'|'Terjadwal'} TrainingPlanStatus
 * @typedef {'Tinggi'|'Sedang'|'Rendah'} TrainingPriority
 *
 * @typedef {Object} TrainingPlan
 * @property {string} id
 * @property {string} competencyItemId
 * @property {CompetencyLevel} targetLevel
 * @property {string[]} targetParticipants  - auditorId[]
 * @property {TrainingPlanReason} reason
 * @property {string} plannedDate
 * @property {TrainingPriority} priority
 * @property {TrainingPlanStatus} status
 */

/**
 * @typedef {'Terjadwal'|'Selesai'|'Batal'} TrainingSessionStatus
 *
 * @typedef {Object} TrainingSession
 * @property {string} id
 * @property {string} planId
 * @property {string} trainingName
 * @property {string} date
 * @property {string} organizer
 * @property {string} trainer
 * @property {string[]} participants  - auditorId[]
 * @property {string} materials
 * @property {TrainingSessionStatus} status
 */

/**
 * @typedef {Object} ScoreUmum
 * @property {number} pemahamanIsi
 * @property {number} peningkatanSkill
 * @property {number} peningkatanKinerja
 * @property {number} implementasi
 * @property {number} improvement
 * @property {number} mengajarkanOrangLain
 *
 * @typedef {Object} ScoreKhusus
 * @property {string} label
 * @property {number} score
 *
 * @typedef {Object} SkillMapUpdate
 * @property {string} competencyItemId
 * @property {CompetencyLevel} target
 * @property {CompetencyLevel} before
 * @property {CompetencyLevel} after
 *
 * @typedef {'Draft'|'Menunggu Approval'|'Approved'} EvaluationStatus
 *
 * @typedef {Object} TrainingEvaluation
 * @property {string} id
 * @property {string} sessionId
 * @property {string} auditorId
 * @property {string} evaluationDate
 * @property {ScoreUmum} scoresUmum
 * @property {ScoreKhusus[]} scoresKhusus
 * @property {number} totalNilaiA
 * @property {number} rataRataNilaiA
 * @property {number|null} hasilTesTertulis
 * @property {SkillMapUpdate|null} skillMapUpdate
 * @property {string} kesimpulan
 * @property {ApprovalStep[]} approvalChain
 * @property {EvaluationStatus} finalStatus
 */

export {}
