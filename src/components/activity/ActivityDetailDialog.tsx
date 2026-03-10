import React from 'react';
import { Activity, ActivityType, Project } from '@/types';
import { ActivityNarrativePanel } from './ActivityNarrativePanel';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Calendar, MapPin, Users, Eye, FileEdit, UserCircle, Lock, Paperclip, FileText
} from 'lucide-react';
import { isWithinEditWindow } from '@/lib/diaryEditRules';

interface ActivityDetailDialogProps {
  activity: Activity | null;
  project: Project | null;
  onClose: () => void;
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

export const ActivityDetailDialog: React.FC<ActivityDetailDialogProps> = ({ activity, project, onClose }) => {
  return (
    <Dialog open={!!activity} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-primary" />
            Detalhes da Atividade
          </DialogTitle>
        </DialogHeader>
        {activity && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              {activity.isDraft && (
                <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
                  <FileEdit className="w-3 h-3 mr-1" /> Rascunho
                </Badge>
              )}
              {!isWithinEditWindow(activity.createdAt) && !activity.isDraft && (
                <Badge variant="outline" className="bg-muted text-muted-foreground border-muted-foreground/30">
                  <Lock className="w-3 h-3 mr-1" /> Registro consolidado
                </Badge>
              )}
              <Badge variant="outline" className={getTypeColor(activity.type)}>
                {activity.type}
              </Badge>
            </div>

            {activity.authorName && (
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                <UserCircle className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">{activity.authorName}</p>
                  {activity.projectRoleSnapshot && (
                    <p className="text-xs text-muted-foreground">{activity.projectRoleSnapshot}</p>
                  )}
                  {activity.setorResponsavel && (
                    <p className="text-xs text-primary font-medium">{activity.setorResponsavel}</p>
                  )}
                </div>
              </div>
            )}
            {activity.createdAt && (
              <p className="text-xs text-muted-foreground">
                Registrado em: {new Date(activity.createdAt).toLocaleString('pt-BR')}
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase">Data</p>
                <p className="text-sm flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                  {new Date(activity.date).toLocaleDateString('pt-BR')}
                  {activity.endDate && ` a ${new Date(activity.endDate).toLocaleDateString('pt-BR')}`}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase">Local</p>
                <p className="text-sm flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                  {activity.location || '—'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase">Participantes</p>
                <p className="text-sm flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-muted-foreground" />
                  {activity.attendeesCount || 0}
                </p>
              </div>
              {activity.goalId && project?.goals && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase">Meta</p>
                  <p className="text-sm">
                    {project.goals.find(g => g.id === activity.goalId)?.title || '—'}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase">Descrição</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{activity.description}</p>
            </div>

            {activity.results && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase">Resultados</p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{activity.results}</p>
              </div>
            )}

            {activity.challenges && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase">Desafios / Observações</p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{activity.challenges}</p>
              </div>
            )}

            {activity.teamInvolved && activity.teamInvolved.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase">Equipe Envolvida</p>
                <div className="flex flex-wrap gap-1">
                  {activity.teamInvolved.map((member, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">{member}</Badge>
                  ))}
                </div>
              </div>
            )}

            {activity.photos && activity.photos.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase">
                  Fotos e Vídeos ({activity.photos.length})
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {activity.photos.map((photo, idx) => (
                    <div key={idx} className="space-y-1">
                      {photo.match(/\.(mp4|mov|webm|avi)(\?|$)/i) ? (
                        <video src={photo} controls muted className="w-full h-32 object-cover rounded-md border" />
                      ) : (
                        <a href={photo} target="_blank" rel="noopener noreferrer">
                          <img
                            src={photo}
                            alt={activity.photoCaptions?.[String(idx)] || `Foto ${idx + 1}`}
                            className="w-full h-32 object-cover rounded-md border hover:opacity-90 transition-opacity cursor-pointer"
                          />
                        </a>
                      )}
                      {activity.photoCaptions?.[String(idx)] && (
                        <p className="text-xs text-muted-foreground italic text-center">{activity.photoCaptions[String(idx)]}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activity.attendanceFiles && activity.attendanceFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase">
                  <FileText className="w-3.5 h-3.5 inline mr-1" />
                  Lista de Presença
                </p>
                <div className="space-y-1">
                  {activity.attendanceFiles.map((file, idx) => (
                    <a key={idx} href={file.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline p-2 border rounded-md bg-muted/30">
                      <Paperclip className="w-3.5 h-3.5" />
                      {file.name}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
