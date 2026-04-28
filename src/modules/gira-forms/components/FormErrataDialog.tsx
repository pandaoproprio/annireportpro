import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import { AlertTriangle, Send, Loader2, MailCheck } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  formId: string;
}

export const FormErrataDialog: React.FC<Props> = ({ formId }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [alreadySent, setAlreadySent] = useState<number>(0);
  const [skipAlreadySent, setSkipAlreadySent] = useState(true);
  const [step, setStep] = useState<'idle' | 'confirm' | 'sent'>('idle');
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null);
  const [testEmail, setTestEmail] = useState('');

  const previewCount = async (skip = true) => {
    setLoading(true);
    setSkipAlreadySent(skip);
    try {
      const { data, error } = await supabase.functions.invoke('send-form-errata', {
        body: { form_id: formId, dry_run: true, skip_already_sent: skip },
      });
      if (error) throw error;
      const r = data as { total: number; already_sent?: number };
      setCount(r.total);
      setAlreadySent(r.already_sent || 0);
      setStep('confirm');
    } catch (e: any) {
      toast.error('Falha ao calcular destinatários: ' + (e?.message || String(e)));
    } finally {
      setLoading(false);
    }
  };

  const sendTest = async () => {
    if (!testEmail.trim()) { toast.error('Informe um e-mail'); return; }
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('send-form-errata', {
        body: { form_id: formId, test_email: testEmail.trim() },
      });
      if (error) throw error;
      toast.success('E-mail de teste enviado para ' + testEmail);
    } catch (e: any) {
      toast.error('Falha no teste: ' + (e?.message || String(e)));
    } finally {
      setLoading(false);
    }
  };

  const sendAll = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-form-errata', {
        body: { form_id: formId, skip_already_sent: skipAlreadySent },
      });
      if (error) throw error;
      const r = data as { sent: number; failed: number };
      setResult(r);
      setStep('sent');
      toast.success(`Errata enviada: ${r.sent} sucesso, ${r.failed} falha(s)`);
    } catch (e: any) {
      toast.error('Falha no disparo: ' + (e?.message || String(e)));
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep('idle'); setCount(null); setResult(null); setTestEmail(''); setAlreadySent(0); setSkipAlreadySent(true);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 border-amber-500 text-amber-700 hover:bg-amber-50" onClick={() => previewCount(true)}>
          <AlertTriangle className="w-3.5 h-3.5" /> Enviar errata
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            Disparar e-mail de errata
          </DialogTitle>
          <DialogDescription>
            Envia uma correção informando a data correta do evento (29/abril/2026, 8h–16h, Casa do Professor) para todos os inscritos com e-mail. BCC oculto: juanpablorj@gmail.com.
          </DialogDescription>
        </DialogHeader>

        {step === 'idle' && loading && (
          <div className="flex items-center gap-2 py-6 justify-center text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Calculando destinatários...
          </div>
        )}

        {step === 'confirm' && (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm space-y-1">
              <p>{skipAlreadySent ? 'A enviar (somente quem ainda não recebeu)' : 'A enviar (todos)'}: <strong>{count}</strong></p>
              {alreadySent > 0 && skipAlreadySent && (
                <p className="text-xs text-amber-800">{alreadySent} já receberam com sucesso e serão pulados.</p>
              )}
              <button
                type="button"
                onClick={() => previewCount(!skipAlreadySent)}
                className="text-xs underline text-amber-700 hover:text-amber-900"
              >
                {skipAlreadySent ? 'Reenviar para TODOS (inclusive quem já recebeu)' : 'Apenas para quem faltou'}
              </button>
            </div>

            <div className="space-y-2 border rounded p-3">
              <p className="text-xs font-semibold text-muted-foreground">Enviar teste primeiro (opcional)</p>
              <div className="flex gap-2">
                <Input
                  placeholder="seu-email@exemplo.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  type="email"
                />
                <Button variant="outline" size="sm" onClick={sendTest} disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MailCheck className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading}>Cancelar</Button>
              <Button onClick={sendAll} disabled={loading} className="gap-2 bg-amber-600 hover:bg-amber-700">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Confirmar envio para {count}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 'sent' && result && (
          <div className="space-y-3 py-2">
            <div className="bg-green-50 border border-green-200 rounded p-4 text-sm">
              <p className="font-semibold text-green-900">Envio concluído</p>
              <p className="text-green-800 mt-1">Sucesso: <strong>{result.sent}</strong> · Falhas: <strong>{result.failed}</strong></p>
            </div>
            <DialogFooter>
              <Button onClick={() => setOpen(false)}>Fechar</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
