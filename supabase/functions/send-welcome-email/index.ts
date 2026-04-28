const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function buildHtml(name: string, email: string, password: string, loginUrl: string): string {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html dir="ltr" lang="en">
  <head>
    <meta content="width=device-width" name="viewport" />
    <meta content="text/html; charset=UTF-8" http-equiv="Content-Type" />
    <meta name="x-apple-disable-message-reformatting" />
    <meta content="IE=edge" http-equiv="X-UA-Compatible" />
    <meta content="telephone=no,address=no,email=no,date=no,url=no" name="format-detection" />
  </head>
  <body>
    <div style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0" data-skip-in-text="true">
      Seu acesso ao sistema está pronto. Confira as credenciais.
    </div>
    <table border="0" width="100%" cellpadding="0" cellspacing="0" role="presentation" align="center">
      <tbody><tr><td>
        <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Roboto','Oxygen','Ubuntu','Cantarell','Fira Sans','Droid Sans','Helvetica Neue',sans-serif;font-size:16px;min-height:100%;line-height:155%">
          <tbody><tr><td>
            <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Roboto','Oxygen','Ubuntu','Cantarell','Fira Sans','Droid Sans','Helvetica Neue',sans-serif">
              <tbody><tr><td>
                <div style="margin:0;padding:0;display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0">
                  <p style="margin:0;padding:0;font-size:1em;padding-top:0.5em;padding-bottom:0.5em">
                    <span>Seu acesso ao sistema está pronto. Confira as credenciais.</span>
                  </p>
                </div>
                <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin:0;padding:40px 16px;background-color:#eef1f6">
                  <tbody><tr><td>
                    <tr style="margin:0;padding:0">
                      <td align="center" data-id="__react-email-column" style="margin:0;padding:0">
                        <table width="600" border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin:0;padding:0;max-width:600px;width:100%;background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 4px 24px rgba(30,58,110,0.10)">
                          <tbody><tr><td>
                            <!-- HEADER GRADIENT -->
                            <tr style="margin:0;padding:0">
                              <td data-id="__react-email-column" style="margin:0;padding:32px 40px 28px 40px;background:linear-gradient(135deg,#1e3a6e 0%,#2a7ab5 60%,#2d7a4f 100%)">
                                <p style="margin:0 0 14px 0;padding:0;font-size:10px;padding-top:0.5em;padding-bottom:0.5em;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:rgba(255,255,255,0.65);font-family:'Courier New',Courier,monospace">
                                  <span>ATIS - Área de Tecnologia e Inovação Social | CEAP</span>
                                </p>
                                <h1 style="margin:0;padding:0;font-size:26px;line-height:1.3;padding-top:0.389em;font-weight:800;color:#ffffff;letter-spacing:-0.01em">
                                  <span>Acesso criado.</span><br /><span>Bem-vindo ao </span><span style="color:#7ed957">Diário de Bordo.</span>
                                </h1>
                              </td>
                            </tr>
                            <!-- BRAND BAR -->
                            <tr style="margin:0;padding:0">
                              <td data-id="__react-email-column" style="margin:0;padding:16px 40px;background-color:#ffffff;border-bottom:3px solid #4a9e3f">
                                <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin:0;padding:0">
                                  <tbody><tr><td>
                                    <tr style="margin:0;padding:0">
                                      <td data-id="__react-email-column" style="margin:0;padding:0;font-size:22px;font-weight:800;color:#1e3a6e;letter-spacing:-0.02em;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">
                                        <p style="margin:0;padding:0;font-size:1em;padding-top:0.5em;padding-bottom:0.5em"><span>GIRA</span></p>
                                      </td>
                                      <td data-id="__react-email-column" style="margin:0;padding:0 10px;font-size:20px;color:#cccccc;font-weight:300">
                                        <p style="margin:0;padding:0;font-size:1em;padding-top:0.5em;padding-bottom:0.5em"><span>|</span></p>
                                      </td>
                                      <td data-id="__react-email-column" style="margin:0;padding:0;font-size:14px;font-weight:700;color:#4a9e3f;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">
                                        <p style="margin:0;padding:0;font-size:1em;padding-top:0.5em;padding-bottom:0.5em"><span>Diário de Bordo</span></p>
                                      </td>
                                    </tr>
                                  </td></tr></tbody>
                                </table>
                              </td>
                            </tr>
                            <!-- BODY CONTENT -->
                            <tr style="margin:0;padding:0">
                              <td data-id="__react-email-column" style="margin:0;padding:32px 40px;background-color:#ffffff">
                                <p style="margin:0 0 28px 0;padding:0;font-size:15px;padding-top:0.5em;padding-bottom:0.5em;color:#555555;line-height:1.7">
                                  <span>Olá, </span><span><strong>${name}</strong></span><span>.</span><br /><br />
                                  <span>Seu acesso à plataforma foi configurado. Utilize as credenciais abaixo para realizar seu primeiro login.</span>
                                </p>
                                <p style="margin:0 0 10px 0;padding:0;font-size:10px;padding-top:0.5em;padding-bottom:0.5em;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;color:#999999;font-family:'Courier New',Courier,monospace">
                                  <span>Suas credenciais de acesso</span>
                                </p>
                                <!-- CREDENTIALS BOX -->
                                <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 24px 0;padding:0;background-color:#f4f7fb;border:1px solid #dde4f0;border-left:4px solid #1e3a6e;border-radius:6px">
                                  <tbody><tr><td>
                                    <tr style="margin:0;padding:0">
                                      <td data-id="__react-email-column" style="margin:0;padding:20px 24px">
                                        <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 12px 0;padding:0">
                                          <tbody><tr><td>
                                            <tr style="margin:0;padding:0">
                                              <td data-id="__react-email-column" style="margin:0;padding:0;font-size:10px;color:#888888;text-transform:uppercase;letter-spacing:0.12em;font-family:'Courier New',Courier,monospace;width:72px;vertical-align:baseline;padding-right:14px">
                                                <p style="margin:0;padding:0;font-size:1em;padding-top:0.5em;padding-bottom:0.5em"><span>Login</span></p>
                                              </td>
                                              <td data-id="__react-email-column" style="margin:0;padding:0;font-size:14px;color:#1e3a6e;font-weight:600;font-family:'Courier New',Courier,monospace;vertical-align:baseline">
                                                <p style="margin:0;padding:0;font-size:1em;padding-top:0.5em;padding-bottom:0.5em"><span>${email}</span></p>
                                              </td>
                                            </tr>
                                          </td></tr></tbody>
                                        </table>
                                        <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin:0;padding:0">
                                          <tbody><tr><td>
                                            <tr style="margin:0;padding:0">
                                              <td data-id="__react-email-column" style="margin:0;padding:0;font-size:10px;color:#888888;text-transform:uppercase;letter-spacing:0.12em;font-family:'Courier New',Courier,monospace;width:72px;vertical-align:baseline;padding-right:14px">
                                                <p style="margin:0;padding:0;font-size:1em;padding-top:0.5em;padding-bottom:0.5em"><span>Senha</span></p>
                                              </td>
                                              <td data-id="__react-email-column" style="margin:0;padding:0;font-size:17px;color:#4a9e3f;font-weight:700;letter-spacing:0.06em;font-family:'Courier New',Courier,monospace;vertical-align:baseline">
                                                <p style="margin:0;padding:0;font-size:1em;padding-top:0.5em;padding-bottom:0.5em"><span>${password}</span></p>
                                              </td>
                                            </tr>
                                          </td></tr></tbody>
                                        </table>
                                      </td>
                                    </tr>
                                  </td></tr></tbody>
                                </table>
                                <!-- WARNING BOX -->
                                <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 28px 0;padding:0;background-color:#fffbf0;border:1px solid #ffe3a0;border-left:4px solid #f0a500;border-radius:6px">
                                  <tbody><tr><td>
                                    <tr style="margin:0;padding:0">
                                      <td data-id="__react-email-column" style="margin:0;padding:13px 18px;font-size:13px;color:#7a5a10;line-height:1.6">
                                        <p style="margin:0;padding:0;font-size:1em;padding-top:0.5em;padding-bottom:0.5em">
                                          <span><strong>Atenção:</strong></span><span> Esta é uma senha temporária. Por segurança, você será solicitado a criar uma nova senha no primeiro acesso.</span>
                                        </p>
                                      </td>
                                    </tr>
                                  </td></tr></tbody>
                                </table>
                                <!-- CTA BUTTON -->
                                <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 32px 0;padding:0">
                                  <tbody><tr><td>
                                    <tr style="margin:0;padding:0">
                                      <td align="center" data-id="__react-email-column" style="margin:0;padding:0">
                                        <p style="margin:0 0 14px 0;padding:0;font-size:10px;padding-top:0.5em;padding-bottom:0.5em;letter-spacing:0.18em;text-transform:uppercase;color:#aaaaaa;font-family:'Courier New',Courier,monospace">
                                          <span>Acesse agora</span>
                                        </p>
                                        <p style="margin:0;padding:0;font-size:1em;padding-top:0.5em;padding-bottom:0.5em">
                                          <span><a href="${loginUrl}" rel="noopener noreferrer nofollow" style="color:#ffffff;text-decoration:none;display:inline-block;background-color:#1e3a6e;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-weight:800;font-size:15px;letter-spacing:0.02em;padding:14px 40px;border-radius:6px" target="_blank">Acessar o Diário de Bordo →</a></span>
                                        </p>
                                        <p style="margin:14px 0 0 0;padding:0;font-size:11px;padding-top:0.5em;padding-bottom:0.5em;color:#aaaaaa;font-family:'Courier New',Courier,monospace;word-break:break-all">
                                          <span>Ou copie o link: </span><span><a href="${loginUrl}" rel="noopener noreferrer nofollow" style="color:#2a7ab5;text-decoration:underline" target="_blank"><u>${loginUrl}</u></a></span>
                                        </p>
                                      </td>
                                    </tr>
                                  </td></tr></tbody>
                                </table>
                                <hr style="width:100%;border:none;border-top:1px solid #eeeeee;padding-bottom:1em;border-width:2px;margin:0 0 28px 0" />
                                <p style="margin:0;padding:0;font-size:13px;padding-top:0.5em;padding-bottom:0.5em;color:#888888;line-height:1.7">
                                  <span>Problemas para acessar? Entre em contato com o suporte em </span>
                                  <span><a href="mailto:diario@giraerp.com.br" rel="noopener noreferrer nofollow" style="color:#4a9e3f;text-decoration:none;font-weight:700" target="_blank">diario@giraerp.com.br</a></span>
                                  <span> ou fale com a equipe ATIS.</span>
                                </p>
                              </td>
                            </tr>
                            <!-- FOOTER -->
                            <tr style="margin:0;padding:0">
                              <td align="center" data-id="__react-email-column" style="margin:0;padding:22px 40px;background-color:#1e3a6e;text-align:center">
                                <p style="margin:0 0 6px 0;padding:0;font-size:11px;padding-top:0.5em;padding-bottom:0.5em;font-weight:600;color:rgba(255,255,255,0.5);letter-spacing:0.15em;text-transform:uppercase;font-family:'Courier New',Courier,monospace">
                                  <span>GIRA | Diário de Bordo · CEAP</span>
                                </p>
                                <p style="margin:0;padding:0;font-size:11px;padding-top:0.5em;padding-bottom:0.5em;color:rgba(255,255,255,0.35);line-height:1.6">
                                  <span>ATIS — Área de Tecnologia e Inovação Social</span><br />
                                  <span>Este e-mail foi enviado automaticamente. Por favor, não responda.</span><br />
                                  <span>© 2026 AnnITech - IT Solutions — Todos os direitos reservados.</span>
                                </p>
                              </td>
                            </tr>
                          </td></tr></tbody>
                        </table>
                      </td>
                    </tr>
                  </td></tr></tbody>
                </table>
              </td></tr></tbody>
            </table>
          </td></tr></tbody>
        </table>
      </td></tr></tbody>
    </table>
  </body>
</html>`;
}

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

    const brevoApiKey = Deno.env.get('BREVO_API_KEY');
    if (!brevoApiKey) {
      return new Response(
        JSON.stringify({ error: 'BREVO_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const displayName = name || to.split('@')[0];
    const htmlContent = buildHtml(displayName, to, password, loginUrl);

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': brevoApiKey,
        'Content-Type': 'application/json',
        'accept': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'GIRA Diário de Bordo', email: 'diario@giraerp.com.br' },
        to: [{ email: to, name: displayName }],
        subject: 'GIRA – Suas credenciais de acesso ao Diário de Bordo',
        htmlContent,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Brevo API error:', result);
      return new Response(
        JSON.stringify({ error: result.message || 'Erro ao enviar e-mail via Brevo' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: `E-mail enviado para ${to}`, message_id: result.messageId }),
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
