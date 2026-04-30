import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface QuickCreatedUser {
  user_id: string;
  name: string;
  email: string;
  role?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (user: QuickCreatedUser) => void;
}

export const QuickCreateOficineiroDialog: React.FC<Props> = ({ open, onOpenChange, onCreated }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [funcao, setFuncao] = useState('Oficineiro');
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setName(''); setEmail(''); setFuncao('Oficineiro');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error('Preencha nome e e-mail.');
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('quick-create-oficineiro', {
        body: { name: name.trim(), email: email.trim().toLowerCase(), funcao: funcao.trim() },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const user = (data as any).user as QuickCreatedUser;
      if ((data as any).existed) {
        toast.info(`${user.name} já estava cadastrado — selecionado para o registro.`);
      } else {
        toast.success(`${user.name} cadastrado(a) como Oficineiro. E-mail de boas-vindas enviado.`);
      }
      onCreated(user);
      reset();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao cadastrar oficineiro.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!saving) { onOpenChange(v); if (!v) reset(); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" /> Cadastrar Oficineiro
          </DialogTitle>
          <DialogDescription>
            Cria o acesso rapidamente. O usuário receberá e-mail de boas-vindas com link para definir a senha.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nome completo</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Maria da Silva" required />
          </div>
          <div className="space-y-2">
            <Label>E-mail</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" required />
          </div>
          <div className="space-y-2">
            <Label>Função</Label>
            <Input value={funcao} onChange={(e) => setFuncao(e.target.value)} placeholder="Ex.: Oficineiro de Teatro" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Cadastrar e selecionar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
