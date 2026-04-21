
-- Adiciona flag de elegibilidade
ALTER TABLE public.gamification_user_stats
  ADD COLUMN IF NOT EXISTS is_eligible BOOLEAN NOT NULL DEFAULT true;

-- Atualiza função de recálculo para ignorar quem nunca logou ou tem 0 atividades
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
  _first_login TIMESTAMPTZ;
  _activity_count INTEGER := 0;
BEGIN
  -- Verifica se o usuário já fez login pelo menos uma vez
  SELECT first_login_at INTO _first_login
  FROM profiles WHERE user_id = _user_id LIMIT 1;

  -- Conta atividades reais (no diário) do usuário, fora drafts e lixeira
  SELECT COUNT(*) INTO _activity_count
  FROM activities
  WHERE user_id = _user_id AND is_draft = false AND deleted_at IS NULL;

  -- Se nunca logou OU não tem nenhuma atividade real, remove dos stats e sai
  IF _first_login IS NULL OR _activity_count = 0 THEN
    DELETE FROM gamification_user_stats WHERE user_id = _user_id;
    DELETE FROM gamification_user_badges WHERE user_id = _user_id;
    RETURN;
  END IF;

  -- snapshot mais recente
  SELECT * INTO _snap
  FROM user_productivity_snapshots
  WHERE user_id = _user_id
  ORDER BY snapshot_date DESC
  LIMIT 1;

  -- Se não há snapshot, sai (não cria entrada vazia)
  IF _snap IS NULL THEN
    DELETE FROM gamification_user_stats WHERE user_id = _user_id;
    RETURN;
  END IF;

  -- Streaks
  SELECT COUNT(*) INTO _streak_rework FROM (
    SELECT snapshot_date FROM user_productivity_snapshots
    WHERE user_id = _user_id AND reopen_count = 0
    ORDER BY snapshot_date DESC LIMIT 60
  ) s;

  SELECT COUNT(*) INTO _streak_ontime FROM (
    SELECT snapshot_date FROM user_productivity_snapshots
    WHERE user_id = _user_id AND sla_violations = 0 AND sla_total > 0
    ORDER BY snapshot_date DESC LIMIT 60
  ) s;

  -- Publicados
  SELECT (
    (SELECT COUNT(*) FROM team_reports WHERE user_id = _user_id AND is_draft = false AND deleted_at IS NULL)
    + (SELECT COUNT(*) FROM justification_reports WHERE user_id = _user_id AND is_draft = false AND deleted_at IS NULL)
  ) INTO _published;

  _xp := COALESCE(_activity_count, 0) * 10
       + _published * 25
       + COALESCE(_snap.score, 0)::INTEGER * 2;

  _level := CASE
    WHEN _xp >= 5000 THEN 'lendario'::gamification_level
    WHEN _xp >= 2500 THEN 'diamante'::gamification_level
    WHEN _xp >= 1000 THEN 'ouro'::gamification_level
    WHEN _xp >= 300  THEN 'prata'::gamification_level
    ELSE 'bronze'::gamification_level
  END;

  INSERT INTO gamification_user_stats (
    user_id, xp, level, current_score, streak_no_rework, streak_on_time,
    total_activities, total_published, is_eligible, last_recalculated_at, updated_at
  ) VALUES (
    _user_id, _xp, _level, _snap.score, _streak_rework, _streak_ontime,
    _activity_count, _published, true, now(), now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    xp = EXCLUDED.xp,
    level = EXCLUDED.level,
    current_score = EXCLUDED.current_score,
    streak_no_rework = EXCLUDED.streak_no_rework,
    streak_on_time = EXCLUDED.streak_on_time,
    total_activities = EXCLUDED.total_activities,
    total_published = EXCLUDED.total_published,
    is_eligible = true,
    last_recalculated_at = now(),
    updated_at = now();

  -- Award badges
  FOR _badge IN SELECT * FROM gamification_badges WHERE is_active = true LOOP
    IF (
      (_badge.criterion_type = 'total_activities' AND _activity_count >= _badge.criterion_value) OR
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

-- Atualiza recalc_all para varrer TODOS os perfis com first_login_at, não só quem tem snapshot
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
  -- Limpa quem nunca logou
  DELETE FROM gamification_user_stats
  WHERE user_id IN (
    SELECT user_id FROM profiles WHERE first_login_at IS NULL
  );

  -- Recalcula para todos os perfis que já logaram
  FOR _uid IN
    SELECT user_id FROM profiles WHERE first_login_at IS NOT NULL
  LOOP
    PERFORM recalc_user_gamification(_uid);
    _count := _count + 1;
  END LOOP;
  RETURN _count;
END;
$$;

-- Limpeza imediata: remove do ranking quem está com 0 atividades ou nunca logou
DELETE FROM gamification_user_stats
WHERE user_id IN (
  SELECT s.user_id
  FROM gamification_user_stats s
  LEFT JOIN profiles p ON p.user_id = s.user_id
  WHERE p.first_login_at IS NULL OR s.total_activities = 0
);
