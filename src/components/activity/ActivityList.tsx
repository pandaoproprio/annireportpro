import React from 'react';
import { Activity, ActivityType } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Calendar, MapPin, Users, Edit, Trash2, Eye, 
  FileEdit, Play, UserCircle, Lock, Shield
} from 'lucide-react';
import { canEditActivity, isWithinEditWindow } from '@/lib/diaryEditRules';

interface ActivityListProps {
  activities: Activity[];
  isAdmin: boolean;
  onEdit: (activity: Activity) => void;
  onDelete: (id: string) => void;
  onView: (activity: Activity) => void;
  onPhotoClick: (url: string) => void;
  removingId: string | null;
}

const getTypeColor = (type: ActivityType) => {
  switch (type) {
    case ActivityType.EXECUCAO: return 'bg-success/10 text-success border-success/30';
    case ActivityType.OCORRENCIA: return 'bg-destructive/10 text-destructive border-destructive/30';
    case ActivityType.COMUNICACAO: return 'bg-info/10 text-info border-info/30';
    case ActivityType.REUNIAO: return 'bg-warning/10 text-warning border-warning/30';
    default: return 'bg-muted text-muted-foreground';
  }
};

export const ActivityList: React.FC<ActivityListProps> = ({
  activities, isAdmin, onEdit, onDelete, onView, onPhotoClick, removingId,
}) => {
  if (activities.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground mb-2">Ainda não há atividades registradas.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {activities.map(act => (
        <Card key={act.id} className={`hover:shadow-md transition-shadow ${removingId === act.id ? 'animate-fade-out' : ''}`}>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row justify-between gap-4">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {act.isDraft && (
                    <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 animate-pulse">
                      <FileEdit className="w-3 h-3 mr-1" /> Rascunho
                    </Badge>
                  )}
                  {!isWithinEditWindow(act.createdAt) && !act.isDraft && (
                    <Badge variant="outline" className="bg-muted text-muted-foreground border-muted-foreground/30">
                      <Lock className="w-3 h-3 mr-1" /> Registro consolidado
                    </Badge>
                  )}
                  {act.isLinkedToReport && (
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                      <Shield className="w-3 h-3 mr-1" /> Vinculado a relatório
                    </Badge>
                  )}
                  <Badge variant="outline" className={getTypeColor(act.type)}>
                    {act.type}
                  </Badge>
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(act.date).toLocaleDateString('pt-BR')}
                    {act.endDate && ` - ${new Date(act.endDate).toLocaleDateString('pt-BR')}`}
                  </span>
                  {act.location && (
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {act.location}
                    </span>
                  )}
                  {act.attendeesCount > 0 && (
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {act.attendeesCount}
                    </span>
                  )}
                </div>
                {act.authorName && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <UserCircle className="w-3.5 h-3.5" />
                    <span className="font-medium">{act.authorName}</span>
                    {act.projectRoleSnapshot && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {act.projectRoleSnapshot}
                      </Badge>
                    )}
                    {act.setorResponsavel && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/30 text-primary">
                        {act.setorResponsavel}
                      </Badge>
                    )}
                  </div>
                )}
                <p className="text-foreground">{act.description}</p>
                {act.results && (
                  <p className="text-sm text-muted-foreground"><strong>Resultados:</strong> {act.results}</p>
                )}
              </div>
              <div className="flex md:flex-col gap-2">
                <Button variant="outline" size="sm" onClick={() => onView(act)} title="Ver detalhes">
                  <Eye className="w-4 h-4" />
                </Button>
                {(() => {
                  const editCheck = canEditActivity(act.createdAt, isAdmin, act.isLinkedToReport);
                  return (
                    <>
                      <Button variant="outline" size="sm" onClick={() => onEdit(act)} disabled={!editCheck.allowed} title={editCheck.reason || 'Editar'}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => onDelete(act.id)} disabled={!editCheck.allowed} className="text-destructive hover:text-destructive" title={editCheck.reason || 'Excluir'}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  );
                })()}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
