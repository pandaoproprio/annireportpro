
-- ════════════════════════════════════════════════════════════════════
-- 1. ENUMS
-- ════════════════════════════════════════════════════════════════════
DO $$ BEGIN
  CREATE TYPE public.gamification_level AS ENUM ('bronze', 'prata', 'ouro', 'diamante', 'lendario');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.gamification_rarity AS ENUM ('comum', 'raro', 'epico', 'lendario');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ════════════════════════════════════════════════════════════════════
-- 2. USER STATS
-- ════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.gamification_user_stats (
  user_id UUID PRIMARY KEY,
  xp INTEGER NOT NULL DEFAULT 0,
  level gamification_level NOT NULL DEFAULT 'bronze',
  current_score NUMERIC NOT NULL DEFAULT 0,
  streak_no_rework INTEGER NOT NULL DEFAULT 0,
  streak_on_time INTEGER NOT NULL DEFAULT 0,
  total_activities INTEGER NOT NULL DEFAULT 0,
  total_published INTEGER NOT NULL DEFAULT 0,
  last_recalculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.gamification_user_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own stats"
  ON public.gamification_user_stats FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins manage stats"
  ON public.gamification_user_stats FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- ════════════════════════════════════════════════════════════════════
-- 3. BADGES CATALOG
-- ════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.gamification_badges (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'award',
  rarity gamification_rarity NOT NULL DEFAULT 'comum',
  xp_reward INTEGER NOT NULL DEFAULT 50,
  criterion_type TEXT NOT NULL,
  criterion_value INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.gamification_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated reads badges"
  ON public.gamification_badges FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage badges"
  ON public.gamification_badges FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- ════════════════════════════════════════════════════════════════════
-- 4. USER BADGES
-- ════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.gamification_user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  badge_id TEXT NOT NULL REFERENCES public.gamification_badges(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

ALTER TABLE public.gamification_user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own badges"
  ON public.gamification_user_badges FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins insert badges"
  ON public.gamification_user_badges FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins delete badges"
  ON public.gamification_user_badges FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- ════════════════════════════════════════════════════════════════════
-- 5. MISSIONS
-- ════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.gamification_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  metric TEXT NOT NULL,
  target_value INTEGER NOT NULL,
  xp_reward INTEGER NOT NULL DEFAULT 100,
  badge_reward TEXT REFERENCES public.gamification_badges(id) ON DELETE SET NULL,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.gamification_missions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated reads missions"
  ON public.gamification_missions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage missions"
  ON public.gamification_missions FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- ════════════════════════════════════════════════════════════════════
-- 6. USER MISSIONS
-- ════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.gamification_user_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  mission_id UUID NOT NULL REFERENCES public.gamification_missions(id) ON DELETE CASCADE,
  progress INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  claimed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, mission_id)
);

ALTER TABLE public.gamification_user_missions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own missions"
  ON public.gamification_user_missions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins manage user missions"
  ON public.gamification_user_missions FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- ════════════════════════════════════════════════════════════════════
-- 7. SEED BADGES
-- ════════════════════════════════════════════════════════════════════
INSERT INTO public.gamification_badges (id, name, description, icon, rarity, xp_reward, criterion_type, criterion_value) VALUES
  ('first_activity', 'Primeira Jornada', 'Concluiu a primeira atividade', 'sparkles', 'comum', 50, 'total_activities', 1),
  ('ten_activities', 'Produtor', 'Concluiu 10 atividades', 'zap', 'comum', 100, 'total_activities', 10),
  ('fifty_activities', 'Maratonista', 'Concluiu 50 atividades', 'trophy', 'raro', 250, 'total_activities', 50),
  ('hundred_activities', 'Centurião', 'Concluiu 100 atividades', 'crown', 'epico', 500, 'total_activities', 100),
  ('no_rework_7', 'Precisão', '7 dias sem retrabalho', 'shield-check', 'raro', 150, 'streak_no_rework', 7),
  ('no_rework_30', 'Imaculado', '30 dias sem retrabalho', 'gem', 'epico', 400, 'streak_no_rework', 30),
  ('on_time_7', 'Pontual', '7 entregas no prazo seguidas', 'clock', 'comum', 100, 'streak_on_time', 7),
  ('on_time_30', 'Relógio Suíço', '30 entregas no prazo seguidas', 'medal', 'epico', 350, 'streak_on_time', 30),
  ('score_70', 'Alta Performance', 'Atingiu score 70+', 'trending-up', 'raro', 200, 'current_score', 70),
  ('score_85', 'Excelência', 'Atingiu score 85+', 'star', 'epico', 400, 'current_score', 85),
  ('score_95', 'Lenda', 'Atingiu score 95+', 'flame', 'lendario', 1000, 'current_score', 95),
  ('ten_published', 'Comunicador', 'Publicou 10 relatórios', 'file-check', 'comum', 150, 'total_published', 10)
ON CONFLICT (id) DO NOTHING;

-- ════════════════════════════════════════════════════════════════════
-- 8. SEED INITIAL WEEKLY MISSIONS (current week)
-- ════════════════════════════════════════════════════════════════════
INSERT INTO public.gamification_missions (title, description, metric, target_value, xp_reward, starts_at, ends_at)
SELECT * FROM (VALUES
  ('Semana Produtiva', 'Conclua 10 atividades nesta semana', 'activities_count', 10, 200, date_trunc('week', now()), date_trunc('week', now()) + interval '7 days'),
  ('Zero Atrasos', 'Termine a semana sem nenhuma violação de SLA', 'sla_violations_inverse', 0, 250, date_trunc('week', now()), date_trunc('week', now()) + interval '7 days'),
  ('Sem Retrabalho', 'Não tenha retrabalho nesta semana', 'reopen_inverse', 0, 200, date_trunc('week', now()), date_trunc('week', now()) + interval '7 days')
) AS v(title, description, metric, target_value, xp_reward, starts_at, ends_at)
WHERE NOT EXISTS (SELECT 1 FROM public.gamification_missions WHERE starts_at = date_trunc('week', now()));

-- ════════════════════════════════════════════════════════════════════
-- 9. RECALC FUNCTION
-- ════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.recalc_user_gamification(_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _snap user_productivity_snapshots%ROWTYPE;
  _xp INTEGER := 0;
  _level gamification_level;
  _streak_rework INTEGER := 0;
  _streak_ontime INTEGER := 0;
  _published INTEGER := 0;
  _badge RECORD;
BEGIN
  -- latest snapshot
  SELECT * INTO _snap
  FROM user_productivity_snapshots
  WHERE user_id = _user_id
  ORDER BY snapshot_date DESC
  LIMIT 1;

  IF _snap IS NULL THEN RETURN; END IF;

  -- streak: count consecutive recent snapshots with reopen_count = 0
  SELECT COUNT(*) INTO _streak_rework FROM (
    SELECT snapshot_date, reopen_count,
      ROW_NUMBER() OVER (ORDER BY snapshot_date DESC) AS rn
    FROM user_productivity_snapshots
    WHERE user_id = _user_id AND reopen_count = 0
    ORDER BY snapshot_date DESC
    LIMIT 60
  ) s;

  SELECT COUNT(*) INTO _streak_ontime FROM (
    SELECT snapshot_date FROM user_productivity_snapshots
    WHERE user_id = _user_id AND sla_violations = 0 AND sla_total > 0
    ORDER BY snapshot_date DESC
    LIMIT 60
  ) s;

  -- count published (team_reports + justification_reports not draft)
  SELECT (
    (SELECT COUNT(*) FROM team_reports WHERE user_id = _user_id AND is_draft = false AND deleted_at IS NULL)
    + (SELECT COUNT(*) FROM justification_reports WHERE user_id = _user_id AND is_draft = false AND deleted_at IS NULL)
  ) INTO _published;

  -- XP base: activities * 10 + published * 25 + score
  _xp := COALESCE(_snap.activities_count, 0) * 10
       + _published * 25
       + COALESCE(_snap.score, 0)::INTEGER * 2;

  -- Level brackets
  _level := CASE
    WHEN _xp >= 5000 THEN 'lendario'::gamification_level
    WHEN _xp >= 2500 THEN 'diamante'::gamification_level
    WHEN _xp >= 1000 THEN 'ouro'::gamification_level
    WHEN _xp >= 300  THEN 'prata'::gamification_level
    ELSE 'bronze'::gamification_level
  END;

  -- Upsert stats
  INSERT INTO gamification_user_stats (
    user_id, xp, level, current_score, streak_no_rework, streak_on_time,
    total_activities, total_published, last_recalculated_at, updated_at
  ) VALUES (
    _user_id, _xp, _level, _snap.score, _streak_rework, _streak_ontime,
    _snap.activities_count, _published, now(), now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    xp = EXCLUDED.xp,
    level = EXCLUDED.level,
    current_score = EXCLUDED.current_score,
    streak_no_rework = EXCLUDED.streak_no_rework,
    streak_on_time = EXCLUDED.streak_on_time,
    total_activities = EXCLUDED.total_activities,
    total_published = EXCLUDED.total_published,
    last_recalculated_at = now(),
    updated_at = now();

  -- Award badges
  FOR _badge IN SELECT * FROM gamification_badges WHERE is_active = true LOOP
    IF (
      (_badge.criterion_type = 'total_activities' AND _snap.activities_count >= _badge.criterion_value) OR
      (_badge.criterion_type = 'total_published' AND _published >= _badge.criterion_value) OR
      (_badge.criterion_type = 'streak_no_rework' AND _streak_rework >= _badge.criterion_value) OR
      (_badge.criterion_type = 'streak_on_time' AND _streak_ontime >= _badge.criterion_value) OR
      (_badge.criterion_type = 'current_score' AND COALESCE(_snap.score, 0) >= _badge.criterion_value)
    ) THEN
      INSERT INTO gamification_user_badges (user_id, badge_id)
      VALUES (_user_id, _badge.id)
      ON CONFLICT (user_id, badge_id) DO NOTHING;
    END IF;
  END LOOP;
END;
$$;

-- ════════════════════════════════════════════════════════════════════
-- 10. RECALC ALL FUNCTION
-- ════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.recalc_all_user_gamification()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID;
  _count INTEGER := 0;
BEGIN
  FOR _uid IN SELECT DISTINCT user_id FROM user_productivity_snapshots LOOP
    PERFORM recalc_user_gamification(_uid);
    _count := _count + 1;
  END LOOP;
  RETURN _count;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_gam_user_badges_user ON public.gamification_user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_gam_user_missions_user ON public.gamification_user_missions(user_id);
CREATE INDEX IF NOT EXISTS idx_gam_missions_active ON public.gamification_missions(is_active, ends_at);
