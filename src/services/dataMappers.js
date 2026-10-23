/**
 * Maps between snake_case database rows and camelCase frontend objects.
 * Each entity has a to-Frontend and to-DB transformer.
 */

// ── Auditors ──────────────────────────────────────────────
export function auditorRowToFrontend(row) {
  return {
    id: row.id,
    nik: row.nik,
    name: row.name,
    section: row.section,
    position: row.position,
    status: row.status,
    scopeAuditor: row.scope_auditor ?? { qms: false, manufakturShift: false, produk: false, supplier: false },
    areaAuditPermission: row.area_audit_permission ?? {},
    joinAsAuditorDate: row.join_as_auditor_date ?? '',
  }
}

export function auditorFrontendToRow(a) {
  return {
    id: a.id,
    nik: a.nik,
    name: a.name,
    section: a.section,
    position: a.position,
    status: a.status,
    scope_auditor: a.scopeAuditor,
    area_audit_permission: a.areaAuditPermission,
    join_as_auditor_date: a.joinAsAuditorDate,
  }
}

// ── Competency Items ──────────────────────────────────────
export function competencyItemRowToFrontend(row) {
  return { id: row.id, category: row.category, itemName: row.item_name }
}

export function competencyItemFrontendToRow(item) {
  return { id: item.id, category: item.category, item_name: item.itemName }
}

// ── Competency Cells ──────────────────────────────────────
export function competencyCellRowToFrontend(row) {
  return {
    auditorId: row.auditor_id,
    itemId: row.item_id,
    level: row.level,
    lastUpdated: row.last_updated,
    updatedBy: row.updated_by,
    sourceEvaluationId: row.source_evaluation_id,
  }
}

export function competencyCellFrontendToRow(cell) {
  return {
    auditor_id: cell.auditorId,
    item_id: cell.itemId,
    level: cell.level,
    last_updated: cell.lastUpdated,
    updated_by: cell.updatedBy,
    source_evaluation_id: cell.sourceEvaluationId,
  }
}

// ── Revision Logs ─────────────────────────────────────────
export function revisionLogRowToFrontend(row) {
  return {
    id: row.id,
    date: row.date,
    type: row.type,
    description: row.description,
    revisionNumber: row.revision_number,
  }
}

export function revisionLogFrontendToRow(entry) {
  return {
    id: entry.id,
    date: entry.date,
    type: entry.type,
    description: entry.description,
    revision_number: entry.revisionNumber,
  }
}

// ── Auditor Requests ──────────────────────────────────────
export function auditorRequestRowToFrontend(row) {
  return {
    id: row.id,
    requestType: row.request_type,
    nik: row.nik,
    name: row.name,
    section: row.section,
    position: row.position,
    initialScope: row.initial_scope,
    reason: row.reason,
    reasonDetail: row.reason_detail,
    submittedBy: row.submitted_by,
    submittedDate: row.submitted_date,
    approvalChain: row.approval_chain ?? [],
    finalStatus: row.final_status,
  }
}

export function auditorRequestFrontendToRow(req) {
  return {
    id: req.id,
    request_type: req.requestType,
    nik: req.nik,
    name: req.name,
    section: req.section,
    position: req.position,
    initial_scope: req.initialScope,
    reason: req.reason,
    reason_detail: req.reasonDetail,
    submitted_by: req.submittedBy,
    submitted_date: req.submittedDate,
    approval_chain: req.approvalChain,
    final_status: req.finalStatus,
  }
}

// ── Auditor History ───────────────────────────────────────
export function auditorHistoryRowToFrontend(row) {
  return {
    id: row.id,
    nik: row.nik,
    name: row.name,
    section: row.section,
    lastScope: row.last_scope,
    lastCompetencyLevel: row.last_competency_level,
    deactivatedDate: row.deactivated_date,
    reason: row.reason,
    sourceRequestId: row.source_request_id,
  }
}

export function auditorHistoryFrontendToRow(entry) {
  return {
    id: entry.id,
    nik: entry.nik,
    name: entry.name,
    section: entry.section,
    last_scope: entry.lastScope,
    last_competency_level: entry.lastCompetencyLevel,
    deactivated_date: entry.deactivatedDate,
    reason: entry.reason,
    source_request_id: entry.sourceRequestId,
  }
}

// ── Training Plans ────────────────────────────────────────
export function trainingPlanRowToFrontend(row) {
  return {
    id: row.id,
    competencyItemId: row.competency_item_id,
    targetLevel: row.target_level,
    targetParticipants: row.target_participants ?? [],
    reason: row.reason,
    plannedDate: row.planned_date,
    priority: row.priority,
    status: row.status,
    notes: row.notes ?? '',
  }
}

export function trainingPlanFrontendToRow(plan) {
  return {
    id: plan.id,
    competency_item_id: plan.competencyItemId,
    target_level: plan.targetLevel,
    target_participants: plan.targetParticipants,
    reason: plan.reason,
    planned_date: plan.plannedDate,
    priority: plan.priority,
    status: plan.status,
    notes: plan.notes,
  }
}

// ── Training Sessions ─────────────────────────────────────
export function trainingSessionRowToFrontend(row) {
  return {
    id: row.id,
    planId: row.plan_id,
    trainingName: row.training_name,
    date: row.date,
    organizer: row.organizer,
    trainer: row.trainer,
    participants: row.participants ?? [],
    attendees: row.attendees ?? [],
    materials: row.materials,
    status: row.status,
    deliveryMode: row.delivery_mode ?? 'Tatap Muka',
    lmsCourseId: row.lms_course_id ?? null,
  }
}

export function trainingSessionFrontendToRow(session) {
  return {
    id: session.id,
    plan_id: session.planId,
    training_name: session.trainingName,
    date: session.date,
    organizer: session.organizer,
    trainer: session.trainer,
    participants: session.participants,
    attendees: session.attendees,
    materials: session.materials,
    status: session.status,
    delivery_mode: session.deliveryMode ?? 'Tatap Muka',
    lms_course_id: session.lmsCourseId ?? null,
  }
}

// ── Training Evaluations ──────────────────────────────────
export function evaluationRowToFrontend(row) {
  return {
    id: row.id,
    sessionId: row.session_id,
    auditorId: row.auditor_id,
    evaluationDate: row.evaluation_date,
    scoresUmum: row.scores_umum ?? {},
    scoresKhusus: row.scores_khusus ?? [],
    totalNilaiA: Number(row.total_nilai_a) || 0,
    rataRataNilaiA: Number(row.rata_rata_nilai_a) || 0,
    hasilTesTertulis: row.hasil_tes_tertulis,
    skillMapUpdate: row.skill_map_update,
    kesimpulan: row.kesimpulan,
    approvalChain: row.approval_chain ?? [],
    finalStatus: row.final_status,
    testSource: row.test_source ?? 'Manual',
    testAttemptId: row.test_attempt_id ?? null,
    workshopScore: row.workshop_score != null ? Number(row.workshop_score) : null,
  }
}

export function evaluationFrontendToRow(ev) {
  return {
    id: ev.id,
    session_id: ev.sessionId,
    auditor_id: ev.auditorId,
    evaluation_date: ev.evaluationDate,
    scores_umum: ev.scoresUmum,
    scores_khusus: ev.scoresKhusus,
    total_nilai_a: ev.totalNilaiA,
    rata_rata_nilai_a: ev.rataRataNilaiA,
    hasil_tes_tertulis: ev.hasilTesTertulis,
    skill_map_update: ev.skillMapUpdate,
    kesimpulan: ev.kesimpulan,
    approval_chain: ev.approvalChain,
    final_status: ev.finalStatus,
    test_source: ev.testSource ?? 'Manual',
    test_attempt_id: ev.testAttemptId ?? null,
    workshop_score: ev.workshopScore ?? null,
  }
}

// ── LMS Courses ───────────────────────────────────────────
export function lmsCourseRowToFrontend(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    competencyItemId: row.competency_item_id ?? null,
    targetLevel: row.target_level ?? '◆',
    passGrade: Number(row.pass_grade) ?? 80,
    status: row.status ?? 'Draft',
  }
}

export function lmsCourseFrontendToRow(course) {
  return {
    id: course.id,
    title: course.title,
    description: course.description,
    competency_item_id: course.competencyItemId,
    target_level: course.targetLevel,
    pass_grade: course.passGrade,
    status: course.status,
  }
}

// ── LMS Modules ───────────────────────────────────────────
export function lmsModuleRowToFrontend(row) {
  return {
    id: row.id,
    courseId: row.course_id,
    title: row.title,
    sortOrder: row.sort_order ?? 0,
    prerequisiteModuleId: row.prerequisite_module_id ?? null,
  }
}

export function lmsModuleFrontendToRow(mod) {
  return {
    id: mod.id,
    course_id: mod.courseId,
    title: mod.title,
    sort_order: mod.sortOrder,
    prerequisite_module_id: mod.prerequisiteModuleId,
  }
}

// ── LMS Materials ─────────────────────────────────────────
export function lmsMaterialRowToFrontend(row) {
  return {
    id: row.id,
    moduleId: row.module_id,
    title: row.title,
    type: row.type ?? 'Teks',
    url: row.url ?? '',
    content: row.content ?? '',
    docNumber: row.doc_number ?? '',
    revision: row.revision ?? '',
    effectiveDate: row.effective_date ?? '',
    sortOrder: row.sort_order ?? 0,
  }
}

export function lmsMaterialFrontendToRow(mat) {
  return {
    id: mat.id,
    module_id: mat.moduleId,
    title: mat.title,
    type: mat.type,
    url: mat.url,
    content: mat.content,
    doc_number: mat.docNumber,
    revision: mat.revision,
    effective_date: mat.effectiveDate,
    sort_order: mat.sortOrder,
  }
}

// ── LMS Questions ─────────────────────────────────────────
export function lmsQuestionRowToFrontend(row) {
  return {
    id: row.id,
    courseId: row.course_id,
    type: row.type ?? 'PG',
    text: row.text,
    options: row.options ?? [],
    clauseTag: row.clause_tag ?? '',
    difficulty: row.difficulty ?? 'Sedang',
    points: Number(row.points) ?? 1,
  }
}

export function lmsQuestionFrontendToRow(q) {
  return {
    id: q.id,
    course_id: q.courseId,
    type: q.type,
    text: q.text,
    options: q.options,
    clause_tag: q.clauseTag,
    difficulty: q.difficulty,
    points: q.points,
  }
}

// ── LMS Tests ─────────────────────────────────────────────
export function lmsTestRowToFrontend(row) {
  return {
    id: row.id,
    courseId: row.course_id,
    title: row.title,
    durationMinutes: row.duration_minutes ?? 30,
    passGrade: Number(row.pass_grade) ?? 80,
    maxAttempts: row.max_attempts ?? 1,
    shuffleQuestions: row.shuffle_questions ?? false,
    shuffleOptions: row.shuffle_options ?? false,
    openOffsetDays: row.open_offset_days ?? 0,
    closeOffsetDays: row.close_offset_days ?? 7,
    status: row.status ?? 'Draft',
  }
}

export function lmsTestFrontendToRow(test) {
  return {
    id: test.id,
    course_id: test.courseId,
    title: test.title,
    duration_minutes: test.durationMinutes,
    pass_grade: test.passGrade,
    max_attempts: test.maxAttempts,
    shuffle_questions: test.shuffleQuestions,
    shuffle_options: test.shuffleOptions,
    open_offset_days: test.openOffsetDays,
    close_offset_days: test.closeOffsetDays,
    status: test.status,
  }
}

// ── LMS Test Questions ────────────────────────────────────
export function lmsTestQuestionRowToFrontend(row) {
  return {
    testId: row.test_id,
    questionId: row.question_id,
    sortOrder: row.sort_order ?? 0,
  }
}

export function lmsTestQuestionFrontendToRow(tq) {
  return {
    test_id: tq.testId,
    question_id: tq.questionId,
    sort_order: tq.sortOrder,
  }
}

// ── LMS Enrollments ───────────────────────────────────────
export function lmsEnrollmentRowToFrontend(row) {
  return {
    id: row.id,
    sessionId: row.session_id,
    courseId: row.course_id,
    auditorId: row.auditor_id,
    progress: Number(row.progress) ?? 0,
    completedModules: row.completed_modules ?? [],
    status: row.status ?? 'Terdaftar',
  }
}

export function lmsEnrollmentFrontendToRow(en) {
  return {
    id: en.id,
    session_id: en.sessionId,
    course_id: en.courseId,
    auditor_id: en.auditorId,
    progress: en.progress,
    completed_modules: en.completedModules,
    status: en.status,
  }
}

// ── LMS Attempts ──────────────────────────────────────────
export function lmsAttemptRowToFrontend(row) {
  return {
    id: row.id,
    testId: row.test_id,
    sessionId: row.session_id,
    auditorId: row.auditor_id,
    attemptNo: row.attempt_no ?? 1,
    startedAt: row.started_at ?? null,
    submittedAt: row.submitted_at ?? null,
    answers: row.answers ?? {},
    autoScore: row.auto_score != null ? Number(row.auto_score) : null,
    manualScore: row.manual_score != null ? Number(row.manual_score) : null,
    finalScore: row.final_score != null ? Number(row.final_score) : null,
    passed: row.passed ?? false,
    status: row.status ?? 'Berjalan',
  }
}

export function lmsAttemptFrontendToRow(att) {
  return {
    id: att.id,
    test_id: att.testId,
    session_id: att.sessionId,
    auditor_id: att.auditorId,
    attempt_no: att.attemptNo,
    started_at: att.startedAt,
    submitted_at: att.submittedAt,
    answers: att.answers,
    auto_score: att.autoScore,
    manual_score: att.manualScore,
    final_score: att.finalScore,
    passed: att.passed,
    status: att.status,
  }
}

// ── LMS Workshop Tasks ────────────────────────────────────
export function lmsWorkshopTaskRowToFrontend(row) {
  return {
    id: row.id,
    sessionId: row.session_id,
    title: row.title,
    brief: row.brief ?? '',
    dueDate: row.due_date ?? '',
    rubric: row.rubric ?? [],
    maxScore: Number(row.max_score) ?? 100,
  }
}

export function lmsWorkshopTaskFrontendToRow(task) {
  return {
    id: task.id,
    session_id: task.sessionId,
    title: task.title,
    brief: task.brief,
    due_date: task.dueDate,
    rubric: task.rubric,
    max_score: task.maxScore,
  }
}

// ── LMS Submissions ───────────────────────────────────────
export function lmsSubmissionRowToFrontend(row) {
  return {
    id: row.id,
    taskId: row.task_id,
    sessionId: row.session_id,
    auditorId: row.auditor_id,
    fileUrl: row.file_url ?? '',
    note: row.note ?? '',
    submittedAt: row.submitted_at ?? null,
    rubricScores: row.rubric_scores ?? {},
    score: row.score != null ? Number(row.score) : null,
    feedback: row.feedback ?? '',
    assessor: row.assessor ?? '',
    status: row.status ?? 'Dikirim',
  }
}

export function lmsSubmissionFrontendToRow(sub) {
  return {
    id: sub.id,
    task_id: sub.taskId,
    session_id: sub.sessionId,
    auditor_id: sub.auditorId,
    file_url: sub.fileUrl,
    note: sub.note,
    submitted_at: sub.submittedAt,
    rubric_scores: sub.rubricScores,
    score: sub.score,
    feedback: sub.feedback,
    assessor: sub.assessor,
    status: sub.status,
  }
}
