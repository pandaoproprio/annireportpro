import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LogIn, Loader2, Eye, EyeOff, ArrowRight, ShieldCheck } from 'lucide-react';
import logoGiraBranco from '@/assets/gira-logo-relatorios-branco.png';
import logoGira from '@/assets/logo-gira.png';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { useIsStandalone } from '@/hooks/useIsStandalone';

const emailSchema = z.string().email('E-mail inválido');
const passwordSchema = z.string().min(6, 'A senha deve ter pelo menos 6 caracteres');

export const DiaryLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isStandalone = useIsStandalone();

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

    navigate('/diario');
  };

  const currentYear = new Date().getFullYear();

  if (isStandalone) {
    return (
      <div className="h-[100dvh] flex flex-col items-center justify-center bg-background px-6 overflow-hidden">
        <div className="w-full space-y-6">
          {/* Logo */}
          <div className="flex justify-center">
            <img src={logoGira} alt="GIRA Diário de Bordo" className="h-36 object-contain" />
          </div>

          {/* Título */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Diário de Bordo</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Registre e acompanhe as atividades realizadas no seu projeto.
            </p>
          </div>

          {/* Badge */}
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary">
              <ShieldCheck className="h-3.5 w-3.5" />
              Acesso exclusivo para colaboradores cadastrados
            </div>
          </div>

          {!showForm ? (
            <>
              <Button
                type="button"
                className="w-full min-h-[48px] text-sm font-semibold gap-2 bg-primary hover:bg-primary/90"
                onClick={() => setShowForm(true)}
              >
                Acessar Diário
                <ArrowRight className="h-4 w-4" />
              </Button>
              <p className="text-xs text-muted-foreground text-center leading-relaxed">
                Suas credenciais são fornecidas pelo gestor do projeto.
              </p>
            </>
          ) : (
            <>
              <form onSubmit={handleSignIn} className="space-y-5 animate-fadeIn">
                <div className="space-y-1.5">
                  <Label htmlFor="diary-email" className="text-sm font-medium text-foreground">E-mail</Label>
                  <Input
                    id="diary-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
                    required
                    className={`min-h-[48px] ${emailError ? 'border-destructive' : ''}`}
                    disabled={isLoading}
                    autoFocus
                  />
                  {emailError && <p className="text-xs text-destructive">{emailError}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="diary-password" className="text-sm font-medium text-foreground">Senha</Label>
                  <div className="relative">
                    <Input
                      id="diary-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setPasswordError(''); }}
                      required
                      className={`min-h-[48px] pr-10 ${passwordError ? 'border-destructive' : ''}`}
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {passwordError && <p className="text-xs text-destructive">{passwordError}</p>}
                </div>

                <Button
                  type="submit"
                  className="w-full min-h-[48px] text-sm font-semibold gap-2 bg-primary hover:bg-primary/90"
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

              <div className="text-center">
                <button
                  type="button"
                  className="text-sm text-primary hover:underline bg-transparent border-none cursor-pointer"
                  onClick={() => toast({ title: 'Recuperação de senha', description: 'Entre em contato com o gestor do projeto para redefinir sua senha.' })}
                >
                  Esqueceu sua senha?
                </button>
              </div>

              <p className="text-xs text-muted-foreground text-center leading-relaxed">
                Suas credenciais são fornecidas pelo gestor do projeto.
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] flex flex-col lg:flex-row overflow-hidden">
      {/* Painel esquerdo - oculto no mobile */}
      <div
        className="relative flex-shrink-0 hidden lg:flex lg:w-[52%] flex-col items-center justify-center px-16 py-20 overflow-hidden bg-primary"
      >
        {/* Círculos decorativos */}
        <div className="pointer-events-none absolute -top-24 -left-24 w-72 h-72 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute top-10 -left-10 w-48 h-48 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 w-64 h-64 rounded-full border border-white/10" />

        {/* Logo */}
        <img
          src={logoGiraBranco}
          alt="GIRA Diário de Bordo"
          className="h-40 lg:h-48 object-contain animate-fade-in"
        />

        {/* Lista de benefícios */}
        <div className="space-y-5 mt-10">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-white">1</span>
            </div>
            <p className="text-[15px] leading-relaxed text-white/90 pt-1">
              Registre oficinas e atividades realizadas no projeto.
            </p>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-white">2</span>
            </div>
            <p className="text-[15px] leading-relaxed text-white/90 pt-1">
              Acompanhe metas e resultados do projeto.
            </p>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-white">3</span>
            </div>
            <p className="text-[15px] leading-relaxed text-white/90 pt-1">
              Gere histórico organizado para prestação de contas.
            </p>
          </div>
        </div>
      </div>

      {/* Painel direito */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-6 bg-muted/30 overflow-y-auto">
        <div className="w-full max-w-md bg-card rounded-2xl shadow-lg border border-border p-8 lg:p-10 space-y-7 animate-fade-in">
          {/* Logo mobile */}
           <div className="lg:hidden flex justify-center mb-4">
             <img src={logoGira} alt="GIRA Diário de Bordo" className="h-20 object-contain" />
           </div>

          {/* Título e subtítulo */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Diário de Bordo</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Registre e acompanhe as atividades realizadas no seu projeto.
            </p>
          </div>

          {/* Badge informativo */}
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary">
              <ShieldCheck className="h-3.5 w-3.5" />
              Acesso exclusivo para colaboradores cadastrados
            </div>
          </div>

          {!showForm ? (
            <>
              {/* Botão para revelar formulário */}
              <Button
                type="button"
                className="w-full h-12 text-sm font-semibold gap-2 bg-primary hover:bg-primary/90"
                onClick={() => setShowForm(true)}
              >
                Acessar Diário
                <ArrowRight className="h-4 w-4" />
              </Button>

              {/* Nota informativa */}
              <p className="text-xs text-muted-foreground text-center leading-relaxed">
                Suas credenciais são fornecidas pelo gestor do projeto.
              </p>
            </>
          ) : (
            <>
              {/* Formulário */}
              <form onSubmit={handleSignIn} className="space-y-5 animate-fadeIn">
                <div className="space-y-1.5">
                  <Label htmlFor="diary-email" className="text-sm font-medium text-foreground">E-mail</Label>
                  <Input
                    id="diary-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
                    required
                    className={`h-11 ${emailError ? 'border-destructive' : ''}`}
                    disabled={isLoading}
                    autoFocus
                  />
                  {emailError && <p className="text-xs text-destructive">{emailError}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="diary-password" className="text-sm font-medium text-foreground">Senha</Label>
                  <div className="relative">
                    <Input
                      id="diary-password"
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
                  className="w-full h-11 text-sm font-semibold gap-2 bg-primary hover:bg-primary/90"
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
                  onClick={() => toast({ title: 'Recuperação de senha', description: 'Entre em contato com o gestor do projeto para redefinir sua senha.' })}
                >
                  Esqueceu sua senha?
                </button>
              </div>

              {/* Nota informativa */}
              <p className="text-xs text-muted-foreground text-center leading-relaxed">
                Suas credenciais são fornecidas pelo gestor do projeto.
              </p>
            </>
          )}
        </div>

        {/* Footer institucional */}
        <div className="mt-8 text-[13px] text-muted-foreground text-center" style={{ lineHeight: 1.8 }}>
          <p className="font-semibold">GIRA Diário de Bordo — Módulo do GIRA ERP</p>
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
