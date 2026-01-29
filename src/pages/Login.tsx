import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, LogIn } from 'lucide-react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const { login } = useStore();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      login(email);
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 via-background to-brand-100 p-4">
      <div className="w-full max-w-md animate-fadeIn">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary shadow-lg mb-4">
            <BarChart3 className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">SocialImpact</h1>
          <p className="text-muted-foreground mt-2">Gestão de Projetos Sociais</p>
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Acesse sua conta</CardTitle>
            <CardDescription>
              Entre com seu e-mail para continuar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12"
                />
              </div>

              <Button type="submit" className="w-full h-12 text-base" size="lg">
                <LogIn className="w-5 h-5 mr-2" />
                Entrar
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t text-center">
              <p className="text-xs text-muted-foreground">
                <strong>Dica:</strong> Use "admin@" ou "super@" no e-mail para acessar funções administrativas
              </p>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-8">
          Sistema de Relatórios Narrativos para Projetos Sociais
        </p>
      </div>
    </div>
  );
};
