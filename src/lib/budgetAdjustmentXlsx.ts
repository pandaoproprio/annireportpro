import * as XLSX from 'xlsx';
import type { BudgetAdjustmentItem, AdjustmentItemForm } from '@/hooks/useBudgetAdjustments';

/**
 * Parse the official "RelatorioItensDespesasPAD" XLSX from TransfereGov
 * and return a map of item specification → executed amount.
 *
 * The report has metadata in the first ~20 rows then a header:
 * Tipo Despesa | Descrição | Cód. Nat. Despesa | Unid | Quantidade | Valor Unit | Valor Total Previsto | Valor Total Executado | Saldo
 */
export interface ExecutionRecord {
  description: string;
  unit: string;
  quantity: number;
  unitValue: number;
  totalPlanned: number;
  totalExecuted: number;
  balance: number;
}

export function parseExecutionReport(file: ArrayBuffer): ExecutionRecord[] {
  const wb = XLSX.read(file, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  // find header row (contains "Tipo Despesa" and "Valor Total Executado")
  const headerIdx = rows.findIndex(
    r => r.some(c => String(c).trim() === 'Tipo Despesa') &&
         r.some(c => String(c).includes('Executado'))
  );
  if (headerIdx < 0) return [];

  const out: ExecutionRecord[] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const r = rows[i];
    const desc = String(r[1] || '').trim();
    if (!desc) continue;
    out.push({
      description: desc,
      unit: String(r[3] || '').trim(),
      quantity: Number(r[4]) || 0,
      unitValue: Number(r[5]) || 0,
      totalPlanned: Number(r[6]) || 0,
      totalExecuted: Number(r[7]) || 0,
      balance: Number(r[8]) || 0,
    });
  }
  return out;
}

/**
 * Parse the official CEAP_AJUSTE_DE_PT_RA template. Reads the "DE" columns
 * (B–H) and returns rows ready to be inserted as original items.
 *
 * Layout (1-indexed from row 5):
 * A: Nº Item (filtro)  B: Nº  C: Especificação  D: Descrição
 * E: Valor Médio Unitário  F: Unid. medida  G: Qtde.  H: Valor Total
 * I: PROPOSTA (manter/alterar/excluir)
 */
export interface PtTemplateItem {
  item_number: string;
  specification: string;
  description: string;
  original_unit_value: number;
  original_unit_measure: string;
  original_quantity: number;
  original_total: number;
  proposal: 'manter' | 'alterar' | 'excluir';
  meta_group: string;
}

export function parsePtTemplate(file: ArrayBuffer): PtTemplateItem[] {
  const wb = XLSX.read(file, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  const out: PtTemplateItem[] = [];
  let currentMeta = '';

  // Skip the first 4 header rows
  for (let i = 4; i < rows.length; i++) {
    const r = rows[i];
    const numCell = String(r[1] || '').trim();
    const specCell = String(r[2] || '').trim();

    // Detect META group header (has text in col B starting with "META" and no spec)
    if (/^\s*META\s+\d/i.test(numCell) || /^\s*META\s+\d/i.test(specCell)) {
      currentMeta = (numCell || specCell).trim();
      continue;
    }
    // Skip etapa subtitles
    if (/^\s*Etapa\s+/i.test(numCell)) continue;

    const itemNumber = numCell;
    if (!itemNumber || !specCell) continue;
    if (isNaN(Number(itemNumber.replace(',', '.')))) continue;

    const proposalRaw = String(r[8] || 'MANTER').trim().toLowerCase();
    const proposal: 'manter' | 'alterar' | 'excluir' =
      proposalRaw.startsWith('alter') ? 'alterar' :
      proposalRaw.startsWith('exclu') ? 'excluir' : 'manter';

    out.push({
      item_number: itemNumber,
      specification: specCell,
      description: String(r[3] || '').trim(),
      original_unit_value: Number(r[4]) || 0,
      original_unit_measure: String(r[5] || 'Unidade').trim(),
      original_quantity: Number(r[6]) || 0,
      original_total: Number(r[7]) || 0,
      proposal,
      meta_group: currentMeta,
    });
  }
  return out;
}

/**
 * Match an execution record to an item by fuzzy specification match.
 * Returns the matched executed amount or null.
 */
export function matchExecuted(
  itemSpec: string,
  executions: ExecutionRecord[],
): ExecutionRecord | null {
  const norm = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
  const target = norm(itemSpec);
  // Try exact match first
  let hit = executions.find(e => norm(e.description) === target);
  if (hit) return hit;
  // Try item code prefix match (e.g. "1.21." or "2.3.")
  const codeMatch = target.match(/^(\d+\.\d+\.?)/);
  if (codeMatch) {
    hit = executions.find(e => norm(e.description).startsWith(codeMatch[1]));
    if (hit) return hit;
  }
  // Try contains
  hit = executions.find(e => norm(e.description).includes(target.slice(0, 30)));
  return hit || null;
}

/**
 * Export the adjustment as the official MDHC-format XLSX.
 */
export function exportAdjustmentXlsx(
  items: BudgetAdjustmentItem[],
  meta: { projectName: string; title: string; raBalance: number; raJustification: string },
): Blob {
  const fmt = (n: number) => Number(n) || 0;

  // Header rows
  const data: any[][] = [
    [`Projeto: ${meta.projectName}`, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    [`Ajuste: ${meta.title}`, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    [],
    ['', 'DE', '', '', '', '', '', '', 'PROPOSTA DE AJUSTE', 'PARA', '', '', '', '', '', 'JUSTIFICATIVA DO AJUSTE',
      'PARÂMETRO 1', 'VALOR UNITÁRIO', 'PARÂMETRO 2', 'VALOR UNITÁRIO', 'PARÂMETRO 3', 'VALOR UNITÁRIO', 'MÉDIA'],
    ['Nº Item', 'Nº', 'Especificação do item de despesa', 'Descrição do Serviço', 'Valor Médio Unitário', 'Unid. medida', 'Qtde.', 'Valor Total',
      '', 'Nº', 'Especificação do item de despesa', 'Valor Médio Unitário', 'Unid. medida', 'Qtde.', 'Valor Total',
      '', '', '', '', '', '', '', ''],
  ];

  const propLabel = (p: string) =>
    p === 'manter' ? 'MANTER' : p === 'alterar' ? 'ALTERAR' : 'EXCLUIR';

  // Group by meta
  const groups = new Map<string, BudgetAdjustmentItem[]>();
  items.forEach(it => {
    const key = it.meta_group || 'SEM META';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(it);
  });

  groups.forEach((groupItems, metaName) => {
    data.push([metaName, '', '', '', '', '', '', '', '-', metaName, '', '', '', '', '', '-', '-', '-', '-', '-', '-', '-', '-']);
    groupItems.forEach((it, idx) => {
      const isExcluded = it.proposal === 'excluir';
      data.push([
        '',
        it.item_number,
        it.specification,
        it.description,
        fmt(it.original_unit_value),
        it.original_unit_measure,
        fmt(it.original_quantity),
        fmt(it.original_total),
        propLabel(it.proposal),
        it.is_new_item ? 'NOVO' : it.item_number,
        isExcluded ? 'ITEM EXCLUÍDO' : (it.new_specification || it.specification),
        isExcluded ? 'ITEM EXCLUÍDO' : fmt(it.new_unit_value),
        isExcluded ? 'ITEM EXCLUÍDO' : it.new_unit_measure,
        isExcluded ? 'ITEM EXCLUÍDO' : fmt(it.new_quantity),
        isExcluded ? '' : fmt(it.new_total),
        it.justification || (it.proposal === 'manter' ? 'Item mantido.' : ''),
        it.price_ref_1 || '-', it.price_ref_1_value ? fmt(it.price_ref_1_value) : '-',
        it.price_ref_2 || '-', it.price_ref_2_value ? fmt(it.price_ref_2_value) : '-',
        it.price_ref_3 || '-', it.price_ref_3_value ? fmt(it.price_ref_3_value) : '-',
        it.price_average ? fmt(it.price_average) : '-',
      ]);
    });
  });

  // RA section
  data.push([]);
  data.push(['SALDO DE RENDIMENTO DE APLICAÇÃO (RA)']);
  data.push(['Saldo (R$)', meta.raBalance]);
  data.push(['Justificativa e cronograma:']);
  data.push([meta.raJustification]);

  const ws = XLSX.utils.aoa_to_sheet(data);
  // column widths
  ws['!cols'] = [
    { wch: 8 }, { wch: 6 }, { wch: 38 }, { wch: 50 }, { wch: 14 }, { wch: 12 }, { wch: 8 }, { wch: 14 },
    { wch: 14 }, { wch: 6 }, { wch: 38 }, { wch: 14 }, { wch: 12 }, { wch: 8 }, { wch: 14 },
    { wch: 50 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 12 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'AJUSTE_PT');
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
