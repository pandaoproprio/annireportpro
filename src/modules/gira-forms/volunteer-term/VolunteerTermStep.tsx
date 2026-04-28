import React, { useEffect, useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileSignature, PenLine, Type, AlertCircle, Loader2, Send } from 'lucide-react';
import type { OrgLegalSettings, VolunteerData } from './types';

export interface VolunteerTermStepValue {
  metodo: 'canvas' | 'digitado';
  signatureImage?: string;
  signatureText?: string;
  scrolledToEnd: boolean;
  lgpdAccepted: boolean;
}

interface Props {
  org: OrgLegalSettings;
  volunteer: VolunteerData;
  value: VolunteerTermStepValue;
  onChange: (v: VolunteerTermStepValue) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

const TERM_BODY = `Pelo presente instrumento, de um lado:

ORGANIZAÇÃO: {{ORG_RAZAO}}, inscrita no CNPJ sob nº {{ORG_CNPJ}}, com sede em {{ORG_END}}, doravante denominada ENTIDADE;

E de outro lado:

VOLUNTÁRIO(A): {{VOL_NOME}}, portador(a) do CPF nº {{VOL_CPF}}, residente em {{VOL_CIDADE}}, e-mail {{VOL_EMAIL}}, doravante denominado(a) VOLUNTÁRIO(A).

As partes acima identificadas celebram o presente Termo de Compromisso de Serviço Voluntário, nos termos da Lei Federal nº 9.608, de 18 de fevereiro de 1998, mediante as seguintes cláusulas:

CLÁUSULA 1ª — DO OBJETO
O(A) VOLUNTÁRIO(A) compromete-se a prestar serviços voluntários à ENTIDADE, de natureza não remunerada, nas áreas de atuação indicadas em seu cadastro, sem vínculo empregatício, previdenciário ou obrigação de qualquer natureza entre as partes, conforme art. 1º da Lei 9.608/1998.

CLÁUSULA 2ª — DA VIGÊNCIA
O presente termo tem vigência por prazo indeterminado, podendo ser rescindido por qualquer das partes mediante comunicação prévia de 15 (quinze) dias, sem ônus.

CLÁUSULA 3ª — DAS ATIVIDADES
As atividades serão definidas de comum acordo, respeitando a disponibilidade declarada pelo(a) VOLUNTÁRIO(A) no ato do cadastro, podendo ser presenciais, remotas ou híbridas conforme acordado.

CLÁUSULA 4ª — DA AUSÊNCIA DE REMUNERAÇÃO
O serviço prestado é de caráter voluntário e não enseja qualquer remuneração, salvo o ressarcimento de despesas previamente aprovadas pela ENTIDADE, nos termos do parágrafo único do art. 3º da Lei 9.608/1998.

CLÁUSULA 5ª — DA PROTEÇÃO DE DADOS (LGPD)
Em conformidade com a Lei Federal nº 13.709/2020 (LGPD), o(a) VOLUNTÁRIO(A) consente expressamente com o tratamento dos seus dados pessoais fornecidos neste cadastro, para as seguintes finalidades:
a) Gestão e comunicação das atividades voluntárias;
b) Emissão deste termo e controle de assinaturas;
c) Envio de informações institucionais pertinentes.
Os dados serão armazenados de forma segura, não serão compartilhados com terceiros sem consentimento e poderão ser excluídos mediante solicitação ao DPO da ENTIDADE.

CLÁUSULA 6ª — DA ASSINATURA ELETRÔNICA
A assinatura eletrônica aposta neste documento possui validade jurídica nos termos do art. 10 da MP 2.200-2/2001 e do Marco Civil da Internet (Lei 12.965/2014), sendo o hash SHA-256 deste documento a prova de integridade e autenticidade do ato.`;

const fmt = (s: string | null | undefined, fallback = '[A configurar]') =>
  s && s.trim() ? s : fallback;

export const VolunteerTermStep: React.FC<Props> = ({
  org, volunteer, value, onChange, onSubmit, isSubmitting,
}) => {
  const sigRef = useRef<SignatureCanvas | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const cidadeOrg = org.cidade
    ? `${org.cidade}${org.estado ? ' / ' + org.estado : ''}`
    : '[A configurar]';

  const renderedTerm = TERM_BODY
    .replace('{{ORG_RAZAO}}', fmt(org.razao_social))
    .replace('{{ORG_CNPJ}}', fmt(org.cnpj))
    .replace('{{ORG_END}}', fmt(org.endereco))
    .replace('{{VOL_NOME}}', volunteer.nome || '—')
    .replace('{{VOL_CPF}}', volunteer.cpf || '—')
    .replace('{{VOL_CIDADE}}', volunteer.cidadeEstado || '—')
    .replace('{{VOL_EMAIL}}', volunteer.email || '—');

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const reached = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
    if (reached && !value.scrolledToEnd) {
      onChange({ ...value, scrolledToEnd: true });
    }
  };

  const handleCanvasEnd = () => {
    if (sigRef.current && !sigRef.current.isEmpty()) {
      const dataUrl = sigRef.current.toDataURL('image/png');
      onChange({ ...value, metodo: 'canvas', signatureImage: dataUrl, signatureText: undefined });
    }
  };

  const clearCanvas = () => {
    sigRef.current?.clear();
    onChange({ ...value, signatureImage: undefined });
  };

  const hasSignature =
    (value.metodo === 'canvas' && !!value.signatureImage) ||
    (value.metodo === 'digitado' && !!value.signatureText && value.signatureText.trim().length >= 3);

  const canSubmit = value.scrolledToEnd && hasSignature && value.lgpdAccepted && !isSubmitting;

  const orgIncomplete = !org.is_active || !org.razao_social || !org.cnpj;

  return (
    <div className="space-y-4">
      <div className="rounded-xl p-5 shadow-sm space-y-3" style={{ background: 'var(--form-card-bg)' }}>
        <div className="flex items-center gap-2">
          <FileSignature className="w-5 h-5" style={{ color: 'var(--form-primary)' }} />
          <h3 className="font-semibold text-base">Termo de Compromisso de Serviço Voluntário</h3>
        </div>
        <p className="text-xs" style={{ color: 'var(--form-muted)' }}>
          Lei Federal nº 9.608/1998 · LGPD nº 13.709/2020 · MP 2.200-2/2001
        </p>

        {orgIncomplete && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              Os dados institucionais ainda não foram configurados pelo administrador.
              O termo será gerado com marcações <strong>[A configurar]</strong> nos campos da entidade
              e poderá ser atualizado posteriormente. A assinatura permanece válida.
            </div>
          </div>
        )}

        <ScrollArea
          className="h-[400px] rounded-lg border bg-white"
          style={{ borderColor: 'rgba(0,0,0,0.1)' }}
        >
          <div
            onScroll={handleScroll}
            className="h-[400px] overflow-y-auto p-5 text-sm leading-relaxed text-slate-800 whitespace-pre-line"
            style={{ scrollBehavior: 'smooth' }}
          >
            <h4 className="font-bold text-center text-base mb-4 uppercase tracking-wide">
              Termo de Compromisso de Serviço Voluntário
            </h4>
            {renderedTerm}
            {'\n\n'}
            Local e data: {cidadeOrg}, {now.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}.
            {'\n\n'}
            <span className="block pt-4 text-xs text-slate-500 italic border-t mt-4">
              Role até aqui para habilitar a assinatura.
            </span>
          </div>
        </ScrollArea>

        {!value.scrolledToEnd && (
          <p className="text-xs italic" style={{ color: 'var(--form-muted)' }}>
            ⬇️ Role o termo até o fim para liberar a assinatura.
          </p>
        )}
      </div>

      {/* Assinatura */}
      <div
        className={`rounded-xl p-5 shadow-sm space-y-4 transition-opacity ${value.scrolledToEnd ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}
        style={{ background: 'var(--form-card-bg)' }}
      >
        <div>
          <h4 className="font-semibold text-sm flex items-center gap-2">
            <PenLine className="w-4 h-4" style={{ color: 'var(--form-primary)' }} />
            Sua assinatura
          </h4>
          <p className="text-xs mt-1" style={{ color: 'var(--form-muted)' }}>
            Escolha como deseja assinar este documento.
          </p>
        </div>

        <Tabs
          value={value.metodo}
          onValueChange={(v) => onChange({ ...value, metodo: v as 'canvas' | 'digitado' })}
        >
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="canvas" className="gap-2">
              <PenLine className="w-4 h-4" /> Assinar à mão
            </TabsTrigger>
            <TabsTrigger value="digitado" className="gap-2">
              <Type className="w-4 h-4" /> Assinar digitando
            </TabsTrigger>
          </TabsList>

          <TabsContent value="canvas" className="space-y-3 pt-3">
            <div className="rounded-lg border-2 border-dashed bg-white" style={{ borderColor: 'var(--form-primary)' }}>
              <SignatureCanvas
                ref={sigRef}
                penColor="#1a1a1a"
                canvasProps={{
                  className: 'w-full h-[180px] rounded-lg',
                  style: { touchAction: 'none' },
                }}
                onEnd={handleCanvasEnd}
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs" style={{ color: 'var(--form-muted)' }}>
                Use o mouse, dedo ou caneta digital.
              </span>
              <Button type="button" variant="ghost" size="sm" onClick={clearCanvas}>
                Limpar
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="digitado" className="space-y-3 pt-3">
            <Label htmlFor="sig-text" className="text-xs">
              Digite seu nome completo como forma de assinatura
            </Label>
            <Input
              id="sig-text"
              value={value.signatureText || ''}
              onChange={(e) => onChange({ ...value, metodo: 'digitado', signatureText: e.target.value, signatureImage: undefined })}
              placeholder={volunteer.nome || 'Seu nome completo'}
              className="text-lg italic"
              style={{ fontFamily: 'cursive' }}
            />
            <p className="text-xs" style={{ color: 'var(--form-muted)' }}>
              Esta assinatura terá validade jurídica conforme MP 2.200-2/2001.
            </p>
          </TabsContent>
        </Tabs>

        <div className="rounded-lg bg-slate-50 p-3 text-xs" style={{ color: 'var(--form-muted)' }}>
          <span className="font-medium">Data e hora da assinatura:</span>{' '}
          <span className="font-mono">
            {now.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'medium' })}
          </span>
        </div>

        <label className="flex items-start gap-2 cursor-pointer">
          <Checkbox
            checked={value.lgpdAccepted}
            onCheckedChange={(c) => onChange({ ...value, lgpdAccepted: c === true })}
            className="mt-0.5"
          />
          <span className="text-xs leading-snug">
            Declaro que li, compreendi e concordo com todos os termos acima, incluindo o
            tratamento dos meus dados pessoais conforme a Lei Geral de Proteção de Dados (LGPD).
          </span>
        </label>
      </div>

      <Button
        onClick={onSubmit}
        disabled={!canSubmit}
        className="w-full min-h-[48px] text-sm font-semibold gap-2"
        style={{ background: 'var(--form-button)' }}
      >
        {isSubmitting ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Gerando termo e enviando...</>
        ) : (
          <><Send className="w-4 h-4" /> Assinar e Enviar</>
        )}
      </Button>

      {!canSubmit && !isSubmitting && (
        <p className="text-xs text-center" style={{ color: 'var(--form-muted)' }}>
          {!value.scrolledToEnd && 'Role o termo até o final · '}
          {!hasSignature && 'Adicione sua assinatura · '}
          {!value.lgpdAccepted && 'Aceite os termos da LGPD'}
        </p>
      )}
    </div>
  );
};
