import React from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, ArrowLeft, Shield, BarChart3, Cpu, TrendingUp } from 'lucide-react';
import { exportMaturityAuditToPdf } from '@/lib/maturityAuditPdfExport';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const MaturityAuditReport: React.FC = () => {
  const navigate = useNavigate();

  const handleExport = () => {
    try {
      exportMaturityAuditToPdf();
      toast.success('PDF da Análise de Maturidade exportado com sucesso!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao gerar PDF');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-lg w-full text-center space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Análise de Maturidade Tecnológica</h1>
          <p className="text-muted-foreground">GIRA Diário de Bordo — Relatório Estratégico para Investidores</p>
        </div>

        <div className="grid grid-cols-2 gap-4 text-left">
          <div className="bg-card border rounded-lg p-4 space-y-1">
            <Cpu className="h-5 w-5 text-primary" />
            <p className="text-sm font-semibold text-foreground">Nível 3.5/5</p>
            <p className="text-xs text-muted-foreground">SaaS em Transição</p>
          </div>
          <div className="bg-card border rounded-lg p-4 space-y-1">
            <Shield className="h-5 w-5 text-primary" />
            <p className="text-sm font-semibold text-foreground">Segurança 7.6/10</p>
            <p className="text-xs text-muted-foreground">RBAC + RLS + MFA</p>
          </div>
          <div className="bg-card border rounded-lg p-4 space-y-1">
            <BarChart3 className="h-5 w-5 text-primary" />
            <p className="text-sm font-semibold text-foreground">72% Estado da Arte</p>
            <p className="text-xs text-muted-foreground">Acima do segmento</p>
          </div>
          <div className="bg-card border rounded-lg p-4 space-y-1">
            <TrendingUp className="h-5 w-5 text-primary" />
            <p className="text-sm font-semibold text-foreground">3–5x Valuation</p>
            <p className="text-xs text-muted-foreground">Potencial com IA</p>
          </div>
        </div>

        <Button size="lg" onClick={handleExport} className="w-full gap-2">
          <FileDown className="h-5 w-5" />
          Baixar PDF — Análise de Maturidade
        </Button>

        <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
      </div>
    </div>
  );
};

export default MaturityAuditReport;
