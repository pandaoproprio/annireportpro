import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClipboardList, LogIn, ShieldCheck, Sparkles } from 'lucide-react';
import logoGira from '@/assets/logo-gira-relatorios.png';

const FormsLanding: React.FC = () => {
  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-background via-background to-muted flex flex-col">
      <header className="border-b border-border bg-card/60 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoGira} alt="GIRA Forms" className="h-9 w-auto" />
            <span className="font-bold text-foreground">GIRA Forms</span>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link to="/login">
              <LogIn className="w-4 h-4 mr-2" />
              Entrar
            </Link>
          </Button>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-12 md:py-20">
        <div className="text-center space-y-4 mb-12">
          <h1 className="text-3xl md:text-5xl font-bold text-foreground">
            Formulários inteligentes para sua organização
          </h1>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
            Crie, publique e analise formulários com pré-checkin, validação por geolocalização e
            relatórios em tempo real.
          </p>
          <div className="flex flex-wrap gap-3 justify-center pt-2">
            <Button asChild size="lg">
              <Link to="/login">
                <LogIn className="w-4 h-4 mr-2" />
                Acessar painel
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <ClipboardList className="w-8 h-8 text-primary mb-2" />
              <CardTitle className="text-lg">Formulários públicos</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Compartilhe links curtos e receba respostas com validação automática.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <ShieldCheck className="w-8 h-8 text-primary mb-2" />
              <CardTitle className="text-lg">Pré-checkin & Geofence</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Confirmação prévia e check-in efetivo validado por localização.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Sparkles className="w-8 h-8 text-primary mb-2" />
              <CardTitle className="text-lg">Relatórios em tempo real</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Painel ao vivo com contadores de convidados, pré-checkins e presentes.
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="border-t border-border bg-card/60 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} AnnITech — GIRA Forms
      </footer>
    </div>
  );
};

export default FormsLanding;
