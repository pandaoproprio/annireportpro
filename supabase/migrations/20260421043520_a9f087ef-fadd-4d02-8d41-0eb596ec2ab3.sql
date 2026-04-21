
CREATE OR REPLACE FUNCTION public.recalc_user_gamification(_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _xp INTEGER := 0;
  _level gamification_level;
  _badge RECORD;
  _first_login TIMESTAMPTZ;
  _is_admin BOOLEAN;
  _activities_pub INTEGER := 0;
  _team_reports_pub INTEGER := 0;
  _just_reports_pub INTEGER := 0;
  _asana_done INTEGER := 0;
  _total_published INTEGER := 0;
  _streak_rework INTEGER := 0;
  _streak_ontime INTEGER := 0;
  _latest_score NUMERIC := 0;
BEGIN
  -- 1) Precisa ter logado
  SELECT first_login_at INTO _first_login
  FROM profiles WHERE user_id = _user_id LIMIT 1;

  IF _first_login IS NULL THEN
    DELETE FROM gamification_user_stats WHERE user_id = _user_id;
    DELETE FROM gamification_user_badges WHERE user_id = _user_id;
    RETURN;
  END IF;

  -- 2) Excluir admins e super_admins
  SELECT EXISTS(
    SELECT 1 FROM user_roles
    WHERE user_id = _user_id AND role IN ('super_admin','admin')
  ) INTO _is_admin;

  IF _is_admin THEN
    DELETE FROM gamification_user_stats WHERE user_id = _user_id;
    DELETE FROM gamification_user_badges WHERE user_id = _user_id;
    RETURN;
  END IF;

  -- 3) Contar as 4 fontes (histórico total)
  SELECT COUNT(*) INTO _activities_pub
  FROM activities
  WHERE user_id = _user_id AND is_draft = false AND deleted_at IS NULL;

  SELECT COUNT(*) INTO _team_reports_pub
  FROM team_reports
  WHERE user_id = _user_id AND is_draft = false AND deleted_at IS NULL;

  SELECT COUNT(*) INTO _just_reports_pub
  FROM justification_reports
  WHERE user_id = _user_id AND is_draft = false AND deleted_at IS NULL;

  SELECT COALESCE(SUM(tasks_completed), 0) INTO _asana_done
  FROM monitoring_asana_snapshots
  WHERE mapped_user_id = _user_id;

  _total_published := _team_reports_pub + _just_reports_pub;

  -- 4) Calcular XP pelas regras: 10/25/25/5
  _xp := (_activities_pub * 10)
       + (_team_reports_pub * 25)
       + (_just_reports_pub * 25)
       + (_asana_done * 5);

  -- 5) Sem nenhum ponto = sai do ranking
  IF _xp = 0 THEN
    DELETE FROM gamification_user_stats WHERE user_id = _user_id;
    DELETE FROM gamification_user_badges WHERE user_id = _user_id;
    RETURN;
  END IF;

  -- 6) Nível por XP
  _level := CASE
    WHEN _xp >= 5000 THEN 'lendario'::gamification_level
    WHEN _xp >= 2500 THEN 'diamante'::gamification_level
    WHEN _xp >= 1000 THEN 'ouro'::gamification_level
    WHEN _xp >= 300  THEN 'prata'::gamification_level
    ELSE 'bronze'::gamification_level
  END;

  -- 7) Streaks (mantidos para badges, mas não influenciam XP)
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

  SELECT COALESCE(score, 0) INTO _latest_score
  FROM user_productivity_snapshots
  WHERE user_id = _user_id
  ORDER BY snapshot_date DESC LIMIT 1;

  -- 8) Upsert
  INSERT INTO gamification_user_stats (
    user_id, xp, level, current_score, streak_no_rework, streak_on_time,
    total_activities, total_published, is_eligible, last_recalculated_at, updated_at
  ) VALUES (
    _user_id, _xp, _level, _latest_score, _streak_rework, _streak_ontime,
    _activities_pub, _total_published, true, now(), now()
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

  -- 9) Badges (com base nas mesmas fontes)
  FOR _badge IN SELECT * FROM gamification_badges WHERE is_active = true LOOP
    IF (
      (_badge.criterion_type = 'total_activities' AND _activities_pub >= _badge.criterion_value) OR
      (_badge.criterion_type = 'total_published' AND _total_published >= _badge.criterion_value) OR
      (_badge.criterion_type = 'streak_no_rework' AND _streak_rework >= _badge.criterion_value) OR
      (_badge.criterion_type = 'streak_on_time' AND _streak_ontime >= _badge.criterion_value) OR
      (_badge.criterion_type = 'current_score' AND _latest_score >= _badge.criterion_value)
    ) THEN
      INSERT INTO gamification_user_badges (user_id, badge_id)
      VALUES (_user_id, _badge.id)
      ON CONFLICT (user_id, badge_id) DO NOTHING;
    END IF;
  END LOOP;
END;
$$;

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
  -- Limpa quem é admin ou nunca logou
  DELETE FROM gamification_user_stats
  WHERE user_id IN (
    SELECT p.user_id FROM profiles p
    LEFT JOIN user_roles r ON r.user_id = p.user_id
    WHERE p.first_login_at IS NULL OR r.role IN ('super_admin','admin')
  );

  -- Recalcula todos os perfis que já logaram e não são admin
  FOR _uid IN
    SELECT p.user_id FROM profiles p
    WHERE p.first_login_at IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM user_roles r
        WHERE r.user_id = p.user_id AND r.role IN ('super_admin','admin')
      )
  LOOP
    PERFORM recalc_user_gamification(_uid);
    _count := _count + 1;
  END LOOP;
  RETURN _count;
END;
$$;
