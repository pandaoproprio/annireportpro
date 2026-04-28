import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const INSTITUTIONAL_BCC = ['juanpablorj@gmail.com', 'rapha.araujo.cultura@gmail.com'];

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey) {
    return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const {
      voluntarioNome,
      voluntarioEmail,
      pdfBase64,
      hash,
      termoId,
      publicToken,
      formTitle,
      assinadoEm,
    } = await req.json();

    if (!voluntarioEmail || !pdfBase64 || !hash || !termoId) {
      return new Response(JSON.stringify({ error: 'Campos obrigatórios ausentes' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const verifyUrl = `https://relatorios.giraerp.com.br/voluntario/termo/${publicToken}`;
    const dataFmt = assinadoEm
      ? new Date(assinadoEm).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' })
      : new Date().toLocaleString('pt-BR');

    const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <body style="font-family: Arial, sans-serif; background:#f5f5f5; padding:20px; margin:0;">
        <div style="max-width:600px; margin:0 auto; background:#fff; border-radius:12px; padding:32px; box-shadow:0 2px 8px rgba(0,0,0,0.06);">
          <h1 style="color:#2E7D32; font-size:22px; margin:0 0 8px;">Termo de Compromisso de Serviço Voluntário</h1>
          <p style="color:#555; font-size:13px; margin:0 0 24px;">${formTitle || 'GIRA Forms'}</p>

          <p style="color:#1a1a1a; font-size:15px; line-height:1.6;">
            Olá <strong>${voluntarioNome || 'Voluntário(a)'}</strong>,<br/><br/>
            Recebemos sua adesão como voluntário(a) e seu Termo de Compromisso foi assinado eletronicamente
            em <strong>${dataFmt}</strong>. Em anexo está a via PDF do documento.
          </p>

          <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:16px; margin:24px 0;">
            <p style="margin:0 0 4px; font-size:12px; color:#166534; font-weight:600;">Hash de integridade SHA-256</p>
            <p style="margin:0; font-family:monospace; font-size:11px; color:#14532d; word-break:break-all;">${hash}</p>
          </div>

          <p style="color:#1a1a1a; font-size:14px; line-height:1.6;">
            Você pode verificar a autenticidade e baixar o documento a qualquer momento em:
          </p>
          <p style="text-align:center; margin:24px 0;">
            <a href="${verifyUrl}" style="display:inline-block; background:#2E7D32; color:#fff; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:600;">
              Verificar autenticidade
            </a>
          </p>

          <hr style="border:0; border-top:1px solid #e5e7eb; margin:32px 0 16px;"/>
          <p style="color:#888; font-size:11px; line-height:1.5; margin:0;">
            Este e-mail foi enviado automaticamente pelo GIRA Forms em conformidade com a
            Lei nº 9.608/1998 (Voluntariado), Lei nº 13.709/2020 (LGPD) e MP 2.200-2/2001
            (assinatura eletrônica). Não responda a este e-mail.
          </p>
        </div>
      </body>
      </html>
    `;

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'GIRA Forms <diario@giraerp.com.br>',
        to: [voluntarioEmail],
        bcc: INSTITUTIONAL_BCC,
        subject: 'Seu Termo de Compromisso de Voluntariado — GIRA Forms',
        html,
        attachments: [
          {
            filename: `termo-voluntariado-${termoId.slice(0, 8)}.pdf`,
            content: pdfBase64,
          },
        ],
      }),
    });

    const resendData = await resendRes.json();
    if (!resendRes.ok) {
      console.error('Resend error:', resendData);
      throw new Error(resendData.message || JSON.stringify(resendData));
    }

    return new Response(JSON.stringify({ success: true, id: resendData.id }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('send-volunteer-term error:', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
