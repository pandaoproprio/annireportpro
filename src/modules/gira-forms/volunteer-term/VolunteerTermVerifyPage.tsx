import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldCheck, Download, AlertCircle, FileSignature, Hash, Calendar, User } from 'lucide-react';
import { recomputeHash } from './buildTerm';

export default function VolunteerTermVerifyPage() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [termo, setTermo] = useState<any | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [integrity, setIntegrity] = useState<'pending' | 'ok' | 'mismatch'>('pending');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const { data, error: e1 } = await supabase
          .from('voluntario_termos')
          .select('*')
          .eq('public_token', token)
          .maybeSingle();
        if (e1) throw e1;
        if (!data) throw new Error('Termo não encontrado.');
        setTermo(data);

        const { data: signed, error: e2 } = await supabase
          .storage.from('voluntario-termos')
          .createSignedUrl((data as any).pdf_path, 60 * 60);
        if (e2) throw e2;
        setSignedUrl(signed.signedUrl);

        // Verifica integridade
        try {
          const res = await fetch(signed.signedUrl);
          const blob = await res.blob();
          const hash = await recomputeHash(blob);
          setIntegrity(hash === (data as any).hash_sha256 ? 'ok' : 'mismatch');
        } catch {
          setIntegrity('mismatch');
        }
      } catch (e: any) {
        setError(e?.message || 'Erro ao carregar termo.');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen p-4 bg-slate-50 flex items-center justify-center">
        <div className="w-full max-w-2xl space-y-4">
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (error || !termo) {
    return (
      <div className="min-h-screen p-4 bg-slate-50 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-3">
            <AlertCircle className="w-12 h-12 mx-auto text-destructive" />
            <h1 className="text-lg font-semibold">Termo indisponível</h1>
            <p className="text-sm text-muted-foreground">{error || 'Link inválido.'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isRevoked = termo.status === 'revogado';

  return (
    <div className="min-h-screen p-4 bg-slate-50">
      <div className="max-w-2xl mx-auto space-y-4 py-8">
        <div className="flex items-center gap-3">
          <FileSignature className="w-6 h-6 text-emerald-700" />
          <h1 className="text-xl font-bold">Termo de Compromisso de Voluntariado</h1>
        </div>

        {isRevoked ? (
          <Card className="border-destructive">
            <CardContent className="p-5 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-destructive">Termo revogado</p>
                {termo.revogado_motivo && <p className="text-muted-foreground mt-1">{termo.revogado_motivo}</p>}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className={integrity === 'ok' ? 'border-emerald-300 bg-emerald-50' : integrity === 'mismatch' ? 'border-amber-300 bg-amber-50' : ''}>
            <CardContent className="p-5 flex items-start gap-3">
              <ShieldCheck className={`w-5 h-5 mt-0.5 ${integrity === 'ok' ? 'text-emerald-700' : 'text-amber-700'}`} />
              <div className="text-sm">
                <p className="font-semibold">
                  {integrity === 'ok' && 'Documento autêntico e íntegro'}
                  {integrity === 'mismatch' && 'Atenção: hash não confere'}
                  {integrity === 'pending' && 'Verificando integridade...'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Conferido via SHA-256 contra o PDF armazenado.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-5 space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <User className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Voluntário(a)</p>
                <p className="font-medium">{termo.voluntario_nome}</p>
                {termo.voluntario_email && <p className="text-xs text-muted-foreground">{termo.voluntario_email}</p>}
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Assinado em</p>
                <p className="font-medium">
                  {new Date(termo.assinado_em).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' })}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Hash className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Hash SHA-256</p>
                <p className="font-mono text-[11px] break-all">{termo.hash_sha256}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {signedUrl && (
          <Button asChild className="w-full" size="lg">
            <a href={signedUrl} target="_blank" rel="noopener noreferrer">
              <Download className="w-4 h-4 mr-2" /> Baixar meu Termo em PDF
            </a>
          </Button>
        )}

        <p className="text-xs text-center text-muted-foreground pt-4">
          Lei nº 9.608/1998 · LGPD nº 13.709/2020 · MP 2.200-2/2001
        </p>
      </div>
    </div>
  );
}
