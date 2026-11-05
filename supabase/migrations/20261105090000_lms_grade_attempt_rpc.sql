-- P0-1: server-side grading for manual essay and case questions.
CREATE OR REPLACE FUNCTION public.lms_grade_attempt(p_attempt_id text, p_manual_scores jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempt       public.lms_attempts%ROWTYPE;
  v_test          public.lms_tests%ROWTYPE;
  v_entry         RECORD;
  v_question      public.lms_questions%ROWTYPE;
  v_manual_score  NUMERIC := 0;
  v_total_points  NUMERIC := 0;
  v_final_score   NUMERIC;
  v_passed        BOOLEAN;
BEGIN
  IF p_manual_scores IS NULL OR jsonb_typeof(p_manual_scores) <> 'object' THEN
    RAISE EXCEPTION 'Nilai manual harus berupa objek JSON.';
  END IF;

  -- Serialize graders for this attempt; later calls see its updated status.
  SELECT * INTO v_attempt
  FROM public.lms_attempts
  WHERE id = p_attempt_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Attempt tidak ditemukan.';
  END IF;
  IF v_attempt.status <> 'Menunggu Penilaian' THEN
    RAISE EXCEPTION 'Attempt tidak sedang menunggu penilaian.';
  END IF;

  SELECT * INTO v_test
  FROM public.lms_tests
  WHERE id = v_attempt.test_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tes untuk attempt tidak ditemukan.';
  END IF;

  -- Reject keys that are not manual questions belonging to this test.
  FOR v_entry IN SELECT key, value FROM jsonb_each(p_manual_scores)
  LOOP
    SELECT q.* INTO v_question
    FROM public.lms_questions q
    JOIN public.lms_test_questions tq ON tq.question_id = q.id
    WHERE tq.test_id = v_attempt.test_id
      AND q.id = v_entry.key
      AND q.type IN ('Esai', 'Kasus');

    IF NOT FOUND THEN
      RAISE EXCEPTION 'ID soal % tidak valid untuk penilaian esai/kasus pada tes ini.', v_entry.key;
    END IF;
    IF jsonb_typeof(v_entry.value) <> 'number' THEN
      RAISE EXCEPTION 'Nilai untuk soal % harus berupa angka.', v_entry.key;
    END IF;
    IF (v_entry.value #>> '{}')::numeric < 0 THEN
      RAISE EXCEPTION 'Nilai untuk soal % tidak boleh negatif.', v_entry.key;
    END IF;
    IF (v_entry.value #>> '{}')::numeric > v_question.points THEN
      RAISE EXCEPTION 'Nilai untuk soal % melebihi poin maksimum (%).', v_entry.key, v_question.points;
    END IF;

    v_manual_score := v_manual_score + (v_entry.value #>> '{}')::numeric;
  END LOOP;

  SELECT COALESCE(SUM(q.points), 0) INTO v_total_points
  FROM public.lms_questions q
  JOIN public.lms_test_questions tq ON tq.question_id = q.id
  WHERE tq.test_id = v_attempt.test_id;

  IF v_total_points <= 0 THEN
    RAISE EXCEPTION 'Total poin tes harus lebih besar dari nol.';
  END IF;

  v_final_score := ROUND(((COALESCE(v_attempt.auto_score, 0) + v_manual_score) / v_total_points) * 100, 2);
  v_passed := v_final_score >= v_test.pass_grade;

  UPDATE public.lms_attempts
  SET manual_score = v_manual_score,
      final_score = v_final_score,
      passed = v_passed,
      status = 'Dinilai'
  WHERE id = p_attempt_id;

  IF v_passed THEN
    PERFORM public.lms_create_draft_evaluation(v_attempt.session_id, v_attempt.auditor_id);
  END IF;

  RETURN jsonb_build_object(
    'final_score', v_final_score,
    'passed', v_passed,
    'manual_score', v_manual_score
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.lms_grade_attempt(text, jsonb) FROM PUBLIC;
-- TODO(P1-1): remove anon access and enforce authenticated assessor/admin roles when Auth is implemented.
GRANT EXECUTE ON FUNCTION public.lms_grade_attempt(text, jsonb) TO anon, authenticated;
