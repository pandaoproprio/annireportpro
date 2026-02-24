import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { TemplateCard } from '@/components/template/TemplateCard';
import { useReportTemplates } from '@/hooks/useReportTemplates';
import { Plus, Search, Layers } from 'lucide-react';

export const ReportTemplates: React.FC = () => {
  const navigate = useNavigate();
  const { templates, isLoading, duplicateTemplate, deleteTemplate, toggleActive } = useReportTemplates();

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = templates.filter(t => {
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'all' || t.type === filterType;
    return matchSearch && matchType;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Layers className="w-6 h-6 text-primary" />
            Templates de Relatórios
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Crie e gerencie modelos reutilizáveis de relatórios.</p>
        </div>
        <Button onClick={() => navigate('/templates/new')} className="bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" /> Novo Template
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar template..."
            className="pl-9"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="objeto">Objeto</SelectItem>
            <SelectItem value="equipe">Equipe</SelectItem>
            <SelectItem value="justificativa">Justificativa</SelectItem>
            <SelectItem value="personalizado">Personalizado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-40" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <Layers className="w-12 h-12 text-muted-foreground mx-auto" />
          <h3 className="text-lg font-medium text-foreground">Nenhum template encontrado</h3>
          <p className="text-sm text-muted-foreground">
            {search || filterType !== 'all' ? 'Tente ajustar os filtros.' : 'Crie seu primeiro template de relatório.'}
          </p>
          {!search && filterType === 'all' && (
            <Button onClick={() => navigate('/templates/new')} variant="outline">
              <Plus className="w-4 h-4 mr-2" /> Criar Template
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map(template => (
            <TemplateCard
              key={template.id}
              template={template}
              onEdit={(id) => navigate(`/templates/${id}`)}
              onDuplicate={(id) => duplicateTemplate.mutate(id)}
              onDelete={(id) => setDeleteId(id)}
              onToggleActive={(id, isActive) => toggleActive.mutate({ id, isActive })}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        title="Excluir Template"
        description="Tem certeza que deseja excluir este template? Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        variant="destructive"
        onConfirm={() => {
          if (deleteId) {
            deleteTemplate.mutate(deleteId);
            setDeleteId(null);
          }
        }}
      />
    </div>
  );
};
