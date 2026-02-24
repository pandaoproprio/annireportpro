import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical, Edit, Copy, Trash2, FileText, Users, FileCheck, Layers } from 'lucide-react';
import type { ReportTemplate } from '@/types/reportTemplate';

interface TemplateCardProps {
  template: ReportTemplate;
  onEdit: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
}

const typeConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  objeto: { label: 'Objeto', icon: <FileText className="w-4 h-4" />, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
  equipe: { label: 'Equipe', icon: <Users className="w-4 h-4" />, color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
  justificativa: { label: 'Justificativa', icon: <FileCheck className="w-4 h-4" />, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' },
  personalizado: { label: 'Personalizado', icon: <Layers className="w-4 h-4" />, color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' },
};

export const TemplateCard: React.FC<TemplateCardProps> = ({
  template, onEdit, onDuplicate, onDelete, onToggleActive,
}) => {
  const config = typeConfig[template.type] || typeConfig.personalizado;
  const sectionCount = template.structure?.length || 0;

  return (
    <Card className={`transition-all hover:shadow-md ${!template.isActive ? 'opacity-60' : ''}`}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="space-y-1 flex-1 min-w-0">
          <CardTitle className="text-base font-semibold truncate">{template.name}</CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className={config.color}>
              {config.icon}
              <span className="ml-1">{config.label}</span>
            </Badge>
            <span className="text-xs text-muted-foreground">{sectionCount} seções</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={template.isActive}
            onCheckedChange={(checked) => onToggleActive(template.id, checked)}
            aria-label="Ativar/desativar"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(template.id)}>
                <Edit className="w-4 h-4 mr-2" /> Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDuplicate(template.id)}>
                <Copy className="w-4 h-4 mr-2" /> Duplicar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(template.id)} className="text-destructive">
                <Trash2 className="w-4 h-4 mr-2" /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-xs text-muted-foreground space-y-1">
          <p>Criado em {new Date(template.createdAt).toLocaleDateString('pt-BR')}</p>
          {template.structure?.slice(0, 4).map((s, i) => (
            <span key={i} className="inline-block mr-2 px-2 py-0.5 bg-muted rounded text-xs">{s.title}</span>
          ))}
          {sectionCount > 4 && <span className="text-xs text-muted-foreground">+{sectionCount - 4} mais</span>}
        </div>
      </CardContent>
    </Card>
  );
};
