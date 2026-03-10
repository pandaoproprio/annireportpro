import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { UserCheck } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflowId: string | null;
}

export function ReassignDialog({ open, onOpenChange, workflowId }: Props) {
  const [selectedUser, setSelectedUser] = useState('');
  const qc = useQueryClient();

  const { data: reviewers = [] } = useQuery({
    queryKey: ['workflow-reviewers'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('user_id, name, email');
      return data || [];
    },
    enabled: open,
  });

  const reassign = useMutation({
    mutationFn: async () => {
      if (!workflowId || !selectedUser) throw new Error('Dados insuficientes');
      const { error } = await supabase
        .from('report_workflows')
        .update({ assigned_to: selectedUser } as any)
        .eq('id', workflowId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all-workflows'] });
      toast.success('Revisor reatribuído');
      onOpenChange(false);
      setSelectedUser('');
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Erro ao reatribuir'),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-primary" />
            Reatribuir Revisor
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Select value={selectedUser} onValueChange={setSelectedUser}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o revisor" />
            </SelectTrigger>
            <SelectContent>
              {reviewers.map(r => (
                <SelectItem key={r.user_id} value={r.user_id}>
                  {r.name} ({r.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => reassign.mutate()} disabled={!selectedUser || reassign.isPending}>
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
