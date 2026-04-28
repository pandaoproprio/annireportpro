
-- 1) Backfill: para todo team_member com user_id, garantir collaborator nos projetos vinculados
INSERT INTO public.project_collaborators (user_id, project_id, added_by)
SELECT DISTINCT tm.user_id, ptm.project_id, ptm.added_by
FROM public.project_team_members ptm
JOIN public.team_members tm ON tm.id = ptm.team_member_id
WHERE tm.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.project_collaborators pc
    WHERE pc.user_id = tm.user_id AND pc.project_id = ptm.project_id
  );

-- 2) Trigger: ao inserir em project_team_members, sincronizar project_collaborators
CREATE OR REPLACE FUNCTION public.sync_collaborator_on_team_link()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT user_id INTO v_user_id FROM public.team_members WHERE id = NEW.team_member_id;
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.project_collaborators (user_id, project_id, added_by)
    VALUES (v_user_id, NEW.project_id, NEW.added_by)
    ON CONFLICT (user_id, project_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_collaborator_on_team_link ON public.project_team_members;
CREATE TRIGGER trg_sync_collaborator_on_team_link
AFTER INSERT ON public.project_team_members
FOR EACH ROW EXECUTE FUNCTION public.sync_collaborator_on_team_link();

-- 3) Trigger: ao remover de project_team_members, remover collaborator correspondente
CREATE OR REPLACE FUNCTION public.unsync_collaborator_on_team_unlink()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_project_owner uuid;
BEGIN
  SELECT user_id INTO v_user_id FROM public.team_members WHERE id = OLD.team_member_id;
  SELECT user_id INTO v_project_owner FROM public.projects WHERE id = OLD.project_id;
  -- Não remover se o user é o próprio dono do projeto
  IF v_user_id IS NOT NULL AND v_user_id <> COALESCE(v_project_owner, '00000000-0000-0000-0000-000000000000'::uuid) THEN
    DELETE FROM public.project_collaborators
    WHERE user_id = v_user_id AND project_id = OLD.project_id;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_unsync_collaborator_on_team_unlink ON public.project_team_members;
CREATE TRIGGER trg_unsync_collaborator_on_team_unlink
AFTER DELETE ON public.project_team_members
FOR EACH ROW EXECUTE FUNCTION public.unsync_collaborator_on_team_unlink();

-- 4) Trigger: quando team_members.user_id é alterado, sincronizar todos os projetos
CREATE OR REPLACE FUNCTION public.sync_collaborator_on_user_link_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Se user_id antigo existia e mudou, remover dos projetos vinculados
  IF OLD.user_id IS NOT NULL AND OLD.user_id IS DISTINCT FROM NEW.user_id THEN
    DELETE FROM public.project_collaborators pc
    USING public.project_team_members ptm
    WHERE ptm.team_member_id = NEW.id
      AND pc.project_id = ptm.project_id
      AND pc.user_id = OLD.user_id;
  END IF;
  -- Se novo user_id, adicionar a todos os projetos vinculados
  IF NEW.user_id IS NOT NULL AND NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    INSERT INTO public.project_collaborators (user_id, project_id, added_by)
    SELECT NEW.user_id, ptm.project_id, ptm.added_by
    FROM public.project_team_members ptm
    WHERE ptm.team_member_id = NEW.id
    ON CONFLICT (user_id, project_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_collaborator_on_user_link_change ON public.team_members;
CREATE TRIGGER trg_sync_collaborator_on_user_link_change
AFTER UPDATE OF user_id ON public.team_members
FOR EACH ROW EXECUTE FUNCTION public.sync_collaborator_on_user_link_change();
