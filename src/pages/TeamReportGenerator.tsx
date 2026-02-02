import React, { useState, useRef } from 'react';
import { useProjects } from '@/hooks/useProjects';
import { TeamReport, PhotoWithCaption } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, FileText, Download, Image as ImageIcon, X, Eye, ArrowLeft, FileDown, Users, Edit2 } from 'lucide-react';
import { exportTeamReportToDocx } from '@/lib/teamReportDocxExport';
import { exportTeamReportToPdf } from '@/lib/teamReportPdfExport';
import { toast } from 'sonner';
import { RichTextEditor } from '@/components/ui/rich-text-editor';

export const TeamReportGenerator: React.FC = () => {
  const { activeProject: project } = useProjects();
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [providerName, setProviderName] = useState('');
  const [providerDocument, setProviderDocument] = useState('');
  const [responsibleName, setResponsibleName] = useState('');
  const [functionRole, setFunctionRole] = useState('');
  const [periodStart, setPeriodStart] = useState<Date | undefined>();
  const [periodEnd, setPeriodEnd] = useState<Date | undefined>();
  const [executionReport, setExecutionReport] = useState('');
  const [photosWithCaptions, setPhotosWithCaptions] = useState<PhotoWithCaption[]>([]);
  const [isPreview, setIsPreview] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <Users className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">Nenhum projeto selecionado</h2>
        <p className="text-muted-foreground">Selecione ou crie um projeto para gerar relatórios de equipe.</p>
      </div>
    );
  }

  const handleMemberSelect = (memberId: string) => {
    setSelectedMemberId(memberId);
    const member = project.team.find(m => m.id === memberId);
    if (member) {
      setResponsibleName(member.name);
      setFunctionRole(member.role);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            const newPhoto: PhotoWithCaption = {
              url: event.target!.result as string,
              caption: `Registro fotográfico das atividades realizadas`,
            };
            setPhotosWithCaptions(prev => [...prev, newPhoto]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removePhoto = (index: number) => {
    setPhotosWithCaptions(prev => prev.filter((_, i) => i !== index));
  };

  const updatePhotoCaption = (index: number, caption: string) => {
    setPhotosWithCaptions(prev => 
      prev.map((photo, i) => i === index ? { ...photo, caption } : photo)
    );
  };

  const handleExportDocx = async () => {
    if (!periodStart || !periodEnd) {
      toast.error('Preencha o período de referência');
      return;
    }
    if (!responsibleName) {
      toast.error('Preencha o nome do responsável');
      return;
    }
    if (!executionReport) {
      toast.error('Preencha o relato de execução');
      return;
    }

    setIsExporting(true);
    try {
      const reportData: TeamReport = {
        id: crypto.randomUUID(),
        projectId: project.id,
        teamMemberId: selectedMemberId,
        providerName,
        providerDocument,
        responsibleName,
        functionRole,
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
        executionReport,
        photos: photosWithCaptions.map(p => p.url),
        photoCaptions: photosWithCaptions,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await exportTeamReportToDocx({ project, report: reportData });
      toast.success('Relatório DOCX exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar DOCX:', error);
      toast.error('Erro ao exportar relatório');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPdf = async () => {
    if (!periodStart || !periodEnd) {
      toast.error('Preencha o período de referência');
      return;
    }
    if (!responsibleName) {
      toast.error('Preencha o nome do responsável');
      return;
    }
    if (!executionReport) {
      toast.error('Preencha o relato de execução');
      return;
    }

    setIsExporting(true);
    try {
      const reportData: TeamReport = {
        id: crypto.randomUUID(),
        projectId: project.id,
        teamMemberId: selectedMemberId,
        providerName,
        providerDocument,
        responsibleName,
        functionRole,
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
        executionReport,
        photos: photosWithCaptions.map(p => p.url),
        photoCaptions: photosWithCaptions,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await exportTeamReportToPdf({ project, report: reportData });
      toast.success('Relatório PDF exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast.error('Erro ao exportar relatório PDF');
    } finally {
      setIsExporting(false);
    }
  };

  // Form View
  if (!isPreview) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Users className="w-8 h-8 text-primary" />
              Relatório da Equipe de Trabalho
            </h1>
            <p className="text-muted-foreground mt-1">
              Gere relatórios individuais dos membros da equipe do projeto
            </p>
          </div>
        </div>

        {/* Project Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Informações do Projeto</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className="text-muted-foreground text-xs">Projeto</Label>
              <p className="font-medium">{project.name}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Termo de Fomento</Label>
              <p className="font-medium">{project.fomentoNumber}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Organização</Label>
              <p className="font-medium">{project.organizationName}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Financiador</Label>
              <p className="font-medium">{project.funder}</p>
            </div>
          </CardContent>
        </Card>

        {/* Identification Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">1. Dados de Identificação</CardTitle>
            <CardDescription>Selecione um membro da equipe ou preencha manualmente</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {project.team.length > 0 && (
              <div className="space-y-2">
                <Label>Membro da Equipe (opcional)</Label>
                <Select value={selectedMemberId} onValueChange={handleMemberSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar membro cadastrado..." />
                  </SelectTrigger>
                  <SelectContent>
                    {project.team.map(member => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name} - {member.role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="providerName">Prestador (Empresa/PJ)</Label>
                <Input
                  id="providerName"
                  placeholder="Nome da empresa ou prestador"
                  value={providerName}
                  onChange={e => setProviderName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="providerDocument">CNPJ</Label>
                <Input
                  id="providerDocument"
                  placeholder="00.000.000/0000-00"
                  value={providerDocument}
                  onChange={e => setProviderDocument(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="responsibleName">Responsável Técnico *</Label>
                <Input
                  id="responsibleName"
                  placeholder="Nome completo"
                  value={responsibleName}
                  onChange={e => setResponsibleName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="functionRole">Função *</Label>
                <Input
                  id="functionRole"
                  placeholder="Ex: Coordenador de Produção"
                  value={functionRole}
                  onChange={e => setFunctionRole(e.target.value)}
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Period Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Período de Referência</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Data Início *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !periodStart && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {periodStart ? format(periodStart, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecionar data'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={periodStart}
                      onSelect={setPeriodStart}
                      locale={ptBR}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Data Fim *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !periodEnd && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {periodEnd ? format(periodEnd, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecionar data'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={periodEnd}
                      onSelect={setPeriodEnd}
                      locale={ptBR}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Execution Report Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">2. Relato de Execução</CardTitle>
            <CardDescription>
              Descreva detalhadamente as atividades realizadas no exercício da função. Use a barra de ferramentas para formatar o texto.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RichTextEditor
              value={executionReport}
              onChange={setExecutionReport}
              placeholder="No exercício da função de [função], o prestador atuou na viabilização..."
            />
          </CardContent>
        </Card>

        {/* Photos Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">3. Anexos de Comprovação</CardTitle>
            <CardDescription>Adicione fotos que comprovem as atividades realizadas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              ref={fileInputRef}
              onChange={handlePhotoUpload}
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="w-full"
            >
              <ImageIcon className="w-4 h-4 mr-2" />
              Adicionar Fotos
            </Button>

            {photosWithCaptions.length > 0 && (
              <div className="space-y-4">
                {photosWithCaptions.map((photo, idx) => (
                  <div key={idx} className="flex gap-4 items-start p-4 border rounded-lg bg-muted/30">
                    <div className="relative w-32 h-32 flex-shrink-0">
                      <img
                        src={photo.url}
                        alt={`Foto ${idx + 1}`}
                        className="w-full h-full object-cover rounded-lg border"
                      />
                      <button
                        onClick={() => removePhoto(idx)}
                        className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full shadow-md hover:bg-destructive/90"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="flex-1 space-y-2">
                      <Label htmlFor={`caption-${idx}`} className="text-sm font-medium flex items-center gap-1">
                        <Edit2 className="w-3 h-3" />
                        Legenda da Foto {idx + 1}
                      </Label>
                      <Input
                        id={`caption-${idx}`}
                        value={photo.caption}
                        onChange={(e) => updatePhotoCaption(idx, e.target.value)}
                        placeholder="Descreva esta foto..."
                        className="w-full"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-end">
          <Button variant="outline" onClick={() => setIsPreview(true)}>
            <Eye className="w-4 h-4 mr-2" />
            Pré-visualizar
          </Button>
          <Button onClick={handleExportDocx} disabled={isExporting}>
            <FileDown className="w-4 h-4 mr-2" />
            {isExporting ? 'Exportando...' : 'Exportar DOCX'}
          </Button>
        </div>
      </div>
    );
  }

  // Preview View
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={() => setIsPreview(false)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar ao Formulário
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportPdf}>
            <Download className="w-4 h-4 mr-2" />
            Exportar PDF
          </Button>
          <Button onClick={handleExportDocx} disabled={isExporting}>
            <FileDown className="w-4 h-4 mr-2" />
            {isExporting ? 'Exportando...' : 'Exportar DOCX'}
          </Button>
        </div>
      </div>

      {/* Preview Content */}
      <Card className="p-8 bg-white text-black print:shadow-none">
        <div className="space-y-6">
          <h1 className="text-2xl font-bold text-center mb-8">RELATÓRIO DA EQUIPE DE TRABALHO</h1>
          
          <div className="space-y-1">
            <p><strong>Termo de Fomento nº:</strong> {project.fomentoNumber}</p>
            <p><strong>Projeto:</strong> {project.name}</p>
            <p><strong>Período de Referência:</strong> [{periodStart ? format(periodStart, 'MM/yyyy') : '--'} à {periodEnd ? format(periodEnd, 'MM/yyyy') : '--'}]</p>
          </div>

          <div>
            <h2 className="text-lg font-bold mt-6 mb-3">1. Dados de Identificação</h2>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Prestador:</strong> {providerName || '[Não informado]'}</li>
              <li><strong>Responsável Técnico:</strong> {responsibleName}</li>
              <li><strong>Função:</strong> {functionRole}</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-bold mt-6 mb-3">2. Relato de Execução da Coordenação do Projeto</h2>
            <div 
              className="text-justify prose prose-sm max-w-none [&_ul]:list-disc [&_ul]:ml-6 [&_ol]:list-decimal [&_ol]:ml-6 [&_p]:my-2"
              dangerouslySetInnerHTML={{ __html: executionReport || '<p>[Nenhum relato informado]</p>' }}
            />
          </div>

          {photosWithCaptions.length > 0 && (
            <div>
              <h2 className="text-lg font-bold mt-6 mb-3">3. Anexos de Comprovação</h2>
              <div className="grid grid-cols-2 gap-4">
                {photosWithCaptions.map((photo, idx) => (
                  <div key={idx} className="space-y-2">
                    <img
                      src={photo.url}
                      alt={`Registro ${idx + 1}`}
                      className="w-full aspect-video object-cover rounded-lg border"
                    />
                    <p className="text-xs text-center italic text-gray-600">
                      Foto {idx + 1}: {photo.caption}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-12 pt-8">
            <p>Rio de Janeiro, {format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}.</p>
            
            <div className="mt-12 text-center">
              <p className="border-t border-black inline-block pt-2 px-16">
                Assinatura do responsável legal
              </p>
              <p className="mt-4"><strong>Nome e cargo:</strong> {responsibleName} - {functionRole}</p>
              <p><strong>CNPJ:</strong> {providerDocument || '[Não informado]'}</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
