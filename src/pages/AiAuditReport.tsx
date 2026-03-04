import React from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, ArrowLeft } from 'lucide-react';
import { exportAiAuditToPdf } from '@/lib/aiAuditPdfExport';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const AiAuditReport: React.FC = () => {
  const navigate = useNavigate();

  const handleExport = () => {
    try {
      exportAiAuditToPdf();
      toast.success('PDF da Auditoria de IA exportado com sucesso!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao gerar PDF');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Auditoria de Inteligência Artificial</h1>
        <p className="text-muted-foreground">GIRA Diário de Bordo — Análise do Nível de IA e Oportunidades</p>
        <Button size="lg" onClick={handleExport} className="w-full gap-2">
          <FileDown className="h-5 w-5" />
          Baixar PDF da Auditoria de IA
        </Button>
        <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
      </div>
    </div>
  );
};

export default AiAuditReport;
