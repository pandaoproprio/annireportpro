import { supabase } from '@/integrations/supabase/client';
import { buildSignedTerm } from './buildTerm';
import type { OrgLegalSettings, VolunteerData, SignedTermResult } from './types';

interface SignAndPersistInput {
  org: OrgLegalSettings;
  volunteer: VolunteerData;
  formId: string;
  formTitle?: string;
  formResponseId: string | null; // null se a resposta ainda não foi gravada
  metodo: 'canvas' | 'digitado';
  signatureImage?: string;
  signatureText?: string;
}

/**
 * 1) Gera PDF + hash
 * 2) Faz upload no bucket privado
 * 3) Insere registro em voluntario_termos
 * 4) Dispara e-mail (não bloqueante)
 *
 * O termo é independente da gravação do form_response; se form_response_id
 * for null, o termo fica "órfão" temporariamente e é vinculado depois.
 */
export async function signAndPersistTerm(input: SignAndPersistInput): Promise<SignedTermResult> {
  // Pre-gera UUID para amarrar PDF, storage path e linha no banco
  const termoId = crypto.randomUUID();

  const cidadeFallback = input.org.cidade
    ? `${input.org.cidade}${input.org.estado ? ' / ' + input.org.estado : ''}`
    : '[A configurar]';

  // 1) Build PDF + hash
  const built = await buildSignedTerm({
    org: input.org,
    volunteer: input.volunteer,
    metodo: input.metodo,
    signatureImage: input.signatureImage,
    signatureText: input.signatureText,
    termoId,
    cidadeEntidadeFallback: cidadeFallback,
  });

  // 2) Upload PDF
  const pdfPath = `${termoId}.pdf`;
  const { error: uploadError } = await supabase
    .storage
    .from('voluntario-termos')
    .upload(pdfPath, built.blob, {
      contentType: 'application/pdf',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Falha ao salvar o PDF: ${uploadError.message}`);
  }

  // 3) Insere registro
  const publicToken = crypto.randomUUID();
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : null;

  const { error: insertError } = await supabase
    .from('voluntario_termos')
    .insert({
      id: termoId,
      form_response_id: input.formResponseId,
      form_id: input.formId,
      voluntario_nome: input.volunteer.nome,
      voluntario_cpf: input.volunteer.cpf,
      voluntario_email: input.volunteer.email,
      voluntario_cidade_estado: input.volunteer.cidadeEstado,
      entidade_razao_social: input.org.razao_social,
      entidade_cnpj: input.org.cnpj,
      entidade_endereco: input.org.endereco,
      entidade_cidade: input.org.cidade,
      pdf_path: pdfPath,
      hash_sha256: built.hash,
      metodo_assinatura: input.metodo,
      assinatura_imagem_base64: input.signatureImage || null,
      assinatura_texto: input.signatureText || null,
      ip_address: built.ip || null,
      user_agent: ua,
      assinado_em: built.assinadoEm,
      public_token: publicToken,
      status: 'assinado',
    } as any);

  if (insertError) {
    throw new Error(`Falha ao registrar o termo: ${insertError.message}`);
  }

  // 4) E-mail (não bloqueante)
  if (input.volunteer.email) {
    supabase.functions.invoke('send-volunteer-term', {
      body: {
        voluntarioNome: input.volunteer.nome,
        voluntarioEmail: input.volunteer.email,
        pdfBase64: built.base64,
        hash: built.hash,
        termoId,
        publicToken,
        formTitle: input.formTitle,
        assinadoEm: built.assinadoEm,
      },
    }).catch(err => console.warn('[volunteer-term] envio de e-mail falhou:', err));
  }

  return {
    termoId,
    publicToken,
    hash: built.hash,
    pdfPath,
    pdfBlob: built.blob,
    pdfBase64: built.base64,
    assinadoEm: built.assinadoEm,
  };
}

/** Vincula um termo já criado a um form_response (após o insert do response). */
export async function linkTermToResponse(termoId: string, formResponseId: string): Promise<void> {
  const { error } = await supabase
    .from('voluntario_termos')
    .update({ form_response_id: formResponseId } as any)
    .eq('id', termoId);
  if (error) console.warn('[volunteer-term] falha ao vincular termo:', error);
}
