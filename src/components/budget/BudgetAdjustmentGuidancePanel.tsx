import React, { useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  Upload, Download, FileSpreadsheet, PlayCircle, Info, AlertTriangle, Calendar, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  parseExecutionReport, parsePtTemplate, matchExecuted,
  exportAdjustmentXlsx, type ExecutionRecord,
} from '@/lib/budgetAdjustmentXlsx';
import type { BudgetAdjustment, BudgetAdjustmentItem, AdjustmentItemForm } from '@/hooks/useBudgetAdjustments';

interface Props {
  adjustment: BudgetAdjustment;
  items: BudgetAdjustmentItem[];
  projectName: string;
  onAddItem: (adjustmentId: string, item: Partial<AdjustmentItemForm>) => Promise<boolean>;
  onUpdateItem: (itemId: string, updates: Partial<AdjustmentItemForm>) => Promise<boolean>;
}

const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const BudgetAdjustmentGuidancePanel: React.FC<Props> = ({
  adjustment, items, projectName, onAddItem, onUpdateItem,
}) => {
  const ptInputRef = useRef<HTMLInputElement>(null);
  const execInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState<'pt' | 'exec' | null>(null);

  const handleImportPt = async (file: File) => {
    setImporting('pt');
    try {
      const buf = await file.arrayBuffer();
      const parsed = parsePtTemplate(buf);
      if (parsed.length === 0) {
        toast.error('Nenhum item encontrado na planilha.');
        return;
      }
      let added = 0;
      for (let i = 0; i < parsed.length; i++) {
        const p = parsed[i];
        const ok = await onAddItem(adjustment.id, {
          ...p,
          executed_amount: 0,
          new_specification: p.specification,
          new_unit_value: p.original_unit_value,
          new_unit_measure: p.original_unit_measure,
          new_quantity: p.original_quantity,
          new_total: p.original_total,
          justification: p.proposal === 'manter' ? 'Item mantido.' : '',
          price_ref_1: '', price_ref_1_value: 0,
          price_ref_2: '', price_ref_2_value: 0,
          price_ref_3: '', price_ref_3_value: 0,
          price_average: 0,
          sort_order: items.length + i,
          is_new_item: false,
        });
        if (ok) added++;
      }
      toast.success(`${added} itens importados do PT.`);
    } catch (e: any) {
      toast.error('Erro ao importar planilha', { description: e.message });
    } finally {
      setImporting(null);
      if (ptInputRef.current) ptInputRef.current.value = '';
    }
  };

  const handleImportExecution = async (file: File) => {
    setImporting('exec');
    try {
      const buf = await file.arrayBuffer();
      const records = parseExecutionReport(buf);
      if (records.length === 0) {
        toast.error('Nenhum registro de execução encontrado.');
        return;
      }
      let updated = 0;
      let unmatched = 0;
      for (const item of items) {
        const match = matchExecuted(item.specification, records);
        if (match) {
          const ok = await onUpdateItem(item.id, { executed_amount: match.totalExecuted });
          if (ok) updated++;
        } else {
          unmatched++;
        }
      }
      toast.success(`${updated} itens atualizados com valores executados.`, {
        description: unmatched > 0 ? `${unmatched} itens sem correspondência.` : undefined,
      });
    } catch (e: any) {
      toast.error('Erro ao importar relatório de execução', { description: e.message });
    } finally {
      setImporting(null);
      if (execInputRef.current) execInputRef.current.value = '';
    }
  };

  const handleExport = () => {
    try {
      const blob = exportAdjustmentXlsx(items, {
        projectName,
        title: adjustment.title,
        raBalance: Number(adjustment.ra_balance) || 0,
        raJustification: adjustment.ra_justification || '',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Ajuste_PT_${projectName.replace(/[^\w]/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Planilha exportada no formato MDHC.');
    } catch (e: any) {
      toast.error('Erro ao exportar', { description: e.message });
    }
  };

  // Validation warnings
  const warnings: { item: BudgetAdjustmentItem; msg: string }[] = [];
  items.forEach(it => {
    if (it.is_new_item) return;
    const exec = Number(it.executed_amount) || 0;
    const orig = Number(it.original_total) || 0;
    if (exec <= 0) return;
    const fullyExecuted = exec >= orig * 0.999;
    if (fullyExecuted && it.proposal !== 'manter') {
      warnings.push({ item: it, msg: 'Item 100% executado deve ser MANTIDO.' });
    } else if (exec > 0 && !fullyExecuted && it.proposal === 'excluir') {
      warnings.push({ item: it, msg: 'Item parcialmente executado não pode ser EXCLUÍDO. Use ALTERAR.' });
    }
    if (it.proposal === 'alterar' && Number(it.new_total) < exec) {
      warnings.push({ item: it, msg: `Novo valor (${fmt(Number(it.new_total))}) menor que o já executado (${fmt(exec)}).` });
    }
  });

  return (
    <Card className="border-orange-200 dark:border-orange-900/50 bg-orange-50/30 dark:bg-orange-950/10">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Info className="w-4 h-4 text-orange-600" />
          Orientações e Ferramentas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Toolbar */}
        <div className="flex flex-wrap gap-2">
          <input
            ref={ptInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={e => e.target.files?.[0] && handleImportPt(e.target.files[0])}
          />
          <Button
            variant="outline" size="sm" className="gap-1"
            disabled={importing === 'pt'}
            onClick={() => ptInputRef.current?.click()}
          >
            {importing === 'pt' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
            Importar PT (modelo CEAP)
          </Button>

          <input
            ref={execInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={e => e.target.files?.[0] && handleImportExecution(e.target.files[0])}
          />
          <Button
            variant="outline" size="sm" className="gap-1"
            disabled={importing === 'exec' || items.length === 0}
            onClick={() => execInputRef.current?.click()}
          >
            {importing === 'exec' ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileSpreadsheet className="w-3 h-3" />}
            Importar Execução TransfereGov
          </Button>

          <Button
            variant="default" size="sm" className="gap-1"
            disabled={items.length === 0}
            onClick={handleExport}
          >
            <Download className="w-3 h-3" />
            Exportar para MDHC (.xlsx)
          </Button>
        </div>

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-900/20 p-3 space-y-2">
            <p className="text-sm font-medium text-amber-900 dark:text-amber-200 flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" />
              {warnings.length} alerta(s) de execução
            </p>
            <ul className="text-xs text-amber-800 dark:text-amber-300 space-y-1 max-h-40 overflow-y-auto">
              {warnings.map((w, i) => (
                <li key={i}>
                  <strong>{w.item.item_number} {w.item.specification}:</strong> {w.msg}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Accordion with steps */}
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="video">
            <AccordionTrigger className="text-sm">
              <span className="flex items-center gap-2">
                <PlayCircle className="w-4 h-4 text-primary" />
                Vídeo Explicativo (preenchimento da planilha)
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <video
                src="/videos/ajuste-pt-explicativo.mp4"
                controls
                preload="metadata"
                className="w-full rounded-md border"
              >
                Seu navegador não suporta vídeo HTML5.
              </video>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="steps">
            <AccordionTrigger className="text-sm">
              <span className="flex items-center gap-2">
                <Info className="w-4 h-4 text-primary" />
                Os 4 Passos do Ajuste de PT/RA
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-3 text-sm">
              <div>
                <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30">PASSO 1</Badge>
                <p className="mt-1 text-muted-foreground">
                  Indique a proposta para cada item: <strong>MANTER</strong>, <strong>ALTERAR</strong> ou <strong>EXCLUIR</strong>.
                </p>
              </div>
              <div>
                <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30">PASSO 2</Badge>
                <p className="mt-1 text-muted-foreground">
                  Descreva o ajuste: especificação, valor unitário, unid., qtde. e total. Inclua também itens NOVOS que não existem na proposta original.
                </p>
              </div>
              <div>
                <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/30">PASSO 3</Badge>
                <p className="mt-1 text-muted-foreground">
                  Justifique cada alteração, exclusão ou inclusão de forma <strong>DETALHADA e FUNDAMENTADA</strong>. Justificativas genéricas como "precisamos incluir este serviço" não serão aceitas pelo Ministério.
                </p>
              </div>
              <div>
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30">PASSO 4</Badge>
                <p className="mt-1 text-muted-foreground">
                  Justificativa do uso do <strong>Saldo de Rendimento de Aplicação (RA)</strong> com cronograma detalhado das atividades.
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="rules">
            <AccordionTrigger className="text-sm">
              <span className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Regras Importantes do MDHC
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-2 text-sm text-muted-foreground">
              <p>• Itens <strong>100% executados</strong> devem ser MANTIDOS.</p>
              <p>• Itens <strong>parcialmente executados</strong> não podem ser excluídos — apenas alterados, mantendo o valor já executado.</p>
              <p>• Qualquer alteração de valor exige <strong>3 orçamentos</strong> ou parametrização por consultoria técnica.</p>
              <p>• Recomenda-se manter o valor unitário próximo ao já praticado (ex.: Coord. Geral pago R$ 4.000 → sugerir até R$ 4.000).</p>
              <p>• Inclua apenas <strong>itens NOVOS</strong>, que não existem na proposta original.</p>
              <p>• Após envio: pré-aprovação em até 3 dias úteis. Análise final pode levar até <strong>30 dias</strong>.</p>
              <p>• Itens em ajuste <strong>não devem ser contratados ou pagos</strong> até a aprovação. Demais itens podem ser executados normalmente.</p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="deadlines">
            <AccordionTrigger className="text-sm">
              <span className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-red-600" />
                Prazos Críticos
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-2 text-sm">
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-3">
                <p className="font-medium text-red-900 dark:text-red-200">Vigência final: 30/04/2026</p>
              </div>
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded p-3">
                <p className="font-medium text-amber-900 dark:text-amber-200">Envio do ajuste: até 28/02/2026</p>
                <p className="text-xs text-amber-800 dark:text-amber-300 mt-1">
                  Considerando o prazo legal de 30 dias do Ministério para análise.
                </p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-3">
                <p className="font-medium text-blue-900 dark:text-blue-200">Pedido de TA prorrogação: até 15/03/2026</p>
                <p className="text-xs text-blue-800 dark:text-blue-300 mt-1">
                  Exige 1) justificativa do pedido e 2) cronograma atualizado de entregas.
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
};
