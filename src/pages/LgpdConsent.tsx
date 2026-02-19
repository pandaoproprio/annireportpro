import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export const LgpdConsent: React.FC = () => {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const canProceed = acceptedTerms && acceptedPrivacy;

  const handleAccept = async () => {
    if (!user || !canProceed) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ lgpd_consent_at: new Date().toISOString() })
        .eq('user_id', user.id);

      if (error) throw error;

      // refreshProfile does setState synchronously after fetch,
      // so profile/hasLgpdConsent will be updated before navigate executes
      await refreshProfile();
      toast.success('Consentimento registrado com sucesso!');
      navigate('/', { replace: true });
    } catch (err) {
      console.error('Error saving consent:', err);
      toast.error('Erro ao registrar consentimento. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-[100dvh] flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="w-7 h-7 text-primary" />
          </div>
          <CardTitle className="text-2xl">Consentimento de Uso</CardTitle>
          <p className="text-sm text-muted-foreground">
            Para continuar usando o sistema, é necessário ler e aceitar nossos termos.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground space-y-2">
            <p>
              O GIRA Relatórios coleta e processa dados pessoais (nome, e-mail, dados de projetos) 
              exclusivamente para viabilizar a gestão de projetos sociais e geração de relatórios 
              de prestação de contas, conforme a Lei Geral de Proteção de Dados (LGPD – Lei nº 13.709/2018).
            </p>
            <p>
              Ao aceitar, você autoriza o tratamento dos seus dados para as finalidades descritas 
              em nossa Política de Privacidade e concorda com os Termos de Uso do sistema.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Checkbox
                id="terms"
                checked={acceptedTerms}
                onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
              />
              <label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer">
                Li e aceito os{' '}
                <a href="/licenca" target="_blank" className="text-primary underline inline-flex items-center gap-1">
                  Termos de Uso <ExternalLink className="w-3 h-3" />
                </a>
              </label>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="privacy"
                checked={acceptedPrivacy}
                onCheckedChange={(checked) => setAcceptedPrivacy(checked === true)}
              />
              <label htmlFor="privacy" className="text-sm leading-relaxed cursor-pointer">
                Li e aceito a{' '}
                <a href="/lgpd" target="_blank" className="text-primary underline inline-flex items-center gap-1">
                  Política de Privacidade <ExternalLink className="w-3 h-3" />
                </a>
              </label>
            </div>
          </div>

          <Button
            onClick={handleAccept}
            disabled={!canProceed || isSaving}
            className="w-full"
            size="lg"
          >
            {isSaving ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Registrando...</>
            ) : (
              'Aceitar e Continuar'
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Você pode revogar seu consentimento a qualquer momento entrando em contato com o administrador do sistema.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
