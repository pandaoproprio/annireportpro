import React, { useState, useEffect } from 'react';
import { useGovApi } from '@/hooks/useGovApi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Building2, MapPin, RefreshCw, Download, Globe, AlertTriangle,
  CheckCircle2, Phone, Calendar, Users, Briefcase, FileText, DollarSign,
  Vote, Search, Info, ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

const CEAP_CNPJ = '32323099000159';
const CEAP_CNPJ_FORMATTED = '32.323.099/0001-59';

const formatCurrency = (v: any) => {
  const n = typeof v === 'string' ? parseFloat(v.replace(/\./g, '').replace(',', '.')) : Number(v);
  if (!isFinite(n)) return v ?? '—';
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatDate = (v: any) => {
  if (!v) return '—';
  try { return new Date(v).toLocaleDateString('pt-BR'); } catch { return String(v); }
};

// ─── Ficha Cadastral ─────────────────────────────────────────────────────
const FichaCadastral: React.FC = () => {
  const { data, loading, query } = useGovApi();

  useEffect(() => {
    query('brasilapi', `cnpj/v1/${CEAP_CNPJ}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-24" />)}
      </div>
    );
  }

  if (!data) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>Não foi possível carregar a ficha cadastral.</AlertDescription>
      </Alert>
    );
  }

  const ativo = data.descricao_situacao_cadastral === 'ATIVA';

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-foreground">{data.razao_social}</h2>
              {data.nome_fantasia && <p className="text-sm text-muted-foreground">{data.nome_fantasia}</p>}
              <p className="font-mono text-sm mt-1">CNPJ: {CEAP_CNPJ_FORMATTED}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge variant={ativo ? 'default' : 'destructive'} className="gap-1">
                <CheckCircle2 className="w-3 h-3" />
                {data.descricao_situacao_cadastral || '—'}
              </Badge>
              <p className="text-xs text-muted-foreground">
                Aberto em {formatDate(data.data_inicio_atividade)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detalhes em grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs flex items-center gap-1 text-muted-foreground">
              <Briefcase className="w-3 h-3" /> Natureza Jurídica
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">{data.natureza_juridica || '—'}</p>
            <p className="text-xs text-muted-foreground mt-1">Porte: {data.porte || '—'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs flex items-center gap-1 text-muted-foreground">
              <FileText className="w-3 h-3" /> Atividade Principal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">{data.cnae_fiscal_descricao || '—'}</p>
            <p className="text-xs text-muted-foreground mt-1 font-mono">CNAE: {data.cnae_fiscal || '—'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs flex items-center gap-1 text-muted-foreground">
              <DollarSign className="w-3 h-3" /> Capital Social
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">{formatCurrency(data.capital_social)}</p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs flex items-center gap-1 text-muted-foreground">
              <MapPin className="w-3 h-3" /> Endereço
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              {[data.logradouro, data.numero, data.complemento].filter(Boolean).join(', ')}
            </p>
            <p className="text-sm text-muted-foreground">
              {data.bairro} — {data.municipio}/{data.uf} — CEP {data.cep}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs flex items-center gap-1 text-muted-foreground">
              <Phone className="w-3 h-3" /> Contato
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{data.ddd_telefone_1 || '—'}</p>
            {data.email && <p className="text-xs text-muted-foreground">{data.email}</p>}
          </CardContent>
        </Card>
      </div>

      {/* Quadro Societário */}
      {Array.isArray(data.qsa) && data.qsa.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="w-4 h-4" /> Quadro Societário ({data.qsa.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Nome</TableHead>
                  <TableHead className="text-xs">Qualificação</TableHead>
                  <TableHead className="text-xs">Faixa Etária</TableHead>
                  <TableHead className="text-xs">Entrada</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.qsa.map((s: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs font-medium">{s.nome_socio}</TableCell>
                    <TableCell className="text-xs">{s.qualificacao_socio}</TableCell>
                    <TableCell className="text-xs">{s.faixa_etaria || '—'}</TableCell>
                    <TableCell className="text-xs">{formatDate(s.data_entrada_sociedade)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* CNAEs Secundários */}
      {Array.isArray(data.cnaes_secundarios) && data.cnaes_secundarios.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Atividades Secundárias ({data.cnaes_secundarios.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <ul className="space-y-1.5 text-xs">
                {data.cnaes_secundarios.map((c: any, i: number) => (
                  <li key={i} className="flex gap-2">
                    <span className="font-mono text-muted-foreground shrink-0">{c.codigo}</span>
                    <span>{c.descricao}</span>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// ─── TransfereGov ────────────────────────────────────────────────────────
const TransfereGovTab: React.FC = () => {
  const planApi = useGovApi();
  const executorApi = useGovApi();
  const fundoApi = useGovApi();
  const tedApi = useGovApi();
  const [synced, setSynced] = useState(false);

  const handleSync = async () => {
    setSynced(false);
    await Promise.allSettled([
      planApi.query('transferegov_especiais', 'plano_acao_especial', {
        cnpj_beneficiario_plano_acao: `eq.${CEAP_CNPJ}`,
        limit: '100',
      }),
      executorApi.query('transferegov_especiais', 'executor_especial', {
        cnpj_executor: `eq.${CEAP_CNPJ}`,
        limit: '100',
      }),
      fundoApi.query('transferegov_fundo', 'plano_acao', {
        cnpj_beneficiario: `eq.${CEAP_CNPJ}`,
        limit: '100',
      }),
      tedApi.query('transferegov_ted', 'descentralizacao', {
        cnpj_descentralizado: `eq.${CEAP_CNPJ}`,
        limit: '100',
      }),
    ]);
    setSynced(true);
  };

  const allLoading = planApi.loading || executorApi.loading || fundoApi.loading || tedApi.loading;
  const plans = Array.isArray(planApi.data) ? planApi.data : [];
  const executors = Array.isArray(executorApi.data) ? executorApi.data : [];
  const fundos = Array.isArray(fundoApi.data) ? fundoApi.data : [];
  const teds = Array.isArray(tedApi.data) ? tedApi.data : [];
  const totalRegistros = plans.length + executors.length + fundos.length + teds.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-muted-foreground">
          Consulta direta nas bases TransfereGov filtrando pelo CNPJ {CEAP_CNPJ_FORMATTED}
        </p>
        <Button onClick={handleSync} disabled={allLoading} size="sm" className="gap-2">
          <RefreshCw className={`w-4 h-4 ${allLoading ? 'animate-spin' : ''}`} />
          Buscar transferências
        </Button>
      </div>

      {synced && totalRegistros === 0 && !allLoading && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Nenhum registro encontrado</AlertTitle>
          <AlertDescription className="text-xs space-y-1">
            <p>O CNPJ {CEAP_CNPJ_FORMATTED} não consta como beneficiário/executor nas bases consultadas:</p>
            <ul className="list-disc list-inside ml-2 mt-1">
              <li>Transferências Especiais (planos, executores)</li>
              <li>Fundo a Fundo</li>
              <li>TED — Termo de Execução Descentralizada</li>
            </ul>
            <p className="mt-2 italic">
              Essas bases listam principalmente entes federativos (estados/municípios) e órgãos
              federais. Recursos para OSCs/associações geralmente trafegam via convênios SICONV ou
              fomento estadual/municipal.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {plans.length > 0 && <ResultGrid title="Planos de Ação Especial" rows={plans} />}
      {executors.length > 0 && <ResultGrid title="Como Executor" rows={executors} />}
      {fundos.length > 0 && <ResultGrid title="Fundo a Fundo" rows={fundos} />}
      {teds.length > 0 && <ResultGrid title="Termos de Execução Descentralizada" rows={teds} />}
    </div>
  );
};

// ─── Emendas Parlamentares (Portal da Transparência) ─────────────────────
const EmendasTab: React.FC = () => {
  const { data, loading, query } = useGovApi();
  const [ano, setAno] = useState(new Date().getFullYear().toString());
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    setSearched(false);
    await query('cgu', 'emendas', {
      codigoBeneficiario: CEAP_CNPJ,
      ano,
      pagina: '1',
    });
    setSearched(true);
  };

  const rows = Array.isArray(data) ? data : [];
  const totalPago = rows.reduce((s, r) => {
    const p = parseFloat((r.valorPago || '0').replace(/\./g, '').replace(',', '.'));
    return s + (isFinite(p) ? p : 0);
  }, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label className="text-xs">Ano</Label>
          <Input
            type="number"
            value={ano}
            onChange={e => setAno(e.target.value)}
            className="w-24"
            min="2010"
            max={new Date().getFullYear()}
          />
        </div>
        <Button onClick={handleSearch} disabled={loading} size="sm" className="gap-2">
          <Search className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Buscar emendas
        </Button>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs">
          A API do Portal da Transparência tem restrições no filtro por CNPJ beneficiário —
          os resultados podem incluir o universo do ano. Use a busca por ano específico e
          confira o autor/objeto para identificar emendas relacionadas ao CEAP.
        </AlertDescription>
      </Alert>

      {loading && (
        <div className="space-y-2">
          {[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}
        </div>
      )}

      {searched && !loading && rows.length === 0 && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Nenhuma emenda encontrada para o ano {ano}.
          </AlertDescription>
        </Alert>
      )}

      {rows.length > 0 && (
        <>
          <Card>
            <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Total de emendas</p>
                <p className="text-2xl font-bold">{rows.length}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total pago acumulado</p>
                <p className="text-2xl font-bold text-primary">{formatCurrency(totalPago)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Ano de referência</p>
                <p className="text-2xl font-bold">{ano}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Vote className="w-4 h-4" /> Emendas — Detalhamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[450px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Código</TableHead>
                      <TableHead className="text-xs">Autor</TableHead>
                      <TableHead className="text-xs">Tipo</TableHead>
                      <TableHead className="text-xs">Localidade</TableHead>
                      <TableHead className="text-xs">Função</TableHead>
                      <TableHead className="text-xs text-right">Empenhado</TableHead>
                      <TableHead className="text-xs text-right">Pago</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs font-mono">{r.codigoEmenda}</TableCell>
                        <TableCell className="text-xs">{r.autor || r.nomeAutor}</TableCell>
                        <TableCell className="text-xs">{r.tipoEmenda}</TableCell>
                        <TableCell className="text-xs">{r.localidadeDoGasto}</TableCell>
                        <TableCell className="text-xs">{r.funcao}</TableCell>
                        <TableCell className="text-xs text-right">{r.valorEmpenhado || '—'}</TableCell>
                        <TableCell className="text-xs text-right font-semibold">{r.valorPago || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

// ─── Contratações Públicas (PNCP) ────────────────────────────────────────
const PncpTab: React.FC = () => {
  const { data, loading, query } = useGovApi();
  const [dataInicial, setDataInicial] = useState('20240101');
  const [dataFinal, setDataFinal] = useState('20241231');
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    setSearched(false);
    await query('pncp', 'contratos', {
      cnpjFornecedor: CEAP_CNPJ,
      dataInicial,
      dataFinal,
      pagina: '1',
      tamanhoPagina: '50',
    });
    setSearched(true);
  };

  const rows = Array.isArray(data?.data) ? data.data : [];
  // Filter manualmente pelo CNPJ — PNCP às vezes ignora o filtro
  const filtered = rows.filter((r: any) => r.niFornecedor === CEAP_CNPJ);
  const totalGlobal = filtered.reduce((s: number, r: any) => s + (Number(r.valorGlobal) || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label className="text-xs">Data Inicial (AAAAMMDD)</Label>
          <Input
            value={dataInicial}
            onChange={e => setDataInicial(e.target.value)}
            className="w-32 font-mono"
            placeholder="20240101"
          />
        </div>
        <div>
          <Label className="text-xs">Data Final (AAAAMMDD)</Label>
          <Input
            value={dataFinal}
            onChange={e => setDataFinal(e.target.value)}
            className="w-32 font-mono"
            placeholder="20241231"
          />
        </div>
        <Button onClick={handleSearch} disabled={loading} size="sm" className="gap-2">
          <Search className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Buscar contratos PNCP
        </Button>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs">
          O PNCP indexa contratos públicos com órgãos federais, estaduais e municipais.
          Aplicamos um segundo filtro local pelo CNPJ {CEAP_CNPJ_FORMATTED} para garantir
          precisão dos resultados.
        </AlertDescription>
      </Alert>

      {loading && [1,2,3].map(i => <Skeleton key={i} className="h-16" />)}

      {searched && !loading && filtered.length === 0 && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Nenhum contrato público encontrado para o CEAP no período {dataInicial} — {dataFinal}.
          </AlertDescription>
        </Alert>
      )}

      {filtered.length > 0 && (
        <>
          <Card>
            <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Contratos no período</p>
                <p className="text-2xl font-bold">{filtered.length}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Valor global total</p>
                <p className="text-2xl font-bold text-primary">{formatCurrency(totalGlobal)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Órgãos contratantes</p>
                <p className="text-2xl font-bold">
                  {new Set(filtered.map((r: any) => r.orgaoEntidade?.cnpj)).size}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="w-4 h-4" /> Contratos Públicos do CEAP
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Órgão Contratante</TableHead>
                      <TableHead className="text-xs">Objeto</TableHead>
                      <TableHead className="text-xs">Assinatura</TableHead>
                      <TableHead className="text-xs">Vigência</TableHead>
                      <TableHead className="text-xs text-right">Valor Global</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((r: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs">
                          <div>{r.orgaoEntidade?.razaoSocial}</div>
                          <div className="text-muted-foreground font-mono text-[10px]">
                            {r.unidadeOrgao?.municipioNome}/{r.unidadeOrgao?.ufSigla}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs max-w-md">
                          <p className="line-clamp-3">{r.objetoContrato}</p>
                        </TableCell>
                        <TableCell className="text-xs">{formatDate(r.dataAssinatura)}</TableCell>
                        <TableCell className="text-xs">
                          {formatDate(r.dataVigenciaInicio)} —<br />{formatDate(r.dataVigenciaFim)}
                        </TableCell>
                        <TableCell className="text-xs text-right font-semibold">
                          {formatCurrency(r.valorGlobal)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

// ─── Reusable: Generic Result Grid ───────────────────────────────────────
const ResultGrid: React.FC<{ title: string; rows: any[] }> = ({ title, rows }) => {
  const allKeys = new Set<string>();
  rows.slice(0, 10).forEach(r => {
    if (typeof r === 'object' && r !== null) Object.keys(r).forEach(k => allKeys.add(k));
  });
  const columns = Array.from(allKeys).slice(0, 8);

  const exportCsv = () => {
    const csv = [
      columns.join(';'),
      ...rows.map(r => columns.map(c => String(r?.[c] ?? '')).join(';')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${title.replace(/\s+/g, '_').toLowerCase()}.csv`;
    link.click();
    toast.success('CSV exportado');
  };

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm">{title} <Badge variant="secondary" className="ml-2">{rows.length}</Badge></CardTitle>
        <Button variant="outline" size="sm" onClick={exportCsv}>
          <Download className="w-3 h-3 mr-1" /> CSV
        </Button>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map(c => (
                  <TableHead key={c} className="text-[10px] whitespace-nowrap">{c}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, i) => (
                <TableRow key={i}>
                  {columns.map(c => (
                    <TableCell key={c} className="text-xs max-w-[200px] truncate" title={String(row?.[c] ?? '')}>
                      {typeof row?.[c] === 'object'
                        ? JSON.stringify(row[c])
                        : String(row?.[c] ?? '—')}
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

// ─── Links Externos ──────────────────────────────────────────────────────
const LinksExternos: React.FC = () => {
  const links = [
    {
      label: 'Portal da Transparência — Pessoa Física/Jurídica',
      url: `https://portaldatransparencia.gov.br/pessoa-juridica/${CEAP_CNPJ}`,
      desc: 'Visão consolidada de recursos recebidos do governo federal',
    },
    {
      label: 'TransfereGov — Consulta por CNPJ',
      url: `https://www.gov.br/transferegov/pt-br`,
      desc: 'Convênios, contratos de repasse e termos de execução descentralizada',
    },
    {
      label: 'PNCP — Portal Nacional de Contratações Públicas',
      url: `https://pncp.gov.br/app/contratos?q=${CEAP_CNPJ}`,
      desc: 'Contratos com órgãos públicos de todas as esferas',
    },
    {
      label: 'Receita Federal — Comprovante de Inscrição',
      url: `https://solucoes.receita.fazenda.gov.br/Servicos/cnpjreva/Cnpjreva_Solicitacao.asp`,
      desc: 'Cadastro oficial do CNPJ',
    },
    {
      label: 'CEIS — Cadastro de Empresas Inidôneas',
      url: `https://portaldatransparencia.gov.br/sancoes/ceis?cadastro=&nomeSancionado=&cpfCnpj=${CEAP_CNPJ}`,
      desc: 'Verificação de sanções administrativas',
    },
  ];
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {links.map(l => (
        <a
          key={l.url}
          href={l.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block p-4 border rounded-lg hover:border-primary hover:bg-accent/50 transition-colors group"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <p className="font-medium text-sm group-hover:text-primary">{l.label}</p>
              <p className="text-xs text-muted-foreground mt-1">{l.desc}</p>
            </div>
            <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary shrink-0" />
          </div>
        </a>
      ))}
    </div>
  );
};

// ─── Main Page ───────────────────────────────────────────────────────────
export const GovDataDashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Globe className="w-6 h-6 text-primary" />
          Consultas Governamentais — CEAP
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Ficha 360º do CNPJ <span className="font-mono font-semibold">{CEAP_CNPJ_FORMATTED}</span> com
          dados públicos consolidados de fontes oficiais.
        </p>
      </div>

      <Tabs defaultValue="ficha" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="ficha" className="text-xs gap-1">
            <Building2 className="w-3 h-3" />
            <span className="hidden sm:inline">Ficha Cadastral</span>
            <span className="sm:hidden">Ficha</span>
          </TabsTrigger>
          <TabsTrigger value="transferegov" className="text-xs gap-1">
            <DollarSign className="w-3 h-3" />
            <span className="hidden sm:inline">TransfereGov</span>
            <span className="sm:hidden">Transf.</span>
          </TabsTrigger>
          <TabsTrigger value="emendas" className="text-xs gap-1">
            <Vote className="w-3 h-3" />
            <span>Emendas</span>
          </TabsTrigger>
          <TabsTrigger value="pncp" className="text-xs gap-1">
            <FileText className="w-3 h-3" />
            <span>Contratos</span>
          </TabsTrigger>
          <TabsTrigger value="links" className="text-xs gap-1">
            <ExternalLink className="w-3 h-3" />
            <span>Portais</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ficha">
          <FichaCadastral />
        </TabsContent>

        <TabsContent value="transferegov">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">TransfereGov — Transferências</CardTitle>
              <CardDescription className="text-xs">
                Planos de Ação Especial, Executores, Fundo a Fundo e TED filtrados pelo CNPJ do CEAP
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TransfereGovTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="emendas">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Emendas Parlamentares</CardTitle>
              <CardDescription className="text-xs">
                Emendas com beneficiário CEAP — fonte: Portal da Transparência (CGU)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EmendasTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pncp">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contratos Públicos (PNCP)</CardTitle>
              <CardDescription className="text-xs">
                Contratos do CEAP como fornecedor com órgãos públicos federais, estaduais e municipais
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PncpTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="links">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Portais Oficiais</CardTitle>
              <CardDescription className="text-xs">
                Acesso direto aos portais governamentais com o CNPJ do CEAP pré-preenchido
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LinksExternos />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default GovDataDashboard;
