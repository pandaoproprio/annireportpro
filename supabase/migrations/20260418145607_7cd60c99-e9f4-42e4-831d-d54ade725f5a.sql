-- Cria usuário "organizador" com senha bcrypt para acesso ao painel de check-in
DO $$
DECLARE
  _user_id uuid := gen_random_uuid();
  _email text := 'organizador@nossagente.local';
  _existing_id uuid;
BEGIN
  -- Verifica se já existe
  SELECT id INTO _existing_id FROM auth.users WHERE email = _email LIMIT 1;
  IF _existing_id IS NOT NULL THEN
    -- Atualiza a senha caso já exista
    UPDATE auth.users
    SET encrypted_password = crypt('Nossagente2026', gen_salt('bf')),
        email_confirmed_at = COALESCE(email_confirmed_at, now()),
        updated_at = now()
    WHERE id = _existing_id;
    RAISE NOTICE 'Usuário organizador já existia. Senha atualizada.';
    RETURN;
  END IF;

  -- Insere em auth.users
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, email_change,
    email_change_token_new, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    _user_id,
    'authenticated',
    'authenticated',
    _email,
    crypt('Nossagente2026', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Organizador Nossa Gente"}'::jsonb,
    now(), now(), '', '', '', ''
  );

  -- Insere identity correspondente
  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(),
    _user_id,
    jsonb_build_object('sub', _user_id::text, 'email', _email, 'email_verified', true),
    'email',
    _user_id::text,
    now(), now(), now()
  );
END $$;