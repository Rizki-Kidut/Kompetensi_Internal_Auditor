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

/**
 * @typedef {'Tatap Muka'|'LMS'|'Blended'} DeliveryMode
 * @typedef {'Manual'|'LMS'} TestSource
 */

/**
 * @typedef {'Draft'|'Published'|'Arsip'} LmsCourseStatus
 *
 * @typedef {Object} LmsCourse
 * @property {string} id
 * @property {string} title
 * @property {string} description
 * @property {string|null} competencyItemId
 * @property {CompetencyLevel} targetLevel
 * @property {number} passGrade
 * @property {LmsCourseStatus} status
 */

/**
 * @typedef {Object} LmsModule
 * @property {string} id
 * @property {string} courseId
 * @property {string} title
 * @property {number} sortOrder
 * @property {string|null} prerequisiteModuleId
 */

/**
 * @typedef {'PDF'|'PPT'|'Video'|'Link'|'Teks'} LmsMaterialType
 *
 * @typedef {Object} LmsMaterial
 * @property {string} id
 * @property {string} moduleId
 * @property {string} title
 * @property {LmsMaterialType} type
 * @property {string} url
 * @property {string} content
 * @property {string} docNumber
 * @property {string} revision
 * @property {string} effectiveDate
 * @property {number} sortOrder
 */

/**
 * @typedef {'PG'|'BS'|'Isian'|'Esai'|'Kasus'} LmsQuestionType
 * @typedef {'Mudah'|'Sedang'|'Sulit'} LmsDifficulty
 *
 * @typedef {Object} LmsQuestion
 * @property {string} id
 * @property {string} courseId
 * @property {LmsQuestionType} type
 * @property {string} text
 * @property {Array} options
 * @property {string} clauseTag
 * @property {LmsDifficulty} difficulty
 * @property {number} points
 */

/**
 * @typedef {Object} LmsQuestionKey
 * @property {string} questionId
 * @property {Array} answer
 * @property {string} explanation
 */

/**
 * @typedef {'Draft'|'Published'} LmsTestStatus
 *
 * @typedef {Object} LmsTest
 * @property {string} id
 * @property {string} courseId
 * @property {string} title
 * @property {number} durationMinutes
 * @property {number} passGrade
 * @property {number} maxAttempts
 * @property {boolean} shuffleQuestions
 * @property {boolean} shuffleOptions
 * @property {number} openOffsetDays
 * @property {number} closeOffsetDays
 * @property {LmsTestStatus} status
 */

/**
 * @typedef {Object} LmsTestQuestion
 * @property {string} testId
 * @property {string} questionId
 * @property {number} sortOrder
 */

/**
 * @typedef {'Terdaftar'|'Belajar'|'Selesai'} LmsEnrollmentStatus
 *
 * @typedef {Object} LmsEnrollment
 * @property {string} id
 * @property {string} sessionId
 * @property {string} courseId
 * @property {string} auditorId
 * @property {number} progress
 * @property {string[]} completedModules
 * @property {LmsEnrollmentStatus} status
 */

/**
 * @typedef {'Berjalan'|'Menunggu Penilaian'|'Dinilai'} LmsAttemptStatus
 *
 * @typedef {Object} LmsAttempt
 * @property {string} id
 * @property {string} testId
 * @property {string} sessionId
 * @property {string} auditorId
 * @property {number} attemptNo
 * @property {string|null} startedAt
 * @property {string|null} submittedAt
 * @property {Object} answers
 * @property {number|null} autoScore
 * @property {number|null} manualScore
 * @property {number|null} finalScore
 * @property {boolean} passed
 * @property {LmsAttemptStatus} status
 */

/**
 * @typedef {Object} LmsRubricCriterion
 * @property {string} criterion
 * @property {number} weight
 * @property {number} maxScore
 *
 * @typedef {Object} LmsWorkshopTask
 * @property {string} id
 * @property {string} sessionId
 * @property {string} title
 * @property {string} brief
 * @property {string} dueDate
 * @property {LmsRubricCriterion[]} rubric
 * @property {number} maxScore
 */

/**
 * @typedef {'Dikirim'|'Dinilai'} LmsSubmissionStatus
 *
 * @typedef {Object} LmsSubmission
 * @property {string} id
 * @property {string} taskId
 * @property {string} sessionId
 * @property {string} auditorId
 * @property {string} fileUrl
 * @property {string} note
 * @property {string|null} submittedAt
 * @property {Object} rubricScores
 * @property {number|null} score
 * @property {string} feedback
 * @property {string} assessor
 * @property {LmsSubmissionStatus} status
 */

export {}
