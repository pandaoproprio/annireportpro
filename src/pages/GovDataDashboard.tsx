import React, { useState, useCallback } from 'react';
import { useGovApi, GovApiSource } from '@/hooks/useGovApi';
import { useAppData } from '@/contexts/AppDataContext';
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
import { Search, Database, Building2, MapPin, ShoppingCart, ExternalLink, RefreshCw, Download, Globe } from 'lucide-react';
import { toast } from 'sonner';

// ─── TransfereGov Tab ──────────────────────────────────────────────────
const TransfereGovTab: React.FC = () => {
  const { data, loading, query, reset } = useGovApi();
  const [endpoint, setEndpoint] = useState('programa_especial');
  const [searchTerm, setSearchTerm] = useState('');

  const endpoints = [
    { value: 'programa_especial', label: 'Programas Especiais' },
    { value: 'plano_acao_especial', label: 'Planos de Ação' },
    { value: 'empenho_especial', label: 'Empenhos' },
    { value: 'historico_pagamento_especial', label: 'Histórico de Pagamentos' },
    { value: 'meta_especial', label: 'Metas' },
    { value: 'executor_especial', label: 'Executores' },
    { value: 'relatorio_gestao_especial', label: 'Relatórios de Gestão' },
  ];

  const handleSearch = () => {
    const params: Record<string, string> = { limit: '50' };
    if (searchTerm) {
      // PostgREST-style search
      params['select'] = '*';
    }
    query('transferegov_especiais', endpoint, params);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <Label>Módulo</Label>
          <Select value={endpoint} onValueChange={setEndpoint}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {endpoints.map(ep => (
                <SelectItem key={ep.value} value={ep.value}>{ep.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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

// ─── CGU Tab ────────────────────────────────────────────────────────────
const CguTab: React.FC = () => {
  const { data, loading, query } = useGovApi();
  const [endpoint, setEndpoint] = useState('convenios');
  const [cnpj, setCnpj] = useState('');
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
    if (cnpj) params['cnpjFavorecido'] = cnpj;
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
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {endpoints.map(ep => (
                <SelectItem key={ep.value} value={ep.value}>{ep.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[160px]">
          <Label>CNPJ (opcional)</Label>
          <Input placeholder="00.000.000/0001-00" value={cnpj} onChange={e => setCnpj(e.target.value)} />
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
const DataResultTable: React.FC<{ data: any; loading: boolean }> = ({ data, loading }) => {
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
            <Download className="w-4 h-4 mr-1" /> Exportar CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
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
          Integração com APIs públicas do Governo Federal — TransfereGov, Portal da Transparência (CGU), IBGE e Compras.gov.br
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
                TransfereGov — Dados Abertos
              </CardTitle>
              <CardDescription>
                Consulta transferências especiais, programas, empenhos, pagamentos e planos de ação
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TransfereGovTab />
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
                Consulta convênios, despesas, licitações e contratos do governo federal
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
