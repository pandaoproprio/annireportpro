import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, XCircle, Award, CalendarDays, User, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { EventCertificate } from '../types';

const CertificateVerifyPage: React.FC = () => {
  const { hash } = useParams<{ hash: string }>();

  const { data: cert, isLoading, error } = useQuery({
    queryKey: ['certificate-verify', hash],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_certificates')
        .select('*')
        .eq('certificate_hash', hash!)
        .single();
      if (error) throw error;
      return data as unknown as EventCertificate;
    },
    enabled: !!hash,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center p-4">
        <Skeleton className="h-64 w-full max-w-lg" />
      </div>
    );
  }

  if (error || !cert) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardContent className="pt-6 text-center space-y-3">
            <XCircle className="w-16 h-16 text-destructive mx-auto" />
            <h2 className="text-lg font-bold text-foreground">Certificado não encontrado</h2>
            <p className="text-sm text-muted-foreground">
              O hash informado não corresponde a nenhum certificado válido.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-2">
            <CheckCircle2 className="w-16 h-16 text-[hsl(var(--success))]" />
          </div>
          <CardTitle className="text-lg text-[hsl(var(--success))]">Certificado Válido</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-accent/30 border rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Award className="w-4 h-4 text-primary" />
              <span className="font-medium">Certificado de Participação</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-muted-foreground" />
              <span><strong>Participante:</strong> {cert.participant_name}</span>
            </div>
            {cert.participant_document && (
              <div className="flex items-center gap-2 text-sm">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span><strong>Documento:</strong> {cert.participant_document}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <CalendarDays className="w-4 h-4 text-muted-foreground" />
              <span><strong>Evento:</strong> {cert.event_title}</span>
            </div>
            <div className="text-sm">
              <strong>Data do evento:</strong>{' '}
              {format(new Date(cert.event_date), "dd/MM/yyyy", { locale: ptBR })}
            </div>
            {cert.event_duration_hours && (
              <div className="text-sm">
                <strong>Carga horária:</strong> {cert.event_duration_hours}h
              </div>
            )}
            <div className="text-sm">
              <strong>Emitido em:</strong>{' '}
              {format(new Date(cert.issued_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </div>
          </div>

          <div className="border-t pt-3">
            <p className="text-[10px] text-muted-foreground text-center leading-tight">
              Hash de verificação: <code className="bg-muted px-1 rounded">{cert.certificate_hash}</code>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CertificateVerifyPage;
