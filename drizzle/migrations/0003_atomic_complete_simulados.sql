CREATE OR REPLACE FUNCTION public.question_subjects(_materia text) RETURNS text[] LANGUAGE sql IMMUTABLE SET search_path = public AS $$ SELECT CASE _materia WHEN 'Raciocínio Lógico-Matemático' THEN ARRAY['Raciocínio Lógico'] WHEN 'Noções de Estatística e Análise de Dados' THEN ARRAY['Estatística e Análise de Dados'] WHEN 'Noções de Contabilidade e Análise Financeira' THEN ARRAY['Contabilidade e Análise Financeira'] WHEN 'Noções de Informática' THEN ARRAY['Informática'] WHEN 'Direito Penal e Legislação Penal Especial' THEN ARRAY['Direito Penal','Legislação Penal Especial'] WHEN 'Direito Penal e Legislação Complementar' THEN ARRAY['Direito Penal','Legislação Penal Especial'] WHEN 'Direito Processual Penal e Legislação Processual Penal Especial' THEN ARRAY['Direito Processual Penal'] WHEN 'Direito Processual Penal e Legislação Complementar' THEN ARRAY['Direito Processual Penal'] WHEN 'Direito Constitucional e Legislação Complementar' THEN ARRAY['Direito Constitucional'] WHEN 'Direito Administrativo e Legislação Complementar' THEN ARRAY['Direito Administrativo'] WHEN 'História do Amapá, Geografia do Amapá e Legislação Institucional' THEN ARRAY['História e Geografia do Amapá','Legislação Estadual (PC-AP)'] ELSE ARRAY[_materia] END $$;
GRANT EXECUTE ON FUNCTION public.question_subjects(text) TO authenticated, service_role;
CREATE OR REPLACE FUNCTION public.take_questions(_materia text, _topico text, _limit int) RETURNS SETOF public.questions LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); BEGIN
IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
PERFORM pg_advisory_xact_lock(hashtextextended(uid::text,0));
RETURN QUERY WITH picked AS MATERIALIZED (SELECT q.* FROM public.questions q WHERE q.materia = ANY(public.question_subjects(_materia)) AND (coalesce(_topico,'')='' OR q.topico ILIKE '%'||_topico||'%' OR q.enunciado ILIKE '%'||_topico||'%') AND NOT EXISTS (SELECT 1 FROM public.user_seen_questions s WHERE s.user_id=uid AND s.question_id=q.id) ORDER BY random() LIMIT least(greatest(_limit,1),20)), ins AS (INSERT INTO public.user_seen_questions(user_id,question_id,materia) SELECT uid,id,materia FROM picked ON CONFLICT DO NOTHING RETURNING question_id) SELECT p.* FROM picked p JOIN ins i ON i.question_id=p.id;
END $$;
CREATE OR REPLACE FUNCTION public.count_unseen(_materia text) RETURNS int LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public AS $$ SELECT count(*)::int FROM public.questions q WHERE q.materia=ANY(public.question_subjects(_materia)) AND NOT EXISTS (SELECT 1 FROM public.user_seen_questions s WHERE s.user_id=auth.uid() AND s.question_id=q.id) $$;
CREATE OR REPLACE FUNCTION public.take_simulado(_cargo text) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE uid uuid:=auth.uid(); plan jsonb; block jsonb; chosen uuid[]:=ARRAY[]::uuid[]; ids uuid[]; label text; required int; payload jsonb:='[]'::jsonb;
BEGIN
IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
IF _cargo='investigador' THEN plan:='[["Língua Portuguesa",8],["Raciocínio Lógico-Matemático",8],["Noções de Estatística e Análise de Dados",8],["Noções de Contabilidade e Análise Financeira",8],["Noções de Informática",12],["Direito Penal e Legislação Penal Especial",8],["Direito Processual Penal e Legislação Processual Penal Especial",8],["Direito Constitucional",5],["Direito Administrativo",5],["Direitos Humanos",4],["História do Amapá, Geografia do Amapá e Legislação Institucional",6]]'::jsonb;
ELSIF _cargo='delegado' THEN plan:='[["Direito Administrativo e Legislação Complementar",10],["Direito Constitucional e Legislação Complementar",10],["Direito Penal e Legislação Complementar",17],["Direito Processual Penal e Legislação Complementar",17],["Direito Civil/Empresarial e Legislação Complementar",4],["Direito Tributário e Legislação Complementar",4],["Direito Ambiental e Legislação Complementar",4],["Medicina Legal",4],["Criminologia",4],["História do Amapá, Geografia do Amapá e Legislação Institucional",6]]'::jsonb;
ELSE RAISE EXCEPTION 'invalid cargo'; END IF;
PERFORM pg_advisory_xact_lock(hashtextextended(uid::text,0));
FOR block IN SELECT value FROM jsonb_array_elements(plan) LOOP
label:=block->>0; required:=(block->>1)::int;
SELECT coalesce(array_agg(q.id),ARRAY[]::uuid[]) INTO ids FROM (SELECT q.id FROM public.questions q WHERE q.materia=ANY(public.question_subjects(label)) AND NOT(q.id=ANY(chosen)) AND NOT EXISTS(SELECT 1 FROM public.user_seen_questions s WHERE s.user_id=uid AND s.question_id=q.id) ORDER BY random() LIMIT required) q;
IF cardinality(ids)<required THEN RETURN jsonb_build_object('questions','[]'::jsonb,'error',format('Ainda faltam questões inéditas de %s para completar o simulado (%s de %s disponíveis). Nenhuma questão foi consumida. Continue nas questões individuais.',label,cardinality(ids),required)); END IF;
chosen:=chosen||ids;
SELECT payload||jsonb_agg(to_jsonb(q)||jsonb_build_object('materia',label) ORDER BY array_position(ids,q.id)) INTO payload FROM public.questions q WHERE q.id=ANY(ids);
END LOOP;
INSERT INTO public.user_seen_questions(user_id,question_id,materia) SELECT uid,id,materia FROM public.questions WHERE id=ANY(chosen);
RETURN jsonb_build_object('questions',payload,'error',null);
END $$;
REVOKE EXECUTE ON FUNCTION public.take_simulado(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.take_simulado(text) TO authenticated, service_role;