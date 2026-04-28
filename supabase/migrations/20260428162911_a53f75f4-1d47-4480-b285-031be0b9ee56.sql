UPDATE public.profiles
SET login_attempts_without_change = 0,
    first_login_at = NULL
WHERE email = 'olhardaperifa@gmail.com';