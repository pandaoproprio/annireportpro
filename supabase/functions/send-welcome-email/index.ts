import { sendLovableEmail } from 'npm:@lovable.dev/email-js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SITE_NAME = "GIRA";
const SENDER_DOMAIN = "notify.relatorios.giraerp.com.br";
const FROM_DOMAIN = "relatorios.giraerp.com.br";

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, name, password, loginUrl } = await req.json();

    if (!to || !password || !loginUrl) {
      return new Response(
        JSON.stringify({ error: 'Campos obrigatórios: to, password, loginUrl' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const displayName = name || to.split('@')[0];

    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:'DM Sans',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
        <tr>
          <td style="background:linear-gradient(135deg,#0DA3E7,#0b8fd0);padding:32px 40px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">GIRA – Diário de Bordo</h1>
            <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">Bem-vindo(a) ao sistema</p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px;">
            <p style="margin:0 0 16px;color:#1a1a1a;font-size:15px;">Olá, <strong>${displayName}</strong>!</p>
            <p style="margin:0 0 24px;color:#555;font-size:14px;line-height:1.6;">
              Seu acesso ao <strong>Diário de Bordo do GIRA</strong> foi criado. Utilize as credenciais abaixo para realizar seu primeiro login:
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;margin-bottom:24px;">
              <tr><td style="padding:20px 24px;">
                <p style="margin:0 0 10px;font-size:13px;color:#0369a1;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Suas credenciais</p>
                <table cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:4px 0;color:#555;font-size:14px;width:80px;">E-mail:</td>
                    <td style="padding:4px 0;color:#1a1a1a;font-size:14px;font-weight:600;">${to}</td>
                  </tr>
                  <tr>
                    <td style="padding:4px 0;color:#555;font-size:14px;">Senha:</td>
                    <td style="padding:4px 0;color:#1a1a1a;font-size:14px;font-weight:600;font-family:monospace;">${password}</td>
                  </tr>
                </table>
              </td></tr>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center" style="padding:4px 0 28px;">
                <a href="${loginUrl}" target="_blank" style="display:inline-block;background:#0DA3E7;color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:15px;font-weight:600;">
                  Acessar o Diário de Bordo
                </a>
              </td></tr>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef3c7;border:1px solid #fde68a;border-radius:8px;">
              <tr><td style="padding:16px 20px;">
                <p style="margin:0;color:#92400e;font-size:13px;line-height:1.5;">
                  ⚠️ <strong>Importante:</strong> Ao realizar o primeiro login, você será solicitado(a) a alterar sua senha por uma de sua preferência. Não compartilhe essas credenciais com terceiros.
                </p>
              </td></tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px;border-top:1px solid #e5e7eb;text-align:center;">
            <p style="margin:0;color:#9ca3af;font-size:12px;">
              Este e-mail foi enviado automaticamente pelo sistema GIRA.<br/>
              Em caso de dúvidas, entre em contato com a administração do projeto.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const run_id = crypto.randomUUID();

    const result = await sendLovableEmail(
      {
        run_id,
        to,
        from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
        sender_domain: SENDER_DOMAIN,
        subject: 'GIRA – Suas credenciais de acesso ao Diário de Bordo',
        html,
        text: `Olá ${displayName}, seu acesso ao Diário de Bordo do GIRA foi criado. E-mail: ${to} | Senha: ${password} | Acesse: ${loginUrl}`,
        purpose: 'transactional',
      },
      { apiKey }
    );

    return new Response(
      JSON.stringify({ success: true, message: `E-mail enviado para ${to}`, message_id: result.message_id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Function error:', error);
    const message = error instanceof Error ? error.message : 'Erro interno';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
