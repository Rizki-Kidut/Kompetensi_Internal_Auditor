/*
# LMS Draft Evaluation Auto-Creation RPC

1. New Functions
- `lms_create_draft_evaluation(p_session_id text, p_auditor_id text)`
  SECURITY DEFINER function that auto-creates a draft training_evaluations row
  when an LMS test is passed AND all workshop tasks for the session are graded
  (or the session has no workshop tasks).

  The function:
  - Finds the best (highest final_score) passing attempt for the auditor in the session.
  - Checks all workshop tasks for the session: every task must have a graded submission.
  - Computes average workshop score (0-100 normalized per task, then averaged).
  - Determines competencyItemId from the training plan linked to the session,
    or from the LMS course linked to the session.
  - Reads the auditor's current competency level (before) from competency_cells.
  - Sets target from the course's target_level.
  - Inserts/updates a training_evaluations row with:
    id = 'ev-lms-<sessionId>-<auditorId>'
    final_status = 'Draft'
    test_source = 'LMS'
    hasil_tes_tertulis = best test score
    test_attempt_id = best attempt id
    workshop_score = workshop average
    scores_umum = all 6 keys null
    skill_map_update = { competencyItemId, before, after (proposed), target }
  - Does NOT write to competency_cells (that happens via Approval Center).

2. Security
  - SECURITY DEFINER, search_path = public
  - REVOKE EXECUTE FROM PUBLIC, anon; GRANT EXECUTE TO authenticated, anon
    (no-auth app pattern — both roles need to call it)
*/

CREATE OR REPLACE FUNCTION lms_create_draft_evaluation(p_session_id text, p_auditor_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session         RECORD;
  v_course          RECORD;
  v_plan            RECORD;
  v_best_attempt    RECORD;
  v_task            RECORD;
  v_submission      RECORD;
  v_all_workshop_ok BOOLEAN := true;
  v_has_workshop    BOOLEAN := false;
  v_weighted_sum    NUMERIC := 0;
  v_task_count      INT := 0;
  v_workshop_avg    NUMERIC;
  v_item_id         TEXT;
  v_target_level    TEXT;
  v_before_level    TEXT;
  v_after_level     TEXT;
  v_eval_id         TEXT;
  v_scores_umum     JSONB;
  v_skill_map       JSONB;
  v_existing        RECORD;
  v_best_score      NUMERIC := 0;
BEGIN
  -- Load session
  SELECT * INTO v_session FROM training_sessions WHERE id = p_session_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sesi tidak ditemukan');
  END IF;

  -- Find best passing attempt for this auditor in this session
  SELECT * INTO v_best_attempt
    FROM lms_attempts
    WHERE session_id = p_session_id
      AND auditor_id = p_auditor_id
      AND passed = true
      AND status = 'Dinilai'
    ORDER BY final_score DESC
    LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tes belum lulus');
  END IF;

  v_best_score := COALESCE(v_best_attempt.final_score, 0);

  -- Check workshop tasks for the session
  FOR v_task IN
    SELECT * FROM lms_workshop_tasks WHERE session_id = p_session_id
  LOOP
    v_has_workshop := true;
    SELECT * INTO v_submission
      FROM lms_submissions
      WHERE task_id = v_task.id AND auditor_id = p_auditor_id AND status = 'Dinilai'
      LIMIT 1;
    IF NOT FOUND THEN
      v_all_workshop_ok := false;
    ELSE
      -- Normalized score (0-100) per task
      IF COALESCE(v_task.max_score, 100) > 0 THEN
        v_weighted_sum := v_weighted_sum + (COALESCE(v_submission.score, 0) / v_task.max_score * 100);
      END IF;
      v_task_count := v_task_count + 1;
    END IF;
  END LOOP;

  IF v_has_workshop AND NOT v_all_workshop_ok THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ada workshop yang belum dinilai');
  END IF;

  IF v_has_workshop AND v_task_count > 0 THEN
    v_workshop_avg := round((v_weighted_sum / v_task_count)::numeric, 2);
  ELSE
    v_workshop_avg := null;
  END IF;

  -- Determine competency item and target level
  v_item_id := null;
  v_target_level := '◆';

  IF v_session.plan_id IS NOT NULL THEN
    SELECT * INTO v_plan FROM training_plans WHERE id = v_session.plan_id;
    IF FOUND AND v_plan.competency_item_id IS NOT NULL THEN
      v_item_id := v_plan.competency_item_id;
    END IF;
  END IF;

  -- Fallback: from LMS course linked to session
  IF v_item_id IS NULL AND v_session.lms_course_id IS NOT NULL THEN
    SELECT * INTO v_course FROM lms_courses WHERE id = v_session.lms_course_id;
    IF FOUND THEN
      v_item_id := v_course.competency_item_id;
      v_target_level := COALESCE(v_course.target_level, '◆');
    END IF;
  END IF;

  -- Get current level from competency_cells
  IF v_item_id IS NOT NULL THEN
    SELECT level INTO v_before_level
      FROM competency_cells
      WHERE auditor_id = p_auditor_id AND item_id = v_item_id
      LIMIT 1;
    v_before_level := COALESCE(v_before_level, '');
  ELSE
    v_before_level := '';
  END IF;

  -- Proposed after level: target but capped at ◆ for draft
  IF v_target_level = '★' THEN
    v_after_level := '◆';
  ELSE
    v_after_level := v_target_level;
  END IF;

  -- Don't propose a lower or equal level
  IF v_before_level = '★' OR
     (v_before_level = '◆' AND v_after_level IN ('◆', '●', '')) OR
     (v_before_level = '●' AND v_after_level IN ('●', '')) THEN
    v_after_level := '';
  END IF;

  -- Build scores_umum (all null)
  v_scores_umum := jsonb_build_object(
    'pemahamanIsi', null,
    'peningkatanSkill', null,
    'peningkatanKinerja', null,
    'implementasi', null,
    'improvement', null,
    'mengajarkanOrangLain', null
  );

  -- Build skill_map_update
  IF v_item_id IS NOT NULL THEN
    v_skill_map := jsonb_build_object(
      'competencyItemId', v_item_id,
      'before', v_before_level,
      'after', v_after_level,
      'target', v_target_level
    );
  ELSE
    v_skill_map := null;
  END IF;

  v_eval_id := 'ev-lms-' || p_session_id || '-' || p_auditor_id;

  -- Check if evaluation already exists
  SELECT * INTO v_existing FROM training_evaluations WHERE id = v_eval_id;

  IF FOUND THEN
    -- Update existing LMS-sourced draft (only if still Draft)
    UPDATE training_evaluations SET
      hasil_tes_tertulis = v_best_score,
      test_source = 'LMS',
      test_attempt_id = v_best_attempt.id,
      workshop_score = v_workshop_avg,
      skill_map_update = v_skill_map
    WHERE id = v_eval_id AND final_status = 'Draft';
  ELSE
    -- Insert new draft
    INSERT INTO training_evaluations (
      id, session_id, auditor_id, evaluation_date,
      scores_umum, scores_khusus, total_nilai_a, rata_rata_nilai_a,
      hasil_tes_tertulis, skill_map_update, kesimpulan,
      approval_chain, final_status,
      test_source, test_attempt_id, workshop_score
    ) VALUES (
      v_eval_id, p_session_id, p_auditor_id, CURRENT_DATE,
      v_scores_umum, '[]'::jsonb, 0, 0,
      v_best_score, v_skill_map, '',
      '[]'::jsonb, 'Draft',
      'LMS', v_best_attempt.id, v_workshop_avg
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'eval_id', v_eval_id,
    'test_score', v_best_score,
    'workshop_score', v_workshop_avg,
    'after_level', v_after_level
  );
END;
$$;

-- Grant access (no-auth app pattern)
REVOKE EXECUTE ON FUNCTION lms_create_draft_evaluation(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION lms_create_draft_evaluation(text, text) TO anon, authenticated;
