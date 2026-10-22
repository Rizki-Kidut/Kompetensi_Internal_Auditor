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
  }
}
