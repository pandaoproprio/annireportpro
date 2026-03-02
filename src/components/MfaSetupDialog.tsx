import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ShieldCheck, ShieldAlert, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { logAction } from '@/lib/systemLog';

interface MfaSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  mandatory?: boolean;
}

export const MfaSetupDialog: React.FC<MfaSetupDialogProps> = ({
  open,
  onOpenChange,
  onSuccess,
  mandatory = false,
}) => {
  const [step, setStep] = useState<'intro' | 'qr' | 'verify'>('intro');
  const [factorId, setFactorId] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) {
      setStep('intro');
      setFactorId('');
      setQrCode('');
      setSecret('');
      setVerifyCode('');
      setCopied(false);
    }
  }, [open]);

  const handleEnroll = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'GIRA Relatórios',
        issuer: 'GIRA Relatórios - relatorios.giraerp.com.br',
      });

      if (error) throw error;

      setFactorId(data.id);
      // The QR code URI may contain the Lovable domain as issuer.
      // We replace it so the authenticator app shows the custom domain.
      const uri = data.totp.uri;
      const fixedUri = uri
        ?.replace(/issuer=[^&]+/, 'issuer=GIRA%20Relat%C3%B3rios')
        ?.replace(/annireportpro\.lovable\.app/g, 'relatorios.giraerp.com.br');

      // Re-generate QR code with corrected URI using a public QR API
      if (fixedUri && fixedUri !== uri) {
        setQrCode(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(fixedUri)}`);
      } else {
        setQrCode(data.totp.qr_code);
      }
      setSecret(data.totp.secret);
      setStep('qr');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao iniciar configuração MFA');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    if (verifyCode.length !== 6) return;

    setIsLoading(true);
    try {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      });

      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: verifyCode,
      });

      if (verifyError) throw verifyError;

      // Log MFA activation
      const { data: { user } } = await supabase.auth.getUser();
      logAction({ action: 'mfa_enabled', entityType: 'user', entityId: user?.id });

      // Notify Asana
      try {
        const { data: configs } = await supabase.from('asana_config').select('enable_notifications').limit(1);
        if (configs?.[0]?.enable_notifications) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            const { data: profile } = await supabase.from('profiles').select('name, email').eq('user_id', user?.id ?? '').single();
            await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/asana-integration`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
              body: JSON.stringify({
                action: 'notify',
                message: `🔐 MFA ativado por ${profile?.name || profile?.email || 'usuário'}`
              }),
            });
          }
        }
      } catch { /* silently ignore */ }

      toast.success('MFA ativado com sucesso!');
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message || 'Código inválido. Tente novamente.');
      setVerifyCode('');
    } finally {
      setIsLoading(false);
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={mandatory ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={mandatory ? (e) => e.preventDefault() : undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Autenticação em Duas Etapas (MFA)
          </DialogTitle>
          <DialogDescription>
            {step === 'intro' && 'Proteja sua conta com um aplicativo autenticador.'}
            {step === 'qr' && 'Escaneie o QR code com seu aplicativo autenticador.'}
            {step === 'verify' && 'Digite o código gerado pelo aplicativo.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'intro' && (
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
              <p className="font-medium">Como funciona:</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Instale um app como Google Authenticator ou Authy</li>
                <li>Escaneie o QR code que será exibido</li>
                <li>Digite o código de 6 dígitos para confirmar</li>
              </ol>
            </div>
            {mandatory && (
              <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <ShieldAlert className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                <p className="text-sm text-destructive">
                  Como administrador, a ativação do MFA é obrigatória para acessar o sistema.
                </p>
              </div>
            )}
            <Button onClick={handleEnroll} disabled={isLoading} className="w-full">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Começar Configuração
            </Button>
          </div>
        )}

        {step === 'qr' && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <img src={qrCode} alt="QR Code MFA" className="w-48 h-48 rounded-lg border" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Não consegue escanear? Use este código manual:
              </Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-muted p-2 rounded font-mono break-all select-all">
                  {secret}
                </code>
                <Button variant="outline" size="icon" onClick={copySecret} className="flex-shrink-0">
                  {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <Button onClick={() => setStep('verify')} className="w-full">
              Já escaneei, continuar
            </Button>
          </div>
        )}

        {step === 'verify' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mfa-code">Código de 6 dígitos</Label>
              <Input
                id="mfa-code"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="text-center text-2xl tracking-[0.5em] font-mono"
                maxLength={6}
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
              />
            </div>
            <Button onClick={handleVerify} disabled={isLoading || verifyCode.length !== 6} className="w-full">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Verificar e Ativar
            </Button>
            <Button variant="ghost" onClick={() => setStep('qr')} className="w-full">
              Voltar ao QR code
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
