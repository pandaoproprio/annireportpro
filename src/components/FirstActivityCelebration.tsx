import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface FirstActivityCelebrationProps {
  open: boolean;
  onClose: () => void;
  userName: string;
  activityCount: number;
}

export const FirstActivityCelebration: React.FC<FirstActivityCelebrationProps> = ({
  open,
  onClose,
  userName,
  activityCount,
}) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md text-center">
        <DialogHeader className="items-center">
          <DialogTitle className="text-xl">
            🎉 Primeira atividade registrada!
          </DialogTitle>
          <DialogDescription className="text-base pt-2 space-y-1">
            <span className="block">Parabéns, {userName}.</span>
            <span className="block">Você iniciou o registro das ações do projeto.</span>
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-2">
          <Progress value={Math.min(activityCount * 10, 100)} className="h-2" />
          <p className="text-sm text-muted-foreground">
            {activityCount} atividade{activityCount !== 1 ? 's' : ''} registrada{activityCount !== 1 ? 's' : ''}
          </p>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Continuar registrando
          </Button>
          <Button onClick={() => { onClose(); }} className="flex-1">
            Ver painel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
