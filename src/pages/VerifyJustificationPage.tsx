import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, ShieldAlert, Loader2, Lock } from 'lucide-react';

const VerifyJustificationPage: React.FC = () => {
  const { hash } = useParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!hash) return;
    (async () => {
      try {
        const { data: res, error: e } = await supabase.functions.invoke('legal-justification-verify', {
          body: null,
        });
        // edge function recebe via query string
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/legal-justification-verify?code=${encodeURIComponent(hash)}`;
        const r = await fetch(url, {
          headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        });
        const json = await r.json();
        if (!json.valid) setError(json.message || json.error || 'Documento não encontrado');
        else setData(json);
      } catch (err: any) {
        setError(err.message || 'Erro ao verificar');
      } finally { setLoading(false); }
    })();
  }, [hash]);

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : data?.valid ? <ShieldCheck className="w-7 h-7 text-green-600" /> : <ShieldAlert className="w-7 h-7 text-destructive" />}
            Verificação de Autenticidade
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading && <p className="text-muted-foreground">Verificando documento...</p>}
          {error && <p className="text-destructive">{error}</p>}
          {data && (
            <>
              <div className="flex items-center gap-2">
                <Badge className="bg-green-500/15 text-green-700"><Lock className="w-3 h-3 mr-1" />Documento Lacrado</Badge>
                <Badge variant="outline">{data.type_label}</Badge>
              </div>
              <div className="space-y-2 text-sm">
                <p><strong>Documento:</strong> {data.title}</p>
                <p><strong>Projeto:</strong> {data.project?.name}</p>
                <p><strong>Termo de Fomento:</strong> nº {data.project?.fomento_number}</p>
                <p><strong>Concedente:</strong> {data.project?.funder}</p>
                <p><strong>Convenente:</strong> {data.project?.organization_name}</p>
                <p><strong>Lacrado em:</strong> {new Date(data.sealed_at).toLocaleString('pt-BR')}</p>
                <p><strong>Hash SHA-256:</strong> <span className="font-mono text-xs break-all">{data.hash}</span></p>
              </div>
              {data.signatures?.length > 0 && (
                <div className="border-t pt-3">
                  <p className="font-semibold mb-2">Assinaturas:</p>
                  {data.signatures.map((s: any, i: number) => (
                    <div key={i} className="text-sm mb-2">
                      <p>{s.signer_name} {s.signer_role && `— ${s.signer_role}`}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.signer_cpf_cnpj} · {s.signed ? `Assinado em ${new Date(s.signed_at).toLocaleString('pt-BR')}` : 'Pendente'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VerifyJustificationPage;
