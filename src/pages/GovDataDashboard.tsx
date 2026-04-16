import React, { useState, useCallback, useEffect } from 'react';
import { useGovApi, GovApiSource } from '@/hooks/useGovApi';
import { useProjects } from '@/hooks/useProjects';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Database, Building2, MapPin, ShoppingCart, RefreshCw, Download, Globe, Link2, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { maskCnpj } from '@/lib/masks';

const CEAP_CNPJ = '32323099000159';
const CEAP_CNPJ_FORMATTED = '32.323.099/0001-59';

// ─── TransfereGov Sync Tab ─────────────────────────────────────────────
const TransfereGovSyncTab: React.FC = () => {
  const planApi = useGovApi();
  const executorApi = useGovApi();
  const empenhoApi = useGovApi();
  const pagamentoApi = useGovApi();
  const fundoApi = useGovApi();
  const { projects, updateProject } = useProjects();

  const [activeSubTab, setActiveSubTab] = useState('monitor');
  const [customCnpj, setCustomCnpj] = useState(CEAP_CNPJ_FORMATTED);
  const [lastSync, setLastSync] = useState<string | null>(null);

  const cnpjDigits = customCnpj.replace(/\D/g, '');

  const handleSync = async () => {
    if (cnpjDigits.length !== 14) {
      toast.error('CNPJ inválido');
      return;
    }

    setLastSync(null);

    // Query all relevant endpoints in parallel
    await Promise.allSettled([
      planApi.query('transferegov_especiais', 'plano_acao_especial', {
        cnpj_beneficiario_plano_acao_especial: `eq.${cnpjDigits}`,
        limit: '100',
      }),
      executorApi.query('transferegov_especiais', 'executor_especial', {
        cnpj_executor: `eq.${cnpjDigits}`,
        limit: '100',
      }),
      empenhoApi.query('transferegov_especiais', 'empenho_especial', {
        limit: '50',
        order: 'data_emissao_empenho_especial.desc',
      }),
      pagamentoApi.query('transferegov_especiais', 'historico_pagamento_especial', {
        limit: '50',
        order: 'data_pagamento_historico_pagamento_especial.desc',
      }),
      fundoApi.query('transferegov_fundo', 'programa', {
        limit: '50',
      }),
    ]);

    setLastSync(new Date().toLocaleString('pt-BR'));
    toast.success('Sincronização concluída');
  };

  const handleImportToProject = (row: any) => {
    const projectName = row.nome_executor || row.nome_beneficiario_plano_acao_especial || row.objeto_executor || 'Projeto importado';
    const fomentoNumber = row.codigo_plano_acao || row.id_plano_acao?.toString() || '';

    toast.info(`Dados do TransfereGov disponíveis para importação`, {
      description: `Projeto: ${projectName} | Código: ${fomentoNumber}`,
    });
  };

  const allLoading = planApi.loading || executorApi.loading || empenhoApi.loading || pagamentoApi.loading || fundoApi.loading;

  return (
    <div className="space-y-4">
      {/* CNPJ + Sync Controls */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <Label className="font-semibold">CNPJ da Organização</Label>
              <Input
                value={customCnpj}
                onChange={e => setCustomCnpj(maskCnpj(e.target.value))}
                placeholder="00.000.000/0001-00"
                className="font-mono"
              />
            </div>
            <Button onClick={handleSync} disabled={allLoading} className="gap-2">
              {allLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Sincronizar com TransfereGov
            </Button>
            {lastSync && (
              <Badge variant="outline" className="gap-1">
                <Clock className="w-3 h-3" />
                Última sincronização: {lastSync}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sub-tabs for different data views */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
        <TabsList className="w-full grid grid-cols-5">
          <TabsTrigger value="monitor" className="text-xs">Monitoramento</TabsTrigger>
          <TabsTrigger value="planos" className="text-xs">Planos de Ação</TabsTrigger>
          <TabsTrigger value="executores" className="text-xs">Executores</TabsTrigger>
          <TabsTrigger value="empenhos" className="text-xs">Empenhos</TabsTrigger>
          <TabsTrigger value="pagamentos" className="text-xs">Pagamentos</TabsTrigger>
        </TabsList>

        <TabsContent value="monitor">
          <MonitorPanel
            planData={planApi.data}
            executorData={executorApi.data}
            empenhoData={empenhoApi.data}
            pagamentoData={pagamentoApi.data}
            loading={allLoading}
            projects={projects}
          />
        </TabsContent>

        <TabsContent value="planos">
          <DataResultTable data={planApi.data} loading={planApi.loading} onImport={handleImportToProject} />
        </TabsContent>

        <TabsContent value="executores">
          <DataResultTable data={executorApi.data} loading={executorApi.loading} onImport={handleImportToProject} />
        </TabsContent>

        <TabsContent value="empenhos">
          <DataResultTable data={empenhoApi.data} loading={empenhoApi.loading} />
        </TabsContent>

        <TabsContent value="pagamentos">
          <DataResultTable data={pagamentoApi.data} loading={pagamentoApi.loading} />
        </TabsContent>
      </Tabs>

      {/* Manual query section */}
      <ManualQuerySection />
    </div>
  );
};

// ─── Monitor Panel ──────────────────────────────────────────────────────
const MonitorPanel: React.FC<{
  planData: any;
  executorData: any;
  empenhoData: any;
  pagamentoData: any;
  loading: boolean;
  projects: any[];
}> = ({ planData, executorData, empenhoData, pagamentoData, loading, projects }) => {
  const plans = Array.isArray(planData) ? planData : [];
  const executors = Array.isArray(executorData) ? executorData : [];
  const empenhos = Array.isArray(empenhoData) ? empenhoData : [];
  const pagamentos = Array.isArray(pagamentoData) ? pagamentoData : [];

  const totalInvestimento = executors.reduce((s: number, e: any) => s + (e.vl_investimento_executor || 0), 0);
  const totalCusteio = executors.reduce((s: number, e: any) => s + (e.vl_custeio_executor || 0), 0);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-28" />)}
      </div>
    );
  }

  if (!planData && !executorData) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <Globe className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Clique em "Sincronizar com TransfereGov" para consultar dados</p>
          <p className="text-sm mt-1">O CNPJ do CEAP ({CEAP_CNPJ_FORMATTED}) já está pré-configurado</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Database className="w-4 h-4" />
              Planos de Ação
            </div>
            <p className="text-2xl font-bold mt-1">{plans.length}</p>
            <p className="text-xs text-muted-foreground">encontrados no TransfereGov</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="w-4 h-4" />
              Executores
            </div>
            <p className="text-2xl font-bold mt-1">{executors.length}</p>
            <p className="text-xs text-muted-foreground">registros vinculados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              Investimento
            </div>
            <p className="text-2xl font-bold mt-1">
              {totalInvestimento.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
            <p className="text-xs text-muted-foreground">total nos executores</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
              Custeio
            </div>
            <p className="text-2xl font-bold mt-1">
              {totalCusteio.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
            <p className="text-xs text-muted-foreground">total nos executores</p>
          </CardContent>
        </Card>
      </div>

      {/* Project Sync Status */}
      {plans.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Link2 className="w-4 h-4" />
              Vinculação com Projetos Internos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[250px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Código</TableHead>
                    <TableHead className="text-xs">Beneficiário</TableHead>
                    <TableHead className="text-xs">Situação</TableHead>
                    <TableHead className="text-xs">UF</TableHead>
                    <TableHead className="text-xs">Investimento</TableHead>
                    <TableHead className="text-xs">Custeio</TableHead>
                    <TableHead className="text-xs">Projeto Vinculado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans.map((plan: any, idx: number) => {
                    const linkedProject = projects.find(
                      p => p.fomentoNumber === plan.codigo_plano_acao || p.fomentoNumber === plan.id_plano_acao?.toString()
                    );
                    return (
                      <TableRow key={idx}>
                        <TableCell className="text-xs font-mono">{plan.codigo_plano_acao || plan.id_plano_acao}</TableCell>
                        <TableCell className="text-xs">{plan.nome_beneficiario_plano_acao_especial || '—'}</TableCell>
                        <TableCell className="text-xs">
                          <Badge variant={plan.situacao_plano_acao === 'CIENTE' ? 'default' : 'secondary'} className="text-[10px]">
                            {plan.situacao_plano_acao || '—'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{plan.uf_beneficiario_plano_acao || '—'}</TableCell>
                        <TableCell className="text-xs">
                          {(plan.valor_investimento_plano_acao || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </TableCell>
                        <TableCell className="text-xs">
                          {(plan.valor_custeio_plano_acao || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </TableCell>
                        <TableCell className="text-xs">
                          {linkedProject ? (
                            <Badge variant="default" className="gap-1 text-[10px]">
                              <CheckCircle2 className="w-3 h-3" />
                              {linkedProject.name}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1 text-[10px] text-muted-foreground">
                              Não vinculado
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// ─── Manual Query Section ───────────────────────────────────────────────
const ManualQuerySection: React.FC = () => {
  const { data, loading, query, reset } = useGovApi();
  const [endpoint, setEndpoint] = useState('programa_especial');
  const [source, setSource] = useState<GovApiSource>('transferegov_especiais');

  const endpointsBySource: Record<string, Array<{ value: string; label: string }>> = {
    transferegov_especiais: [
      { value: 'programa_especial', label: 'Programas Especiais' },
      { value: 'plano_acao_especial', label: 'Planos de Ação' },
      { value: 'empenho_especial', label: 'Empenhos' },
      { value: 'historico_pagamento_especial', label: 'Histórico de Pagamentos' },
      { value: 'meta_especial', label: 'Metas' },
      { value: 'executor_especial', label: 'Executores' },
      { value: 'relatorio_gestao_especial', label: 'Relatórios de Gestão' },
      { value: 'plano_trabalho_especial', label: 'Planos de Trabalho' },
      { value: 'finalidade_especial', label: 'Finalidades' },
    ],
    transferegov_fundo: [
      { value: 'programa', label: 'Programas' },
      { value: 'plano_acao', label: 'Planos de Ação' },
      { value: 'empenho', label: 'Empenhos' },
      { value: 'pagamento', label: 'Pagamentos' },
    ],
  };

  const endpoints = endpointsBySource[source] || endpointsBySource.transferegov_especiais;

  const handleSearch = () => {
    query(source, endpoint, { limit: '50' });
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Consulta Manual</CardTitle>
        <CardDescription className="text-xs">Busque dados diretamente nos endpoints do TransfereGov</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3 items-end mb-4">
          <div className="min-w-[180px]">
            <Label className="text-xs">Módulo</Label>
            <Select value={source} onValueChange={(v) => { setSource(v as GovApiSource); setEndpoint(endpointsBySource[v]?.[0]?.value || ''); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="transferegov_especiais">Transferências Especiais</SelectItem>
                <SelectItem value="transferegov_fundo">Fundo a Fundo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <Label className="text-xs">Endpoint</Label>
            <Select value={endpoint} onValueChange={setEndpoint}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {endpoints.map(ep => (
                  <SelectItem key={ep.value} value={ep.value}>{ep.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSearch} disabled={loading} size="sm">
            {loading ? <RefreshCw className="w-4 h-4 animate-spin mr-1" /> : <Search className="w-4 h-4 mr-1" />}
            Consultar
          </Button>
        </div>
        <DataResultTable data={data} loading={loading} />
      </CardContent>
    </Card>
  );
};

// ─── CGU Tab ────────────────────────────────────────────────────────────
const CguTab: React.FC = () => {
  const { data, loading, query } = useGovApi();
  const [endpoint, setEndpoint] = useState('convenios');
  const [cnpj, setCnpj] = useState(CEAP_CNPJ_FORMATTED);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const endpoints = [
    { value: 'convenios', label: 'Convênios' },
    { value: 'despesas/documentos', label: 'Documentos de Despesa' },
    { value: 'licitacoes', label: 'Licitações' },
    { value: 'contratos', label: 'Contratos' },
  ];

  const handleSearch = () => {
    const params: Record<string, string> = { pagina: '1' };
    const digits = cnpj.replace(/\D/g, '');
    if (digits) params['cnpjFavorecido'] = digits;
    if (dataInicio) params['dataInicial'] = dataInicio.replace(/-/g, '/');
    if (dataFim) params['dataFinal'] = dataFim.replace(/-/g, '/');
    query('cgu', endpoint, params);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[180px]">
          <Label>Consulta</Label>
          <Select value={endpoint} onValueChange={setEndpoint}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {endpoints.map(ep => (
                <SelectItem key={ep.value} value={ep.value}>{ep.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[180px]">
          <Label>CNPJ</Label>
          <Input
            placeholder="00.000.000/0001-00"
            value={cnpj}
            onChange={e => setCnpj(maskCnpj(e.target.value))}
            className="font-mono"
          />
        </div>
        <div className="min-w-[140px]">
          <Label>Data Início</Label>
          <Input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
        </div>
        <div className="min-w-[140px]">
          <Label>Data Fim</Label>
          <Input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} />
        </div>
        <Button onClick={handleSearch} disabled={loading}>
          {loading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
          Consultar
        </Button>
      </div>
      <DataResultTable data={data} loading={loading} />
    </div>
  );
};

// ─── IBGE Tab ───────────────────────────────────────────────────────────
const IbgeTab: React.FC = () => {
  const { data, loading, query } = useGovApi();
  const [tipo, setTipo] = useState('estados');
  const [uf, setUf] = useState('');

  const handleSearch = () => {
    if (tipo === 'estados') {
      query('ibge', 'estados', { orderBy: 'nome' });
    } else if (tipo === 'municipios' && uf) {
      query('ibge', `estados/${uf}/municipios`, { orderBy: 'nome' });
    } else if (tipo === 'regioes') {
      query('ibge', 'regioes');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div className="min-w-[160px]">
          <Label>Tipo</Label>
          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="estados">Estados</SelectItem>
              <SelectItem value="municipios">Municípios</SelectItem>
              <SelectItem value="regioes">Regiões</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {tipo === 'municipios' && (
          <div className="min-w-[80px]">
            <Label>UF (sigla)</Label>
            <Input placeholder="RJ" maxLength={2} value={uf} onChange={e => setUf(e.target.value.toUpperCase())} />
          </div>
        )}
        <Button onClick={handleSearch} disabled={loading}>
          {loading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
          Consultar
        </Button>
      </div>
      <DataResultTable data={data} loading={loading} />
    </div>
  );
};

// ─── Compras.gov Tab ────────────────────────────────────────────────────
const ComprasTab: React.FC = () => {
  const { data, loading, query } = useGovApi();
  const [endpoint, setEndpoint] = useState('v1/licitacoes');
  const [uasg, setUasg] = useState('');

  const endpoints = [
    { value: 'v1/licitacoes', label: 'Licitações' },
    { value: 'v1/contratos', label: 'Contratos' },
    { value: 'v1/materiais', label: 'Materiais (CATMAT)' },
    { value: 'v1/servicos', label: 'Serviços (CATSER)' },
  ];

  const handleSearch = () => {
    const params: Record<string, string> = {};
    if (uasg) params['co_uasg'] = uasg;
    query('compras', endpoint, params);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[180px]">
          <Label>Consulta</Label>
          <Select value={endpoint} onValueChange={setEndpoint}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {endpoints.map(ep => (
                <SelectItem key={ep.value} value={ep.value}>{ep.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[120px]">
          <Label>UASG (opcional)</Label>
          <Input placeholder="Código" value={uasg} onChange={e => setUasg(e.target.value)} />
        </div>
        <Button onClick={handleSearch} disabled={loading}>
          {loading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
          Consultar
        </Button>
      </div>
      <DataResultTable data={data} loading={loading} />
    </div>
  );
};

// ─── Generic Data Table ─────────────────────────────────────────────────
const DataResultTable: React.FC<{ data: any; loading: boolean; onImport?: (row: any) => void }> = ({ data, loading, onImport }) => {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (!data) return null;

  const rows = Array.isArray(data) ? data : data?.data ? (Array.isArray(data.data) ? data.data : [data.data]) : [data];

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Nenhum resultado encontrado.
        </CardContent>
      </Card>
    );
  }

  const allKeys = new Set<string>();
  rows.slice(0, 10).forEach((row: any) => {
    if (typeof row === 'object' && row !== null) {
      Object.keys(row).forEach(k => allKeys.add(k));
    }
  });
  const columns = Array.from(allKeys).slice(0, 8);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardDescription>{rows.length} resultado(s)</CardDescription>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const csv = [
                  columns.join(';'),
                  ...rows.map((r: any) =>
                    columns.map(c => String(r?.[c] ?? '')).join(';')
                  ),
                ].join('\n');
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = 'consulta_gov.csv';
                link.click();
                toast.success('CSV exportado');
              }}
            >
              <Download className="w-4 h-4 mr-1" /> CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                {onImport && <TableHead className="w-8" />}
                {columns.map(col => (
                  <TableHead key={col} className="whitespace-nowrap text-xs font-semibold">
                    {col}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.slice(0, 100).map((row: any, idx: number) => (
                <TableRow key={idx}>
                  {onImport && (
                    <TableCell>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => onImport(row)} title="Importar para projeto">
                        <Link2 className="w-3 h-3" />
                      </Button>
                    </TableCell>
                  )}
                  {columns.map(col => (
                    <TableCell key={col} className="text-xs max-w-[200px] truncate" title={String(row?.[col] ?? '')}>
                      {typeof row?.[col] === 'object' ? JSON.stringify(row[col]) : String(row?.[col] ?? '—')}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

// ─── Main Page ──────────────────────────────────────────────────────────
export const GovDataDashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Globe className="w-6 h-6 text-primary" />
          Consultas Governamentais
        </h1>
        <p className="text-muted-foreground mt-1">
          Integração com APIs públicas do Governo Federal — Monitoramento e sincronização via CNPJ
        </p>
      </div>

      <Tabs defaultValue="transferegov" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="transferegov" className="gap-1 text-xs sm:text-sm">
            <Database className="w-4 h-4" />
            <span className="hidden sm:inline">TransfereGov</span>
          </TabsTrigger>
          <TabsTrigger value="cgu" className="gap-1 text-xs sm:text-sm">
            <Building2 className="w-4 h-4" />
            <span className="hidden sm:inline">Transparência (CGU)</span>
          </TabsTrigger>
          <TabsTrigger value="ibge" className="gap-1 text-xs sm:text-sm">
            <MapPin className="w-4 h-4" />
            <span className="hidden sm:inline">IBGE</span>
          </TabsTrigger>
          <TabsTrigger value="compras" className="gap-1 text-xs sm:text-sm">
            <ShoppingCart className="w-4 h-4" />
            <span className="hidden sm:inline">Compras.gov</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transferegov">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                TransfereGov — Monitoramento e Sincronização
              </CardTitle>
              <CardDescription>
                Monitoramento contínuo de transferências, empenhos e pagamentos vinculados ao CNPJ do CEAP ({CEAP_CNPJ_FORMATTED})
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TransfereGovSyncTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cgu">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                Portal da Transparência (CGU)
              </CardTitle>
              <CardDescription>
                Consulta convênios, despesas, licitações e contratos — CNPJ pré-configurado: {CEAP_CNPJ_FORMATTED}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CguTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ibge">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                IBGE — Localidades
              </CardTitle>
              <CardDescription>
                Consulta estados, municípios e regiões brasileiras
              </CardDescription>
            </CardHeader>
            <CardContent>
              <IbgeTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compras">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-primary" />
                Compras.gov.br
              </CardTitle>
              <CardDescription>
                Consulta licitações, contratos, materiais e serviços do SIASG
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ComprasTab />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default GovDataDashboard;
