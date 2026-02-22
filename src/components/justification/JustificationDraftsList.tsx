import React from 'react';
import { JustificationReport } from '@/types/justificationReport';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileEdit, FileText, Loader2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Props {
  drafts: JustificationReport[];
  isLoading: boolean;
  onNewDraft: () => void;
  onEditDraft: (draft: JustificationReport) => void;
  onDeleteDraft: (id: string) => void;
}

export const JustificationDraftsList: React.FC<Props> = ({
  drafts, isLoading, onNewDraft, onEditDraft, onDeleteDraft,
}) => (
  <div className="max-w-4xl mx-auto space-y-6">
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <FileText className="w-8 h-8 text-primary" />
          Justificativa para Prorrogação
        </h1>
        <p className="text-muted-foreground mt-1">
          Elabore justificativas de prorrogação de prazo do projeto
        </p>
      </div>
      <Button onClick={onNewDraft}>
        <FileEdit className="w-4 h-4 mr-2" />
        Nova Justificativa
      </Button>
    </div>

    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Justificativas Salvas</CardTitle>
        <CardDescription>Continue editando ou crie uma nova</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : drafts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma justificativa salva ainda.</p>
            <p className="text-sm">Clique em "Nova Justificativa" para começar.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {drafts.map((draft) => (
              <div key={draft.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex-1">
                  <p className="font-medium">Justificativa de Prorrogação</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Atualizado em {format(new Date(draft.updatedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    {draft.isDraft && <span className="ml-2 text-warning font-medium">• Rascunho</span>}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => onEditDraft(draft)}>
                    <FileEdit className="w-4 h-4 mr-1" /> Editar
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir justificativa?</AlertDialogTitle>
                        <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onDeleteDraft(draft.id)}>Excluir</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  </div>
);
