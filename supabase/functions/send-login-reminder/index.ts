import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const CC_RECIPIENTS = ['juanpablorj@gmail.com', 'rapha.araujo.cultura@gmail.com'];

function buildReminderHtml(name: string, email: string, loginUrl: string): string {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html dir="ltr" lang="pt-BR">
  <head>
    <meta content="width=device-width" name="viewport" />
    <meta content="text/html; charset=UTF-8" http-equiv="Content-Type" />
  </head>
  <body style="margin:0;padding:0;background-color:#eef1f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Roboto','Helvetica Neue',sans-serif">
    <table border="0" width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:0;padding:40px 16px;background-color:#eef1f6">
      <tr>
        <td align="center">
          <table width="600" border="0" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 4px 24px rgba(30,58,110,0.10)">
            <!-- HEADER -->
            <tr>
              <td style="padding:32px 40px 28px;background:linear-gradient(135deg,#1e3a6e 0%,#2a7ab5 60%,#2d7a4f 100%)">
                <p style="margin:0 0 14px;font-size:10px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:rgba(255,255,255,0.65);font-family:'Courier New',monospace">
                  ATIS - Área de Tecnologia e Inovação Social | CEAP
                </p>
                <h1 style="margin:0;font-size:24px;line-height:1.3;font-weight:800;color:#ffffff;letter-spacing:-0.01em">
                  Lembrete: acesse o <span style="color:#7ed957">Diário de Bordo</span>
                </h1>
              </td>
            </tr>
            <!-- BRAND BAR -->
            <tr>
              <td style="padding:16px 40px;background-color:#ffffff;border-bottom:3px solid #4a9e3f">
                <table border="0" cellpadding="0" cellspacing="0"><tr>
                  <td style="font-size:22px;font-weight:800;color:#1e3a6e;font-family:'Helvetica Neue',Arial,sans-serif">GIRA</td>
                  <td style="padding:0 10px;font-size:20px;color:#cccccc">|</td>
                  <td style="font-size:14px;font-weight:700;color:#4a9e3f;font-family:'Helvetica Neue',Arial,sans-serif">Diário de Bordo</td>
                </tr></table>
              </td>
            </tr>
            <!-- BODY -->
            <tr>
              <td style="padding:32px 40px;background-color:#ffffff">
                <p style="margin:0 0 20px;font-size:15px;color:#555555;line-height:1.7">
                  Olá, <strong>${name}</strong>.
                </p>
                <p style="margin:0 0 20px;font-size:15px;color:#555555;line-height:1.7">
                  Notamos que você ainda não realizou seu primeiro acesso ao <strong>Diário de Bordo</strong>.
                  Sua conta já está configurada e pronta para uso.
                </p>
                <p style="margin:0 0 28px;font-size:15px;color:#555555;line-height:1.7">
                  É muito importante que você acesse o sistema para registrar suas atividades e contribuir com o acompanhamento do projeto.
                </p>

                <!-- INFO BOX -->
                <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin:0 0 24px;background-color:#f4f7fb;border:1px solid #dde4f0;border-left:4px solid #1e3a6e;border-radius:6px">
                  <tr>
                    <td style="padding:16px 20px">
                      <p style="margin:0 0 6px;font-size:10px;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;color:#888;font-family:'Courier New',monospace">Seu login</p>
                      <p style="margin:0;font-size:14px;color:#1e3a6e;font-weight:600;font-family:'Courier New',monospace">${email}</p>
                    </td>
                  </tr>
                </table>

                <p style="margin:0 0 8px;font-size:13px;color:#888;line-height:1.5">
                  Caso não lembre sua senha, utilize a opção "Esqueci minha senha" na tela de login ou entre em contato com a equipe ATIS.
                </p>

                <!-- CTA BUTTON -->
                <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin:24px 0 32px">
                  <tr>
                    <td align="center">
                      <a href="${loginUrl}" style="color:#ffffff;text-decoration:none;display:inline-block;background-color:#1e3a6e;font-weight:800;font-size:15px;letter-spacing:0.02em;padding:14px 40px;border-radius:6px" target="_blank">
                        Acessar o Diário de Bordo →
                      </a>
                    </td>
                  </tr>
                </table>

                <hr style="border:none;border-top:2px solid #eeeeee;margin:0 0 28px" />
                <p style="margin:0;font-size:13px;color:#888888;line-height:1.7">
                  Problemas para acessar? Entre em contato em
                  <a href="mailto:diario@giraerp.com.br" style="color:#4a9e3f;text-decoration:none;font-weight:700">diario@giraerp.com.br</a>
                  ou fale com a equipe ATIS.
                </p>
              </td>
            </tr>
            <!-- FOOTER -->
            <tr>
              <td align="center" style="padding:22px 40px;background-color:#1e3a6e;text-align:center">
                <p style="margin:0 0 6px;font-size:11px;font-weight:600;color:rgba(255,255,255,0.5);letter-spacing:0.15em;text-transform:uppercase;font-family:'Courier New',monospace">
                  GIRA | Diário de Bordo · CEAP
                </p>
                <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.35);line-height:1.6">
                  ATIS — Área de Tecnologia e Inovação Social<br/>
                  Este e-mail foi enviado automaticamente. Por favor, não responda.<br/>
                  © 2026 AnnITech - IT Solutions — Todos os direitos reservados.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user: callingUser } } = await supabaseClient.auth.getUser();
    if (!callingUser) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Check caller is admin
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', callingUser.id)
      .single();

    if (!roleData || (roleData.role !== 'admin' && roleData.role !== 'super_admin')) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();

    // Handle batch send
    if (body.action === 'send-batch') {
      const { users } = body as { action: string; users: Array<{ id: string; email: string; name: string }> };
      if (!users || users.length === 0) {
        return new Response(JSON.stringify({ error: 'No users provided' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const loginUrl = 'https://annireportpro.lovable.app/login';
      const results: Array<{ email: string; success: boolean; messageId?: string; error?: string }> = [];

      for (const u of users) {
        try {
          const html = buildReminderHtml(u.name || u.email.split('@')[0], u.email, loginUrl);

          const resendRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'GIRA Diário de Bordo <diario@giraerp.com.br>',
              to: [u.email],
              cc: CC_RECIPIENTS,
              subject: 'GIRA – Lembrete: acesse o Diário de Bordo',
              html,
            }),
          });

          const resendData = await resendRes.json();

          if (!resendRes.ok) {
            results.push({ email: u.email, success: false, error: resendData.message || 'Resend error' });
            continue;
          }

          // Log in login_reminders table
          await supabaseAdmin.from('login_reminders').insert({
            user_id: u.id,
            user_email: u.email,
            user_name: u.name,
            sent_by: callingUser.id,
            email_message_id: resendData.id || null,
          });

          results.push({ email: u.email, success: true, messageId: resendData.id });
        } catch (e) {
          results.push({ email: u.email, success: false, error: e.message });
        }
      }

      const sent = results.filter(r => r.success).length;

      // Log action
      await supabaseAdmin.from('system_logs').insert([{
        user_id: callingUser.id,
        action: 'login_reminder_sent',
        entity_type: 'batch',
        entity_id: 'login-reminders',
        new_data: { total: users.length, sent, failed: users.length - sent },
      }]);

      return new Response(JSON.stringify({ success: true, results, sent, total: users.length }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Single send
    const { userId, userEmail, userName } = body;
    if (!userId || !userEmail) {
      return new Response(JSON.stringify({ error: 'userId and userEmail are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const loginUrl = 'https://annireportpro.lovable.app/login';
    const displayName = userName || userEmail.split('@')[0];
    const html = buildReminderHtml(displayName, userEmail, loginUrl);

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'GIRA Diário de Bordo <diario@giraerp.com.br>',
        to: [userEmail],
        cc: CC_RECIPIENTS,
        subject: 'GIRA – Lembrete: acesse o Diário de Bordo',
        html,
      }),
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok) {
      throw new Error(resendData.message || 'Erro ao enviar e-mail');
    }

    // Log
    await supabaseAdmin.from('login_reminders').insert({
      user_id: userId,
      user_email: userEmail,
      user_name: displayName,
      sent_by: callingUser.id,
      email_message_id: resendData.id || null,
    });

    await supabaseAdmin.from('system_logs').insert([{
      user_id: callingUser.id,
      action: 'login_reminder_sent',
      entity_type: 'user',
      entity_id: userId,
      new_data: { email: userEmail, name: displayName },
    }]);

    return new Response(JSON.stringify({ success: true, messageId: resendData.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('send-login-reminder error:', e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
