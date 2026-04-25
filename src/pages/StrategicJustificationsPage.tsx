import React, { useState, useMemo, useEffect } from 'react';
import { useProjects } from '@/hooks/useProjects';
import { useLegalJustifications, TYPE_LABELS, STATUS_LABELS, type LegalJustificationType, type LegalJustification, type JustificationSignature } from '@/hooks/useLegalJustifications';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Sparkles, Lock, Download, Trash2, Plus, Loader2, ShieldCheck, Pen, Lightbulb, History } from 'lucide-react';
import { toast } from 'sonner';
import { exportJustificationPDF, exportJustificationDOCX } from '@/lib/legalJustificationExport';

const TYPES: LegalJustificationType[] = ['ajuste_pt','prorrogacao_vigencia','execucao_financeira','despesa_nao_prevista','atraso_execucao','substituicao_fornecedor','cancelamento_meta'];

const StrategicJustificationsPage: React.FC = () => {
  const { projects } = useProjects();
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const projectList = useMemo(() => projects.filter(p => !(p as any).deletedAt), [projects]);
  const project = useMemo(() => projectList.find(p => p.id === selectedProjectId), [projectList, selectedProjectId]);

  const { items, loading, create, update, remove, generateAI, saveVersion, seal, fetchAll } = useLegalJustifications();

  const [wizardOpen, setWizardOpen] = useState(false);
  const [editingJust, setEditingJust] = useState<LegalJustification | null>(null);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <FileText className="w-8 h-8 text-primary" /> Gerador de Justificativas
          </h1>
          <p className="text-muted-foreground mt-1">7 tipos jurídicos · Lei 13.019/2014 · Portaria 424/2016 · IA + lacre + verificação</p>
        </div>
        <Button onClick={() => { setWizardOpen(true); setEditingJust(null); }} disabled={!project}>
          <Plus className="w-4 h-4 mr-2" /> Nova Justificativa
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Selecione o projeto</CardTitle></CardHeader>
        <CardContent>
          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger><SelectValue placeholder="Selecione um Termo de Fomento" /></SelectTrigger>
            <SelectContent>
              {projectList.map(p => <SelectItem key={p.id} value={p.id}>{p.name} · {(p as any).fomentoNumber || (p as any).fomento_number}</SelectItem>)}
            </SelectContent>
          </Select>
          {project && !(project as any).organizationCnpj && !(project as any).organization_cnpj && (
            <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-2 flex items-center gap-2">
              <Lightbulb className="w-3 h-3" /> Este projeto não tem CNPJ/responsável legal preenchidos. Edite-o para que o documento saia completo.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Justificativas {selectedProjectId ? 'do projeto' : '(todas)'}</CardTitle>
          <CardDescription>Documentos finalizados são imutáveis (lacrados por hash SHA-256)</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto my-8" /> : (
            <div className="space-y-2">
              {items.filter(i => !selectedProjectId || i.project_id === selectedProjectId).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhuma justificativa criada ainda.</p>
              ) : items.filter(i => !selectedProjectId || i.project_id === selectedProjectId).map(j => (
                <div key={j.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{TYPE_LABELS[j.type]}</span>
                      <Badge className={STATUS_LABELS[j.status].color}>{STATUS_LABELS[j.status].label}</Badge>
                      {j.is_sealed && <Badge variant="outline" className="text-green-700"><Lock className="w-3 h-3 mr-1" />Lacrado</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Criado em {new Date(j.created_at).toLocaleString('pt-BR')}
                      {j.qr_verification_code && ` · Verificação: ${j.qr_verification_code}`}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => setEditingJust(j)}>
                      {j.is_sealed ? 'Visualizar' : 'Editar'}
                    </Button>
                    {!j.is_sealed && (
                      <Button size="sm" variant="ghost" onClick={async () => {
                        if (confirm('Excluir esta justificativa?')) { await remove(j.id); toast.success('Excluída'); }
                      }}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {wizardOpen && project && (
        <WizardDialog
          project={project}
          onClose={() => setWizardOpen(false)}
          onCreated={async (id) => {
            setWizardOpen(false);
            await fetchAll();
            const created = (await supabase.from('legal_justifications' as any).select('*').eq('id', id).maybeSingle()).data;
            if (created) setEditingJust(created as any);
          }}
          create={create}
          generateAI={generateAI}
          saveVersion={saveVersion}
        />
      )}

      {editingJust && (
        <EditorDialog
          just={editingJust}
          project={projectList.find(p => p.id === editingJust.project_id) || project!}
          onClose={() => setEditingJust(null)}
          update={update}
          generateAI={generateAI}
          saveVersion={saveVersion}
          seal={seal}
        />
      )}
    </div>
  );
};

// ─────────── Wizard de criação ───────────
const WizardDialog: React.FC<any> = ({ project, onClose, onCreated, create, generateAI, saveVersion }) => {
  const [step, setStep] = useState(1);
  const [type, setType] = useState<LegalJustificationType>('ajuste_pt');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [previousValue, setPreviousValue] = useState('');
  const [newValue, setNewValue] = useState('');
  const [involvedLines, setInvolvedLines] = useState('');
  const [reason, setReason] = useState('');
  const [adjustmentId, setAdjustmentId] = useState<string>('');
  const [adjustments, setAdjustments] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (project?.id) {
      supabase.from('budget_adjustments').select('id, title, status').eq('project_id', project.id).then(({ data }) => setAdjustments(data || []));
    }
  }, [project?.id]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const projectPayload = {
        ...project,
        fomento_number: (project as any).fomentoNumber || (project as any).fomento_number,
        organization_name: (project as any).organizationName || (project as any).organization_name,
        organization_cnpj: (project as any).organizationCnpj || (project as any).organization_cnpj,
        funder_cnpj: (project as any).funderCnpj || (project as any).funder_cnpj,
        global_value: (project as any).globalValue || (project as any).global_value,
        transfer_value: (project as any).transferValue || (project as any).transfer_value,
        counterpart_value: (project as any).counterpartValue || (project as any).counterpart_value,
        start_date: (project as any).startDate || (project as any).start_date,
        end_date: (project as any).endDate || (project as any).end_date,
      };

      let context: any = {};
      if (adjustmentId) {
        const { data: adj } = await supabase.from('budget_adjustments').select('*, items:budget_adjustment_items(*)').eq('id', adjustmentId).maybeSingle();
        context.budget_adjustment = adj;
      }

      const lines = involvedLines.split(',').map(s => s.trim()).filter(Boolean);
      const result = await generateAI({
        type,
        project: projectPayload,
        context,
        parameters: {
          reference_period_start: periodStart || null,
          reference_period_end: periodEnd || null,
          involved_budget_lines: lines,
          previous_value: previousValue ? Number(previousValue) : null,
          new_value: newValue ? Number(newValue) : null,
          user_reason: reason,
        },
      });

      const created = await create({
        project_id: project.id,
        type,
        status: 'gerado',
        budget_adjustment_id: adjustmentId || null,
        context_snapshot: context,
        reference_period_start: periodStart || null,
        reference_period_end: periodEnd || null,
        involved_budget_lines: lines,
        previous_value: previousValue ? Number(previousValue) : null,
        new_value: newValue ? Number(newValue) : null,
        user_reason: reason,
        document_title: result.title,
        document_body: result.body,
        legal_basis: result.legal_basis,
      });
      await saveVersion(created.id, result.body, result.legal_basis, 'ia', 'Geração inicial pela IA');
      toast.success('Justificativa gerada pela IA');
      onCreated(created.id);
    } catch (e: any) {
      toast.error(e.message || 'Erro ao gerar');
    } finally { setGenerating(false); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nova Justificativa — Passo {step}/3</DialogTitle>
          <DialogDescription>Projeto: {project?.name}</DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label>Tipo de Justificativa</Label>
              <Select value={type} onValueChange={(v) => setType(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {(type === 'ajuste_pt' || type === 'execucao_financeira') && adjustments.length > 0 && (
              <div>
                <Label>Vincular a Ajuste de PT (opcional)</Label>
                <Select value={adjustmentId} onValueChange={setAdjustmentId}>
                  <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhum</SelectItem>
                    {adjustments.map(a => <SelectItem key={a.id} value={a.id}>{a.title} · {a.status}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Período início</Label>
                <Input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)} />
              </div>
              <div>
                <Label>Período fim</Label>
                <Input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Rubricas envolvidas (separadas por vírgula)</Label>
              <Input value={involvedLines} onChange={e => setInvolvedLines(e.target.value)} placeholder="Ex: Material de consumo, Diárias" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Valor anterior (R$)</Label><Input type="number" step="0.01" value={previousValue} onChange={e => setPreviousValue(e.target.value)} /></div>
              <div><Label>Valor novo (R$)</Label><Input type="number" step="0.01" value={newValue} onChange={e => setNewValue(e.target.value)} /></div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <div>
              <Label>Motivo (descreva em linguagem livre — a IA transforma em texto jurídico)</Label>
              <Textarea rows={6} value={reason} onChange={e => setReason(e.target.value)} placeholder="Ex: Devido a chuvas atípicas em fevereiro, tivemos que reagendar 3 oficinas previstas..." />
            </div>
            <p className="text-xs text-muted-foreground">A IA gerará seções 2 a 7 do documento com fundamentação legal automática conforme o tipo selecionado.</p>
          </div>
        )}

        <DialogFooter className="gap-2">
          {step > 1 && <Button variant="outline" onClick={() => setStep(step - 1)}>Voltar</Button>}
          {step < 3 && <Button onClick={() => setStep(step + 1)}>Próximo</Button>}
          {step === 3 && (
            <Button onClick={handleGenerate} disabled={generating || !reason.trim()}>
              {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              Gerar com IA
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─────────── Editor + Assinaturas + Lacre + Export ───────────
const EditorDialog: React.FC<any> = ({ just, project, onClose, update, generateAI, saveVersion, seal }) => {
  const [body, setBody] = useState(just.document_body);
  const [signatures, setSignatures] = useState<JustificationSignature[]>([]);
  const [versions, setVersions] = useState<any[]>([]);
  const [regenInstr, setRegenInstr] = useState('');
  const [busy, setBusy] = useState(false);

  const reload = async () => {
    const { data: sigs } = await supabase.from('legal_justification_signatures' as any).select('*').eq('justification_id', just.id);
    setSignatures((sigs as any) || []);
    const { data: vers } = await supabase.from('legal_justification_versions' as any).select('*').eq('justification_id', just.id).order('version_number', { ascending: false });
    setVersions((vers as any) || []);
  };
  useEffect(() => { reload(); }, [just.id]);

  const projectPayload = {
    ...project,
    fomento_number: (project as any).fomentoNumber || (project as any).fomento_number,
    organization_name: (project as any).organizationName || (project as any).organization_name,
    organization_cnpj: (project as any).organizationCnpj || (project as any).organization_cnpj,
    funder_cnpj: (project as any).funderCnpj || (project as any).funder_cnpj,
    organization_address: (project as any).organizationAddress || (project as any).organization_address,
    legal_responsible_name: (project as any).legalResponsibleName || (project as any).legal_responsible_name,
    legal_responsible_cpf: (project as any).legalResponsibleCpf || (project as any).legal_responsible_cpf,
    legal_responsible_role: (project as any).legalResponsibleRole || (project as any).legal_responsible_role,
  };

  const handleSave = async () => {
    setBusy(true);
    try {
      await update(just.id, { document_body: body });
      await saveVersion(just.id, body, just.legal_basis, 'manual', 'Edição manual');
      toast.success('Salvo');
      reload();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  const handleRegen = async () => {
    setBusy(true);
    try {
      const result = await generateAI({
        type: just.type, project: projectPayload, context: just.context_snapshot,
        parameters: { ...just, regenerate_instruction: regenInstr },
      });
      setBody(result.body);
      await update(just.id, { document_body: result.body });
      await saveVersion(just.id, result.body, result.legal_basis, 'regenerate', regenInstr || 'Regeneração');
      toast.success('Regerado');
      reload();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  const addSigner = async (signer_type: 'responsavel_legal' | 'fornecedor') => {
    const name = prompt(signer_type === 'responsavel_legal' ? 'Nome do responsável legal:' : 'Nome do fornecedor:');
    if (!name) return;
    const cpf = prompt('CPF (responsável) ou CNPJ (fornecedor):') || '';
    const role = prompt('Cargo:') || '';
    const email = signer_type === 'fornecedor' ? prompt('Email para envio do link:') : null;
    await supabase.from('legal_justification_signatures' as any).insert({
      justification_id: just.id, signer_type, signer_name: name, signer_cpf_cnpj: cpf,
      signer_role: role, signer_email: email,
      signature_token: signer_type === 'fornecedor' ? crypto.randomUUID() : null,
    } as any);
    reload();
  };

  const markSigned = async (sig: JustificationSignature) => {
    await supabase.from('legal_justification_signatures' as any).update({
      signed: true, signed_at: new Date().toISOString(), signature_method: 'eletronica_simples',
    } as any).eq('id', sig.id);
    reload();
    // atualiza status
    const { data: sigs } = await supabase.from('legal_justification_signatures' as any).select('signed').eq('justification_id', just.id);
    const allSigs = (sigs as any) || [];
    const allSigned = allSigs.every((s: any) => s.signed);
    const newStatus = allSigned ? 'aguardando_assinatura' : 'parcialmente_assinado';
    await update(just.id, { status: allSigs.length === 0 ? 'gerado' : (allSigned ? 'aguardando_assinatura' : 'parcialmente_assinado') });
  };

  const handleSeal = async () => {
    if (!confirm('Lacrar este documento? Após o lacre nenhuma edição será permitida.')) return;
    setBusy(true);
    try {
      await seal(just.id);
      toast.success('Documento lacrado com hash SHA-256');
      onClose();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  const exportPDF = () => exportJustificationPDF(just, projectPayload, signatures);
  const exportDOCX = () => exportJustificationDOCX(just, projectPayload, signatures);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {just.document_title || TYPE_LABELS[just.type]}
            {just.is_sealed && <Badge variant="outline" className="text-green-700"><Lock className="w-3 h-3 mr-1" />Lacrado</Badge>}
          </DialogTitle>
          <DialogDescription>{just.legal_basis}</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="content">
          <TabsList>
            <TabsTrigger value="content">Conteúdo</TabsTrigger>
            <TabsTrigger value="signatures">Assinaturas ({signatures.length})</TabsTrigger>
            <TabsTrigger value="versions"><History className="w-3 h-3 mr-1" />Versões ({versions.length})</TabsTrigger>
            <TabsTrigger value="export">Exportar</TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="space-y-3">
            <Textarea rows={20} value={body} onChange={e => setBody(e.target.value)} disabled={just.is_sealed} className="font-serif text-sm" />
            {!just.is_sealed && (
              <>
                <div className="flex gap-2">
                  <Button onClick={handleSave} disabled={busy} variant="outline">Salvar edição</Button>
                </div>
                <div className="border rounded-lg p-3 bg-muted/30 space-y-2">
                  <Label className="text-xs">Regenerar com instrução adicional</Label>
                  <Input value={regenInstr} onChange={e => setRegenInstr(e.target.value)} placeholder="Ex: Mais formal, citar caso fortuito..." />
                  <Button size="sm" onClick={handleRegen} disabled={busy}>
                    {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                    Regenerar
                  </Button>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="signatures" className="space-y-3">
            {!just.is_sealed && (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => addSigner('responsavel_legal')}><Pen className="w-3 h-3 mr-1" />+ Responsável Legal</Button>
                <Button size="sm" variant="outline" onClick={() => addSigner('fornecedor')}><Pen className="w-3 h-3 mr-1" />+ Fornecedor</Button>
              </div>
            )}
            {signatures.map(sig => (
              <div key={sig.id} className="border rounded p-3 flex justify-between items-start">
                <div>
                  <div className="font-medium">{sig.signer_name}</div>
                  <div className="text-xs text-muted-foreground">{sig.signer_role} · {sig.signer_cpf_cnpj}</div>
                  <div className="text-xs">{sig.signer_type === 'responsavel_legal' ? 'Responsável Legal' : 'Fornecedor'}</div>
                  {sig.signer_email && <div className="text-xs">📧 {sig.signer_email}</div>}
                  {sig.signature_token && !sig.signed && (
                    <div className="text-xs mt-1 font-mono bg-muted p-1 rounded select-all">
                      {window.location.origin}/assinar/{sig.signature_token}
                    </div>
                  )}
                </div>
                <div>
                  {sig.signed ? (
                    <Badge className="bg-green-500/15 text-green-700">Assinado em {new Date(sig.signed_at!).toLocaleDateString('pt-BR')}</Badge>
                  ) : !just.is_sealed && (
                    <Button size="sm" onClick={() => markSigned(sig)}>Marcar como assinado</Button>
                  )}
                </div>
              </div>
            ))}
            {!just.is_sealed && signatures.length > 0 && signatures.every(s => s.signed) && (
              <Button onClick={handleSeal} className="w-full" disabled={busy}>
                <ShieldCheck className="w-4 h-4 mr-2" /> Lacrar documento (gerar hash SHA-256)
              </Button>
            )}
          </TabsContent>

          <TabsContent value="versions" className="space-y-2">
            {versions.map(v => (
              <div key={v.id} className="border rounded p-2 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">v{v.version_number} · {v.source}</span>
                  <span className="text-xs text-muted-foreground">{new Date(v.created_at).toLocaleString('pt-BR')}</span>
                </div>
                <div className="text-xs text-muted-foreground">{v.change_note}</div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="export" className="space-y-2">
            <Button onClick={exportPDF} className="w-full"><Download className="w-4 h-4 mr-2" />Exportar PDF</Button>
            <Button onClick={exportDOCX} variant="outline" className="w-full"><Download className="w-4 h-4 mr-2" />Exportar DOCX (editável)</Button>
            {just.qr_verification_code && (
              <div className="border rounded p-3 bg-muted/30">
                <p className="text-xs font-medium">Código de verificação pública</p>
                <p className="font-mono text-lg">{just.qr_verification_code}</p>
                <p className="text-xs text-muted-foreground mt-1 break-all">{window.location.origin}/verificar/{just.qr_verification_code}</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default StrategicJustificationsPage;
