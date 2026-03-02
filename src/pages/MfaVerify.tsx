import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ShieldCheck, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import logoGira from '@/assets/logo-gira-relatorios.png';

export const MfaVerify: React.FC = () => {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [factorId, setFactorId] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Get the enrolled TOTP factor
    const getFactors = async () => {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error || !data.totp || data.totp.length === 0) {
        // No factors enrolled, redirect to home
        navigate('/');
        return;
      }
      // Use the first verified factor
      const verifiedFactor = data.totp.find(f => f.status === 'verified');
      if (verifiedFactor) {
        setFactorId(verifiedFactor.id);
      } else {
        navigate('/');
      }
    };
    getFactors();
  }, [navigate]);

  const handleVerify = async () => {
    if (code.length !== 6 || !factorId) return;

    setIsLoading(true);
    try {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      });

      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code,
      });

      if (verifyError) throw verifyError;

      // Force full reload so auth state (AAL2) is re-initialized
      window.location.href = '/';
    } catch (err: any) {
      toast.error('Código inválido. Tente novamente.');
      setCode('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="h-[100dvh] flex items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm bg-card rounded-2xl shadow-lg border border-border p-8 space-y-6 animate-fade-in">
        <div className="flex justify-center">
          <img src={logoGira} alt="GIRA Relatórios" className="h-16 object-contain" />
        </div>

        <div className="text-center space-y-1">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Verificação MFA</h1>
          <p className="text-sm text-muted-foreground">
            Digite o código de 6 dígitos do seu aplicativo autenticador.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mfa-verify-code">Código de verificação</Label>
            <Input
              id="mfa-verify-code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="text-center text-2xl tracking-[0.5em] font-mono h-14"
              maxLength={6}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
            />
          </div>

          <Button onClick={handleVerify} disabled={isLoading || code.length !== 6} className="w-full h-11">
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Verificar
          </Button>

          <Button variant="ghost" onClick={handleLogout} className="w-full text-muted-foreground">
            <LogOut className="w-4 h-4 mr-2" />
            Sair e usar outra conta
          </Button>
        </div>
      </div>
    </div>
  );
};
