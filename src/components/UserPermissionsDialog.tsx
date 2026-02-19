import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Shield } from 'lucide-react';
import { AdminUser } from '@/hooks/useAdminUsers';
import { AppPermission } from '@/hooks/usePermissions';

const PERMISSIONS: { key: AppPermission; label: string; description: string }[] = [
  { key: 'dashboard', label: 'Dashboard', description: 'Visualizar painel de indicadores' },
  { key: 'diary', label: 'Diário de Bordo', description: 'Registrar e visualizar atividades' },
  { key: 'report_object', label: 'Relatório do Objeto', description: 'Gerar relatórios de cumprimento do objeto' },
  { key: 'report_team', label: 'Relatório da Equipe', description: 'Gerar relatórios individuais da equipe' },
  { key: 'team_management', label: 'Gestão de Equipes', description: 'Gerenciar membros da equipe técnica' },
];

interface UserPermissionsDialogProps {
  user: AdminUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (userId: string, permissions: string[]) => Promise<{ success: boolean }>;
  isSaving: boolean;
}

export const UserPermissionsDialog: React.FC<UserPermissionsDialogProps> = ({
  user, open, onOpenChange, onSave, isSaving,
}) => {
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      setSelected([...user.permissions]);
    }
  }, [user]);

  const toggle = (perm: string) => {
    setSelected(prev =>
      prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]
    );
  };

  const handleSave = async () => {
    if (!user) return;
    const result = await onSave(user.id, selected);
    if (result.success) {
      onOpenChange(false);
    }
  };

  const isSuperAdmin = user?.role === 'super_admin';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Permissões de Acesso
          </DialogTitle>
          <DialogDescription>
            Gerencie as permissões de <strong>{user?.name}</strong> ({user?.email})
          </DialogDescription>
        </DialogHeader>

        {isSuperAdmin ? (
          <div className="py-4 text-sm text-muted-foreground text-center">
            <Badge className="bg-amber-500/20 text-amber-700 mb-2">Super Admin</Badge>
            <p>Super Admins possuem acesso total ao sistema. Não é possível restringir permissões.</p>
          </div>
        ) : (
          <div className="space-y-3 py-2">
            {PERMISSIONS.map(perm => (
              <label
                key={perm.key}
                className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <Checkbox
                  checked={selected.includes(perm.key)}
                  onCheckedChange={() => toggle(perm.key)}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <span className="font-medium text-sm">{perm.label}</span>
                  <p className="text-xs text-muted-foreground">{perm.description}</p>
                </div>
              </label>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          {!isSuperAdmin && (
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar Permissões
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
