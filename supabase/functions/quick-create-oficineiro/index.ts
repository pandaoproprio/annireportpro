import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function generateSecurePassword(length = 14): string {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  const special = '!@#$%&*?';
  const all = upper + lower + digits + special;
  const mandatory = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    digits[Math.floor(Math.random() * digits.length)],
    special[Math.floor(Math.random() * special.length)],
  ];
  const remaining = Array.from({ length: length - mandatory.length }, () =>
    all[Math.floor(Math.random() * all.length)]
  );
  const chars = [...mandatory, ...remaining];
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Validate caller
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user: caller }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !caller) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Check caller has permission: super_admin/admin OR coordenador
    const { data: roles } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id);
    const callerRoles = (roles || []).map((r: any) => r.role);
    const allowed = callerRoles.some((r: string) =>
      r === 'super_admin' || r === 'admin' || r === 'coordenador'
    );
    if (!allowed) {
      return new Response(JSON.stringify({ error: 'forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const funcao = String(body.funcao || '').trim();

    if (!name || !email || !email.includes('@')) {
      return new Response(JSON.stringify({ error: 'Nome e e-mail válidos são obrigatórios' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user already exists
    const { data: existingProfile } = await admin
      .from('profiles')
      .select('user_id, name, email')
      .eq('email', email)
      .maybeSingle();

    if (existingProfile) {
      return new Response(JSON.stringify({
        success: true,
        existed: true,
        user: existingProfile,
      }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create user with temp password
    const tempPassword = generateSecurePassword(14);
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { name, funcao },
    });
    if (createErr || !created.user) {
      return new Response(JSON.stringify({ error: createErr?.message || 'Erro ao criar usuário' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const newUserId = created.user.id;

    // Ensure profile + role oficineiro (handle_new_user trigger creates with usuario by default)
    await admin.from('profiles').upsert({
      user_id: newUserId,
      email,
      name,
    }, { onConflict: 'user_id' });

    await admin.from('user_roles').delete().eq('user_id', newUserId);
    await admin.from('user_roles').insert({ user_id: newUserId, role: 'oficineiro' });

    // Repopulate default permissions for oficineiro
    await admin.rpc('populate_default_permissions', {
      _user_id: newUserId, _role: 'oficineiro',
    });

    // Generate password recovery link and try to send welcome email
    let resetUrl: string | undefined;
    try {
      const origin = req.headers.get('origin') || 'https://relatorios.giraerp.com.br';
      const { data: linkData } = await admin.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: { redirectTo: `${origin}/reset-password` },
      });
      resetUrl = linkData?.properties?.action_link;
    } catch (e) {
      console.warn('[quick-create-oficineiro] generateLink failed', e);
    }

    // Try sending a welcome email via existing send-welcome-email function (best-effort)
    try {
      await admin.functions.invoke('send-welcome-email', {
        body: { email, name, resetUrl, role: 'oficineiro' },
      });
    } catch (e) {
      console.warn('[quick-create-oficineiro] welcome email failed', e);
    }

    return new Response(JSON.stringify({
      success: true,
      existed: false,
      user: { user_id: newUserId, name, email, role: 'oficineiro' },
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'unexpected_error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
