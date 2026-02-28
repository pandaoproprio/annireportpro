import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Download, Smartphone, Monitor, Share, MoreVertical, 
  PlusSquare, ArrowLeft, CheckCircle2, Wifi, BellRing, Rocket
} from 'lucide-react';
import logoGira from '@/assets/logotipo-gira-diario-de-bordo.png';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const InstallGuide: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                          (window.navigator as any).standalone === true;
    setIsInstalled(isStandalone);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
    }
  };

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-brand-50 via-background to-brand-100 flex flex-col">
      {/* Header */}
      <header className="p-4 flex items-center justify-between">
        <Link to="/login" className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 text-sm">
          <ArrowLeft className="w-4 h-4" />
          Voltar ao Login
        </Link>
      </header>

      {/* Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 max-w-lg mx-auto w-full">
        {/* Logo & Title */}
        <div className="text-center mb-8 animate-fadeIn">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-card shadow-lg flex items-center justify-center overflow-hidden border border-border">
            <img src={logoGira} alt="GIRA" className="w-16 h-16 object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Diário de Bordo</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Instale o app para uma experiência completa
          </p>
        </div>

        {/* Already installed */}
        {isInstalled && (
          <Card className="w-full mb-6 border-success/30 bg-success/5 animate-fadeIn">
            <CardContent className="pt-6 text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-success mx-auto" />
              <h2 className="text-lg font-semibold text-foreground">App já instalado!</h2>
              <p className="text-sm text-muted-foreground">
                O Diário de Bordo já está instalado no seu dispositivo. Abra-o pela tela inicial.
              </p>
              <Link to="/login">
                <Button className="mt-2">Ir para o Login</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Native install button */}
        {deferredPrompt && !isInstalled && (
          <Card className="w-full mb-6 border-primary/30 bg-primary/5 animate-fadeIn">
            <CardContent className="pt-6 text-center space-y-4">
              <Download className="w-10 h-10 text-primary mx-auto" />
              <h2 className="text-lg font-semibold text-foreground">Instalação rápida</h2>
              <p className="text-sm text-muted-foreground">
                Clique no botão abaixo para instalar o app diretamente.
              </p>
              <Button onClick={handleInstall} className="w-full" size="lg">
                <Download className="w-5 h-5 mr-2" />
                Instalar Diário de Bordo
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Manual instructions */}
        {!isInstalled && (
          <div className="w-full space-y-4 animate-slideUp">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider text-center">
              {deferredPrompt ? 'Ou instale manualmente' : 'Como instalar'}
            </h3>

            {/* Android */}
            <Card className={`w-full transition-all ${isAndroid ? 'ring-2 ring-primary/30' : ''}`}>
              <CardContent className="pt-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-success/10 flex items-center justify-center">
                    <Smartphone className="w-5 h-5 text-success" />
                  </div>
                  <h3 className="font-semibold text-foreground">
                    Android (Chrome)
                    {isAndroid && <span className="text-xs ml-2 text-primary font-normal">— Seu dispositivo</span>}
                  </h3>
                </div>
                <ol className="space-y-2 text-sm text-muted-foreground ml-1">
                  <li className="flex items-start gap-2">
                    <span className="bg-muted text-foreground font-bold text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                    <span>Toque no menu <MoreVertical className="w-4 h-4 inline-block mx-0.5 text-foreground" /> (três pontos) no canto superior direito</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-muted text-foreground font-bold text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                    <span>Toque em <strong className="text-foreground">"Instalar app"</strong> ou <strong className="text-foreground">"Adicionar à tela inicial"</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-muted text-foreground font-bold text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                    <span>Confirme tocando em <strong className="text-foreground">"Instalar"</strong></span>
                  </li>
                </ol>
              </CardContent>
            </Card>

            {/* iOS */}
            <Card className={`w-full transition-all ${isIOS ? 'ring-2 ring-primary/30' : ''}`}>
              <CardContent className="pt-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                    <Smartphone className="w-5 h-5 text-foreground" />
                  </div>
                  <h3 className="font-semibold text-foreground">
                    iPhone / iPad (Safari)
                    {isIOS && <span className="text-xs ml-2 text-primary font-normal">— Seu dispositivo</span>}
                  </h3>
                </div>
                <ol className="space-y-2 text-sm text-muted-foreground ml-1">
                  <li className="flex items-start gap-2">
                    <span className="bg-muted text-foreground font-bold text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                    <span>Abra esta página no <strong className="text-foreground">Safari</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-muted text-foreground font-bold text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                    <span>Toque no ícone <Share className="w-4 h-4 inline-block mx-0.5 text-foreground" /> de compartilhar (parte inferior)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-muted text-foreground font-bold text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                    <span>Role para baixo e toque em <strong className="text-foreground">"Adicionar à Tela de Início"</strong> <PlusSquare className="w-4 h-4 inline-block mx-0.5 text-foreground" /></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-muted text-foreground font-bold text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">4</span>
                    <span>Toque em <strong className="text-foreground">"Adicionar"</strong></span>
                  </li>
                </ol>
              </CardContent>
            </Card>

            {/* Desktop */}
            <Card className={`w-full transition-all ${!isIOS && !isAndroid ? 'ring-2 ring-primary/30' : ''}`}>
              <CardContent className="pt-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-info/10 flex items-center justify-center">
                    <Monitor className="w-5 h-5 text-info" />
                  </div>
                  <h3 className="font-semibold text-foreground">
                    Computador (Chrome / Edge)
                    {!isIOS && !isAndroid && <span className="text-xs ml-2 text-primary font-normal">— Seu dispositivo</span>}
                  </h3>
                </div>
                <ol className="space-y-2 text-sm text-muted-foreground ml-1">
                  <li className="flex items-start gap-2">
                    <span className="bg-muted text-foreground font-bold text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                    <span>Clique no ícone <Download className="w-4 h-4 inline-block mx-0.5 text-foreground" /> na barra de endereço do navegador</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-muted text-foreground font-bold text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                    <span>Clique em <strong className="text-foreground">"Instalar"</strong></span>
                  </li>
                </ol>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Benefits */}
        {!isInstalled && (
          <div className="mt-8 w-full animate-fadeIn">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider text-center mb-4">
              Vantagens do App
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center space-y-2">
                <div className="w-10 h-10 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                  <Rocket className="w-5 h-5 text-primary" />
                </div>
                <p className="text-xs text-muted-foreground">Acesso rápido pela tela inicial</p>
              </div>
              <div className="text-center space-y-2">
                <div className="w-10 h-10 mx-auto rounded-full bg-success/10 flex items-center justify-center">
                  <Wifi className="w-5 h-5 text-success" />
                </div>
                <p className="text-xs text-muted-foreground">Funciona mesmo offline</p>
              </div>
              <div className="text-center space-y-2">
                <div className="w-10 h-10 mx-auto rounded-full bg-warning/10 flex items-center justify-center">
                  <BellRing className="w-5 h-5 text-warning" />
                </div>
                <p className="text-xs text-muted-foreground">Experiência de app nativo</p>
              </div>
            </div>
          </div>
        )}

        {/* Skip link */}
        {!isInstalled && (
          <div className="mt-8 text-center animate-fadeIn">
            <Link to="/login" className="text-sm text-muted-foreground hover:text-primary transition-colors underline underline-offset-4">
              Continuar sem instalar →
            </Link>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-xs text-muted-foreground">
        © 2026 AnnITech — Sistema GIRA
      </footer>
    </div>
  );
};
