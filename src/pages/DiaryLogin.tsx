import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogIn, Loader2 } from 'lucide-react';
import logoGira from '@/assets/logotipo-gira-diario-de-bordo.png';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

const emailSchema = z.string().email('E-mail inválido');
const passwordSchema = z.string().min(6, 'A senha deve ter pelo menos 6 caracteres');

export const DiaryLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const validateInputs = () => {
    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          variant: 'destructive',
          title: 'Erro de validação',
          description: error.errors[0].message
        });
      }
      return false;
    }
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

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ backgroundColor: '#f5f5f0' }}>
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-primary/3 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent/10 rounded-full translate-x-1/3 translate-y-1/3 blur-3xl" />

      <div className="w-full max-w-md animate-fadeIn relative z-10">
        {/* Logo & Header */}
        <div className="text-center mb-22">
          <img src={logoGira} alt="GIRA Diário de Bordo" className="w-80 h-auto mx-auto" />
          <p className="text-foreground/60 text-sm font-semibold uppercase tracking-wider -mt-20">CADA AÇÃO CONTA</p>
        </div>

        <Card className="shadow-2xl border border-border/40 backdrop-blur-sm bg-card/95">
          <CardHeader className="text-center pt-8 pb-3 px-8">
            <CardTitle className="text-lg font-semibold">Área do Colaborador</CardTitle>
            <CardDescription className="text-sm space-y-2">
              <p className="text-foreground/70">Registre as atividades realizadas na sua oficina.</p>
              <p className="text-muted-foreground">Acesse com as credenciais fornecidas pelo gestor.</p>
            </CardDescription>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <form onSubmit={handleSignIn} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="diary-email" className="text-sm font-medium">E-mail</Label>
                <Input
                  id="diary-email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 text-base rounded-lg bg-background/60 border-border/60 focus:bg-background transition-colors"
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="diary-password" className="text-sm font-medium">Senha</Label>
                <Input
                  id="diary-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 text-base rounded-lg bg-background/60 border-border/60 focus:bg-background transition-colors"
                  disabled={isLoading}
                />
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <LogIn className="w-5 h-5 mr-2" />
                )}
                Entrar
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground/70 underline-offset-4 hover:underline transition-colors"
                  onClick={() => toast({ title: 'Recuperação de senha', description: 'Entre em contato com o gestor do projeto para redefinir sua senha.' })}
                >
                  Esqueceu sua senha?
                </button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="text-center text-xs text-muted-foreground mt-8 space-y-1">
          <p className="font-medium text-foreground/70">GIRA Relatórios</p>
          <p>© 2026 — powered by AnnIReport</p>
        </div>
      </div>
    </div>
  );
};
