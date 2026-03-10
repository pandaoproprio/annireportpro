import React from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, ArrowLeft, Shield, BarChart3, Cpu, TrendingUp, Target, Zap } from 'lucide-react';
import { exportMaturityAuditToPdf } from '@/lib/maturityAuditPdfExport';
import { exportFullMaturityAuditToPdf } from '@/lib/fullMaturityAuditPdfExport';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const dimensions = [
  { icon: Target, label: 'PMBOK', score: '2.0/5', desc: 'Estruturado', color: 'text-blue-600' },
  { icon: BarChart3, label: 'Ágil', score: '2.5/5', desc: 'Kanban + Métricas', color: 'text-emerald-600' },
  { icon: Cpu, label: 'Cognitivo', score: '2.2/5', desc: 'IA Assistida', color: 'text-purple-600' },
  { icon: Zap, label: 'Automação', score: '2.3/5', desc: 'Triggers + Cron', color: 'text-amber-600' },
  { icon: TrendingUp, label: 'Analytics', score: '2.0/5', desc: 'Dashboards + KPIs', color: 'text-cyan-600' },
  { icon: Shield, label: 'Governança', score: '3.2/5', desc: 'RBAC + RLS + Audit', color: 'text-rose-600' },
];

const MaturityAuditReport: React.FC = () => {
  const navigate = useNavigate();

  const handleExportTech = () => {
    try {
      exportMaturityAuditToPdf();
      toast.success('PDF da Análise Tecnológica exportado!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao gerar PDF');
    }
  };

  const handleExportFull = () => {
    try {
      exportFullMaturityAuditToPdf();
      toast.success('PDF da Auditoria Completa exportado!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao gerar PDF');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-2xl w-full text-center space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Auditoria Completa de Maturidade</h1>
          <p className="text-muted-foreground">GIRA Diário de Bordo — PMBOK • Ágil • Cognitivo • Automação</p>
        </div>

        <div className="bg-card border rounded-xl p-6 space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Maturidade Geral</p>
          <p className="text-4xl font-bold text-primary">2.4 / 5</p>
          <p className="text-sm text-muted-foreground">Nível Estruturado</p>
          <div className="w-full bg-muted rounded-full h-3 mt-2">
            <div className="bg-primary h-3 rounded-full transition-all" style={{ width: '48%' }} />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-left">
          {dimensions.map((d) => (
            <div key={d.label} className="bg-card border rounded-lg p-4 space-y-1">
              <d.icon className={`h-5 w-5 ${d.color}`} />
              <p className="text-sm font-semibold text-foreground">{d.label}: {d.score}</p>
              <p className="text-xs text-muted-foreground">{d.desc}</p>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <Button size="lg" onClick={handleExportFull} className="w-full gap-2">
            <FileDown className="h-5 w-5" />
            Baixar PDF — Auditoria Completa (PMBOK + Ágil + Cognitivo)
          </Button>

          <Button size="lg" variant="outline" onClick={handleExportTech} className="w-full gap-2">
            <FileDown className="h-5 w-5" />
            Baixar PDF — Análise Tecnológica (Investidores)
          </Button>
        </div>

        <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
      </div>
    </div>
  );
};

export default MaturityAuditReport;
