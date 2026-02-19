
-- ============================================
-- FASE 1B: Migrate data + update trigger
-- ============================================

-- 1. Populate permissions based on CURRENT roles before migrating
-- For 'user' role -> dashboard only
INSERT INTO public.user_permissions (user_id, permission)
SELECT ur.user_id, p.permission
FROM public.user_roles ur
CROSS JOIN (VALUES ('dashboard'::public.app_permission)) AS p(permission)
WHERE ur.role = 'user'
ON CONFLICT (user_id, permission) DO NOTHING;

-- For 'oficineiro' role -> dashboard + diary
INSERT INTO public.user_permissions (user_id, permission)
SELECT ur.user_id, p.permission
FROM public.user_roles ur
CROSS JOIN (VALUES ('dashboard'::public.app_permission), ('diary'::public.app_permission)) AS p(permission)
WHERE ur.role = 'oficineiro'
ON CONFLICT (user_id, permission) DO NOTHING;

-- For 'admin' role -> dashboard, diary, report_object, report_team
INSERT INTO public.user_permissions (user_id, permission)
SELECT ur.user_id, p.permission
FROM public.user_roles ur
CROSS JOIN (VALUES ('dashboard'::public.app_permission), ('diary'::public.app_permission), ('report_object'::public.app_permission), ('report_team'::public.app_permission)) AS p(permission)
WHERE ur.role = 'admin'
ON CONFLICT (user_id, permission) DO NOTHING;

-- super_admin doesn't need permissions (bypasses via has_permission)

-- 2. Migrate roles: user -> usuario, oficineiro -> usuario
UPDATE public.user_roles SET role = 'usuario' WHERE role = 'user';
UPDATE public.user_roles SET role = 'usuario' WHERE role = 'oficineiro';

-- 3. Create populate_default_permissions function
CREATE OR REPLACE FUNCTION public.populate_default_permissions(_user_id uuid, _role public.app_role)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  DELETE FROM public.user_permissions WHERE user_id = _user_id;

  IF _role = 'super_admin' THEN
    NULL; -- bypass via has_permission
  ELSIF _role = 'admin' THEN
    INSERT INTO public.user_permissions (user_id, permission) VALUES
      (_user_id, 'dashboard'), (_user_id, 'diary'), (_user_id, 'report_object'), (_user_id, 'report_team');
  ELSIF _role = 'analista' THEN
    INSERT INTO public.user_permissions (user_id, permission) VALUES
      (_user_id, 'dashboard'), (_user_id, 'diary'), (_user_id, 'report_object'), (_user_id, 'report_team');
  ELSIF _role = 'usuario' THEN
    INSERT INTO public.user_permissions (user_id, permission) VALUES
      (_user_id, 'dashboard');
  END IF;
END;
$$;

-- 4. Update handle_new_user trigger to use 'usuario'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', SPLIT_PART(NEW.email, '@', 1))
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'usuario');

  PERFORM public.populate_default_permissions(NEW.id, 'usuario');

  RETURN NEW;
END;
$$;
