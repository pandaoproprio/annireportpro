import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LogIn, Loader2, Eye, EyeOff } from 'lucide-react';
import logoGiraBranco from '@/assets/gira-logo-relatorios-branco.png';
import logoGira from '@/assets/logo-gira-relatorios.png';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

const emailSchema = z.string().email('E-mail inválido');
const passwordSchema = z.string().min(6, 'A senha deve ter pelo menos 6 caracteres');

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const validateInputs = () => {
    let valid = true;
    setEmailError('');
    setPasswordError('');

    try {
      emailSchema.parse(email);
    } catch (error) {
      if (error instanceof z.ZodError) {
        setEmailError(error.errors[0].message);
        valid = false;
      }
    }

    try {
      passwordSchema.parse(password);
    } catch (error) {
      if (error instanceof z.ZodError) {
        setPasswordError(error.errors[0].message);
        valid = false;
      }
    }

    return valid;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateInputs()) return;

    setIsLoading(true);
    const { error } = await signIn(email, password);
    setIsLoading(false);

    if (error) {
      let message = 'Erro ao fazer login';
      if (error.message.includes('Invalid login credentials')) {
        message = 'E-mail ou senha incorretos';
      } else if (error.message.includes('Email not confirmed')) {
        message = 'Confirme seu e-mail antes de fazer login';
      }
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: message
      });
      return;
    }

    navigate('/');
  };

  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Painel esquerdo */}
      <div
        className="relative flex-shrink-0 lg:w-[52%] flex flex-col items-center justify-center px-10 py-14 lg:px-16 lg:py-20 overflow-hidden min-h-[50vh] lg:min-h-screen"
        style={{ backgroundColor: '#0DA3E7' }}
      >
        {/* Círculos decorativos */}
        <div className="pointer-events-none absolute -top-24 -left-24 w-72 h-72 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute top-10 -left-10 w-48 h-48 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 w-64 h-64 rounded-full border border-white/10" />

        {/* Logo */}
        <img
          src={logoGiraBranco}
          alt="GIRA Relatórios"
          className="h-40 lg:h-48 object-contain animate-fade-in"
        />

        {/* Lista de benefícios */}
        <div className="space-y-5 mt-10">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-white">1</span>
            </div>
            <p className="text-[15px] leading-relaxed text-white/90 pt-1">
              Registre atividades e acompanhe o progresso das metas do seu projeto social.
            </p>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-white">2</span>
            </div>
            <p className="text-[15px] leading-relaxed text-white/90 pt-1">
              Gere relatórios profissionais em PDF e DOCX conforme normas ABNT.
            </p>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-white">3</span>
            </div>
            <p className="text-[15px] leading-relaxed text-white/90 pt-1">
              Gerencie equipes e prestações de contas com transparência.
            </p>
          </div>
        </div>
      </div>

      {/* Painel direito */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-muted/30">
        <div className="w-full max-w-md bg-card rounded-2xl shadow-lg border border-border p-8 lg:p-10 space-y-7 animate-fade-in">
          {/* Logo mobile */}
          <div className="lg:hidden flex justify-center mb-2">
            <img src={logoGira} alt="GIRA Relatórios" className="w-12 h-12 object-contain" />
          </div>

          {/* Título e subtítulo */}
          <div className="text-center space-y-1">
            <h1 className="text-xl font-bold text-foreground">Acesse sua conta</h1>
            <p className="text-sm text-muted-foreground">Entre com seu e-mail e senha para continuar.</p>
          </div>

          {/* Formulário */}
          <form onSubmit={handleSignIn} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="login-email" className="text-sm font-medium text-foreground">E-mail</Label>
              <Input
                id="login-email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
                required
                className={`h-11 ${emailError ? 'border-destructive' : ''}`}
                disabled={isLoading}
              />
              {emailError && <p className="text-xs text-destructive">{emailError}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="login-password" className="text-sm font-medium text-foreground">Senha</Label>
              <div className="relative">
                <Input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setPasswordError(''); }}
                  required
                  className={`h-11 pr-10 ${passwordError ? 'border-destructive' : ''}`}
                  disabled={isLoading}
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

            <Button
              type="submit"
              className="w-full h-11 text-sm font-semibold gap-2"
              style={{ backgroundColor: '#0DA3E7' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#0B8FCC')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#0DA3E7')}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Acessando...
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  Acessar
                </>
              )}
            </Button>
          </form>

          {/* Link recuperação */}
          <div className="text-center">
            <button
              type="button"
              className="text-sm text-primary hover:underline bg-transparent border-none cursor-pointer"
              onClick={() => toast({ title: 'Recuperação de senha', description: 'Entre em contato com o administrador do sistema para redefinir sua senha.' })}
            >
              Esqueceu sua senha?
            </button>
          </div>
        </div>

        {/* Footer institucional */}
        <div className="mt-8 text-[13px] text-muted-foreground text-center" style={{ lineHeight: 1.8 }}>
          <p>GIRA Relatórios — Módulo do GIRA ERP</p>
          <p>© {currentYear} AnnITech IT Solutions</p>
          <div className="flex items-center justify-center gap-1.5">
            <a href="/lgpd" className="hover:text-foreground hover:underline underline-offset-4">Política de Privacidade</a>
            <span>·</span>
            <a href="/licenca" className="hover:text-foreground hover:underline underline-offset-4">Termos de Uso</a>
            <span>·</span>
            <a href="/lgpd" className="hover:text-foreground hover:underline underline-offset-4">LGPD</a>
          </div>
        </div>
      </div>
    </div>
  );
};
