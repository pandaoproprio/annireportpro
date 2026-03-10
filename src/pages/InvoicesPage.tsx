import React, { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAppData } from '@/contexts/AppDataContext';
import { useInvoices } from '@/hooks/useInvoices';
import { usePermissions } from '@/hooks/usePermissions';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { format, startOfMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  FileUp, Plus, CheckCircle2, Clock, AlertTriangle, XCircle,
  Download, Eye, Filter, BarChart3, Loader2, Receipt
} from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  enviada: { label: 'Enviada', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300', icon: <Clock className="w-3 h-3" /> },
  aprovada: { label: 'Aprovada', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', icon: <CheckCircle2 className="w-3 h-3" /> },
  rejeitada: { label: 'Rejeitada', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300', icon: <XCircle className="w-3 h-3" /> },
  pendente: { label: 'Pendente', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300', icon: <AlertTriangle className="w-3 h-3" /> },
};

const InvoicesPage: React.FC = () => {
  const { user, profile } = useAuth();
  const { activeProjectId, activeProject, projects } = useAppData();
  const { isAdmin } = usePermissions();
  const { invoices, isLoading, createInvoice, updateInvoiceStatus, getLastBusinessDay, isOverdue } = useInvoices(activeProjectId || undefined);

  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Form state
  const [formProjectId, setFormProjectId] = useState(activeProjectId || '');
  const [referenceMonth, setReferenceMonth] = useState('');
  const [emissionDate, setEmissionDate] = useState('');
  const [observations, setObservations] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [fileName, setFileName] = useState('');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      toast.error('Apenas PDF ou imagens são permitidos.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Arquivo excede 10MB.');
      return;
    }

    setUploading(true);
    try {
      const fileId = crypto.randomUUID();
      const ext = file.name.split('.').pop() || 'pdf';
      const path = `invoices/${user!.id}/${fileId}.${ext}`;

      const { error } = await supabase.storage
        .from('team-report-photos')
        .upload(path, file, { cacheControl: '3600', upsert: false });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('team-report-photos')
        .getPublicUrl(path);

      setFileUrl(urlData.publicUrl);
      setFileName(file.name);
      toast.success('Arquivo enviado!');
    } catch (err: any) {
      toast.error(`Erro no upload: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formProjectId || !referenceMonth || !emissionDate || !fileUrl) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }

    await createInvoice.mutateAsync({
      project_id: formProjectId,
      reference_month: `${referenceMonth}-01`,
      emission_date: emissionDate,
      file_url: fileUrl,
      file_name: fileName,
      observations,
    });

    setShowForm(false);
    setReferenceMonth('');
    setEmissionDate('');
    setObservations('');
    setFileUrl('');
    setFileName('');
  };

  const filteredInvoices = useMemo(() => {
    if (filterStatus === 'all') return invoices;
    if (filterStatus === 'atrasada') {
      return invoices.filter(i => i.status === 'pendente' && isOverdue(i.reference_month));
    }
    return invoices.filter(i => i.status === filterStatus);
  }, [invoices, filterStatus, isOverdue]);

  // Dashboard stats
  const stats = useMemo(() => {
    const total = invoices.length;
    const enviadas = invoices.filter(i => i.status === 'enviada').length;
    const aprovadas = invoices.filter(i => i.status === 'aprovada').length;
    const pendentes = invoices.filter(i => i.status === 'pendente').length;
    const atrasadas = invoices.filter(i => i.status === 'pendente' && isOverdue(i.reference_month)).length;
    return { total, enviadas, aprovadas, pendentes, atrasadas };
  }, [invoices, isOverdue]);

  // Deadline info for current month
  const now = new Date();
  const deadline = getLastBusinessDay(now.getFullYear(), now.getMonth());
  const daysUntilDeadline = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Receipt className="w-6 h-6 text-primary" />
            Notas Fiscais
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Envio e controle de notas fiscais dos oficineiros
          </p>
        </div>
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Nova Nota Fiscal</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Enviar Nota Fiscal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Projeto *</Label>
                <Select value={formProjectId} onValueChange={setFormProjectId}>
                  <SelectTrigger><SelectValue placeholder="Selecione o projeto" /></SelectTrigger>
                  <SelectContent>
                    {projects.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Oficineiro</Label>
                <Input value={profile?.name || ''} disabled className="bg-muted" />
              </div>
              <div>
                <Label>Mês de Referência *</Label>
                <Input type="month" value={referenceMonth} onChange={e => setReferenceMonth(e.target.value)} />
              </div>
              <div>
                <Label>Data de Emissão *</Label>
                <Input type="date" value={emissionDate} onChange={e => setEmissionDate(e.target.value)} />
              </div>
              <div>
                <Label>Arquivo da Nota Fiscal *</Label>
                {fileUrl ? (
                  <div className="flex items-center gap-2 p-2 border rounded bg-muted">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span className="text-sm truncate flex-1">{fileName}</span>
                    <Button variant="ghost" size="sm" onClick={() => { setFileUrl(''); setFileName(''); }}>Trocar</Button>
                  </div>
                ) : (
                  <div className="relative">
                    <Input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      onChange={handleFileUpload}
                      disabled={uploading}
                    />
                    {uploading && <Loader2 className="absolute right-3 top-3 w-4 h-4 animate-spin" />}
                  </div>
                )}
              </div>
              <div>
                <Label>Observações</Label>
                <Textarea value={observations} onChange={e => setObservations(e.target.value)} placeholder="Informações adicionais..." />
              </div>
              <Button
                className="w-full"
                onClick={handleSubmit}
                disabled={createInvoice.isPending || !fileUrl}
              >
                {createInvoice.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileUp className="w-4 h-4 mr-2" />}
                Enviar Nota Fiscal
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Deadline alert */}
      {daysUntilDeadline <= 5 && daysUntilDeadline >= 0 && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-300">
                Prazo se aproximando!
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-400">
                O último dia útil deste mês é {format(deadline, 'dd/MM/yyyy')} — faltam {daysUntilDeadline} dia(s).
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="dashboard">
        <TabsList>
          <TabsTrigger value="dashboard"><BarChart3 className="w-4 h-4 mr-1" />Painel</TabsTrigger>
          <TabsTrigger value="list"><Receipt className="w-4 h-4 mr-1" />Notas</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-blue-600">{stats.enviadas}</p>
                <p className="text-xs text-muted-foreground">Enviadas</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-green-600">{stats.aprovadas}</p>
                <p className="text-xs text-muted-foreground">Aprovadas</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-amber-600">{stats.pendentes}</p>
                <p className="text-xs text-muted-foreground">Pendentes</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-red-600">{stats.atrasadas}</p>
                <p className="text-xs text-muted-foreground">Atrasadas</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="list" className="space-y-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="enviada">Enviadas</SelectItem>
                <SelectItem value="aprovada">Aprovadas</SelectItem>
                <SelectItem value="pendente">Pendentes</SelectItem>
                <SelectItem value="rejeitada">Rejeitadas</SelectItem>
                <SelectItem value="atrasada">Atrasadas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredInvoices.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <Receipt className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Nenhuma nota fiscal encontrada.</p>
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="max-h-[600px]">
              <div className="space-y-3">
                {filteredInvoices.map(inv => {
                  const refDate = parseISO(inv.reference_month);
                  const st = STATUS_CONFIG[inv.status] || STATUS_CONFIG.pendente;
                  const overdue = inv.status !== 'aprovada' && isOverdue(inv.reference_month);

                  return (
                    <Card key={inv.id} className={overdue ? 'border-red-300' : ''}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-foreground">
                                {format(refDate, 'MMMM yyyy', { locale: ptBR })}
                              </span>
                              <Badge className={`${st.color} gap-1`}>
                                {st.icon}{st.label}
                              </Badge>
                              {overdue && (
                                <Badge variant="destructive" className="gap-1">
                                  <AlertTriangle className="w-3 h-3" />Atrasada
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Emissão: {format(parseISO(inv.emission_date), 'dd/MM/yyyy')}
                            </p>
                            {inv.observations && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{inv.observations}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" asChild>
                              <a href={inv.file_url} target="_blank" rel="noopener noreferrer">
                                <Eye className="w-4 h-4 mr-1" />Ver
                              </a>
                            </Button>
                            {isAdmin && inv.status === 'enviada' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => updateInvoiceStatus.mutate({ id: inv.id, status: 'aprovada' })}
                                >
                                  <CheckCircle2 className="w-4 h-4 mr-1" />Aprovar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => updateInvoiceStatus.mutate({ id: inv.id, status: 'rejeitada' })}
                                >
                                  <XCircle className="w-4 h-4 mr-1" />Rejeitar
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InvoicesPage;
