import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2, FileSignature, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

const FN_BASE = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/legal-justification-public-sign`;

export default function PublicSignJustificationPage() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [accept, setAccept] = useState(false);
  const [declaredName, setDeclaredName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${FN_BASE}?token=${encodeURIComponent(token)}`);
      const j = await res.json();
      if (!res.ok) {
        setError(j.error || 'Erro ao carregar documento');
      } else {
        setData(j);
      }
    } catch (e) {
      setError('Falha de conexão');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [token]);

  const handleSign = async () => {
    if (!accept) { toast.error('Aceite os termos'); return; }
    if (!declaredName.trim()) { toast.error('Digite seu nome completo'); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`${FN_BASE}?token=${encodeURIComponent(token!)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accept: true, declared_name: declaredName }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Falha na assinatura');
      toast.success('Documento assinado com sucesso');
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/40 flex items-center justify-center p-4">
        <div className="w-full max-w-3xl space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-muted/40 flex items-center justify-center p-4">
        <Card className="w-full max-w-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5" /> Não foi possível carregar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertTitle>Erro</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { signature, justification, project } = data || {};
  const alreadySigned = signature?.signed;

  return (
    <div className="min-h-screen bg-muted/40 py-8 px-4">
      <div className="mx-auto w-full max-w-4xl space-y-4">
        <Card>
          <CardHeader className="border-b">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileSignature className="h-5 w-5 text-primary" />
                  Assinatura Eletrônica de Documento
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  CEAP — Centro de Articulação de Populações Marginalizadas
                </p>
              </div>
              {alreadySigned && (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 text-green-700 dark:text-green-300 px-3 py-1 text-xs font-medium">
                  <CheckCircle2 className="h-3 w-3" /> Já assinado
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Documento</p>
                <p className="font-medium">{justification.document_title}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Projeto</p>
                <p className="font-medium">{project?.name || '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Termo de Fomento</p>
                <p className="font-medium">{project?.fomento_number || '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Concedente</p>
                <p className="font-medium">{project?.funder || '—'}</p>
              </div>
            </div>

            <div className="rounded-md border bg-card p-4 max-h-[400px] overflow-y-auto">
              <h3 className="font-semibold text-sm mb-2">Conteúdo do documento</h3>
              <pre className="whitespace-pre-wrap text-xs font-sans text-foreground/90 leading-relaxed">
                {justification.document_body}
              </pre>
              {justification.legal_basis && (
                <>
                  <h3 className="font-semibold text-sm mt-4 mb-2">Fundamentação Legal</h3>
                  <pre className="whitespace-pre-wrap text-xs font-sans text-muted-foreground leading-relaxed">
                    {justification.legal_basis}
                  </pre>
                </>
              )}
            </div>

            <div className="rounded-md border bg-muted/40 p-4 text-sm space-y-1">
              <p className="font-semibold">Identificação do signatário</p>
              <p><span className="text-muted-foreground">Nome:</span> {signature.signer_name}</p>
              <p><span className="text-muted-foreground">Cargo:</span> {signature.signer_role}</p>
              <p><span className="text-muted-foreground">CPF/CNPJ:</span> {signature.signer_cpf_cnpj}</p>
            </div>
          </CardContent>
        </Card>

        {!alreadySigned && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Assinatura Eletrônica</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTitle className="text-sm">Aviso legal</AlertTitle>
                <AlertDescription className="text-xs">
                  Esta assinatura eletrônica simples possui validade jurídica nos termos do
                  art. 4º, III, da Lei 14.063/2020. Ao assinar, você confirma a leitura
                  integral do documento, concorda com seu conteúdo e declara ser a pessoa
                  identificada acima.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="declared_name">Digite seu nome completo para confirmar</Label>
                <Input
                  id="declared_name"
                  value={declaredName}
                  onChange={(e) => setDeclaredName(e.target.value)}
                  placeholder={signature.signer_name}
                />
              </div>

              <div className="flex items-start gap-2">
                <Checkbox id="accept" checked={accept} onCheckedChange={(v) => setAccept(v === true)} />
                <Label htmlFor="accept" className="text-xs leading-snug cursor-pointer">
                  Li e concordo integralmente com o conteúdo do documento. Reconheço que esta
                  assinatura ficará registrada com data, hora e endereço de IP para fins de
                  auditoria.
                </Label>
              </div>

              <Button
                onClick={handleSign}
                disabled={submitting || !accept || !declaredName.trim()}
                className="w-full"
                size="lg"
              >
                {submitting ? 'Registrando…' : 'Assinar documento'}
              </Button>
            </CardContent>
          </Card>
        )}

        {alreadySigned && (
          <Card>
            <CardContent className="pt-6">
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Assinatura registrada</AlertTitle>
                <AlertDescription>
                  Documento assinado em{' '}
                  {new Date(signature.signed_at).toLocaleString('pt-BR')}.
                  O CEAP receberá uma confirmação automática.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}

        {justification.qr_verification_code && (
          <p className="text-center text-xs text-muted-foreground">
            Código de verificação: <span className="font-mono">{justification.qr_verification_code}</span>
          </p>
        )}
      </div>
    </div>
  );
}
