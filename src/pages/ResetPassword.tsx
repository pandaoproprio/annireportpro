import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import logoGira from '@/assets/logo-gira-relatorios.png';
import { z } from 'zod';

const passwordSchema = z.string().min(8, 'A senha deve ter pelo menos 8 caracteres');

export const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [invalidToken, setInvalidToken] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Listen for the PASSWORD_RECOVERY event from Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true);
        setIsLoading(false);
      }
    });

    // Also check if user already has a session (e.g. page was reloaded after recovery link)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionReady(true);
      }
      // Give the auth listener a moment to fire PASSWORD_RECOVERY
      setTimeout(() => {
        setIsLoading(false);
        if (!session) {
          // No session and no recovery event — invalid/expired token
          setInvalidToken(true);
        }
      }, 2000);
    });

    return () => subscription.unsubscribe();
  }, []);

  const validateInputs = () => {
    let valid = true;
    setPasswordError('');
    setConfirmPasswordError('');

    try {
      passwordSchema.parse(password);
    } catch (error) {
      if (error instanceof z.ZodError) {
        setPasswordError(error.errors[0].message);
        valid = false;
      }
    }

    if (password !== confirmPassword) {
      setConfirmPasswordError('As senhas não correspondem');
      valid = false;
    }

    return valid;
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateInputs()) return;

    setIsResettingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: error.message
        });
        setIsResettingPassword(false);
        return;
      }

      setResetSuccess(true);
      toast({
        title: 'Sucesso',
        description: 'Sua senha foi alterada com sucesso'
      });

      setTimeout(() => navigate('/login'), 2500);
    } catch {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro ao alterar senha'
      });
      setIsResettingPassword(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-[100dvh] flex items-center justify-center bg-muted/30">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Verificando link de recuperação...</p>
        </div>
      </div>
    );
  }

  if (invalidToken && !sessionReady) {
    return (
      <div className="h-[100dvh] flex flex-col items-center justify-center px-6 py-12 bg-muted/30">
        <div className="w-full max-w-md bg-card rounded-2xl shadow-lg border border-border p-8 lg:p-10 space-y-7">
          <div className="flex justify-center mb-2">
            <img src={logoGira} alt="GIRA Relatórios" className="w-12 h-12 object-contain" />
          </div>
          <div className="flex flex-col items-center justify-center py-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <p className="text-center text-sm font-medium text-foreground">
              Link de recuperação inválido ou expirado
            </p>
            <p className="text-center text-xs text-muted-foreground">
              Solicite um novo link de recuperação na página de login.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/login')}
            >
              Voltar ao Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] flex flex-col items-center justify-center px-6 py-12 bg-muted/30 overflow-y-auto">
      <div className="w-full max-w-md bg-card rounded-2xl shadow-lg border border-border p-8 lg:p-10 space-y-7">
        <div className="flex justify-center mb-2">
          <img src={logoGira} alt="GIRA Relatórios" className="w-12 h-12 object-contain" />
        </div>

        <div className="text-center space-y-1">
          <h1 className="text-xl font-bold text-foreground">Redefinir Senha</h1>
          <p className="text-sm text-muted-foreground">Digite sua nova senha abaixo</p>
        </div>

        {resetSuccess ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-center text-sm font-medium text-foreground">
              Senha redefinida com sucesso!
            </p>
            <p className="text-center text-xs text-muted-foreground">
              Você será redirecionado para o login em breve...
            </p>
          </div>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="new-password" className="text-sm font-medium text-foreground">
                Nova Senha
              </Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setPasswordError(''); }}
                  required
                  className={`h-11 pr-10 ${passwordError ? 'border-destructive' : ''}`}
                  disabled={isResettingPassword}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {passwordError && <p className="text-xs text-destructive">{passwordError}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm-password" className="text-sm font-medium text-foreground">
                Confirmar Senha
              </Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setConfirmPasswordError(''); }}
                  required
                  className={`h-11 pr-10 ${confirmPasswordError ? 'border-destructive' : ''}`}
                  disabled={isResettingPassword}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirmPasswordError && (
                <p className="text-xs text-destructive">{confirmPasswordError}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-sm font-semibold gap-2"
              disabled={isResettingPassword}
            >
              {isResettingPassword ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Atualizando...
                </>
              ) : (
                'Redefinir Senha'
              )}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};
