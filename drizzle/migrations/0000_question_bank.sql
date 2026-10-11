CREATE TABLE public.questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  materia text NOT NULL,
  topico text NOT NULL DEFAULT '',
  enunciado text NOT NULL,
  alternativas jsonb NOT NULL,
  correta int NOT NULL,
  explicacao text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (materia, enunciado)
);
CREATE INDEX questions_materia_idx ON public.questions (materia);
GRANT SELECT ON public.questions TO authenticated;
GRANT ALL ON public.questions TO service_role;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users read questions" ON public.questions FOR SELECT TO authenticated USING (true);

CREATE TABLE public.user_seen_questions (
  user_id uuid NOT NULL,
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  materia text NOT NULL,
  seen_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, question_id)
);
CREATE INDEX user_seen_user_materia_idx ON public.user_seen_questions (user_id, materia);
GRANT SELECT, INSERT, DELETE ON public.user_seen_questions TO authenticated;
GRANT ALL ON public.user_seen_questions TO service_role;
ALTER TABLE public.user_seen_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own seen read" ON public.user_seen_questions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own seen insert" ON public.user_seen_questions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own seen delete" ON public.user_seen_questions FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.bank_refill_locks (
  materia text PRIMARY KEY,
  locked_until timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.bank_refill_locks TO service_role;
ALTER TABLE public.bank_refill_locks ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.ai_pause (
  id int PRIMARY KEY DEFAULT 1,
  paused_until timestamptz,
  reason text
);
GRANT ALL ON public.ai_pause TO service_role;
ALTER TABLE public.ai_pause ENABLE ROW LEVEL SECURITY;

-- Serve unseen questions to the caller and mark them as seen atomically.
CREATE OR REPLACE FUNCTION public.take_questions(_materia text, _topico text, _limit int)
RETURNS SETOF public.questions
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  RETURN QUERY
  WITH picked AS (
    SELECT q.* FROM public.questions q
    WHERE q.materia = _materia
      AND (coalesce(_topico,'') = '' OR q.topico ILIKE '%' || _topico || '%' OR q.enunciado ILIKE '%' || _topico || '%')
      AND NOT EXISTS (SELECT 1 FROM public.user_seen_questions s WHERE s.user_id = uid AND s.question_id = q.id)
    ORDER BY random()
    LIMIT least(greatest(_limit,1),20)
  ), ins AS (
    INSERT INTO public.user_seen_questions (user_id, question_id, materia)
    SELECT uid, id, materia FROM picked ON CONFLICT DO NOTHING
  )
  SELECT * FROM picked;
END $$;

CREATE OR REPLACE FUNCTION public.count_unseen(_materia text)
RETURNS int LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT count(*)::int FROM public.questions q
  WHERE q.materia = _materia
    AND NOT EXISTS (SELECT 1 FROM public.user_seen_questions s WHERE s.user_id = auth.uid() AND s.question_id = q.id)
$$;
GRANT EXECUTE ON FUNCTION public.take_questions(text,text,int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.count_unseen(text) TO authenticated;