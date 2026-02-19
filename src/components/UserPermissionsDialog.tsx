import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Loader2, Shield, ToggleLeft, ToggleRight } from 'lucide-react';
import { AdminUser } from '@/hooks/useAdminUsers';
import { AppPermission } from '@/hooks/usePermissions';

interface ModuleConfig {
  key: AppPermission;
  label: string;
  actions: { key: AppPermission; label: string }[];
}

const MODULES: ModuleConfig[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    actions: [],
  },
  {
    key: 'diary',
    label: 'Diário de Bordo',
    actions: [
      { key: 'diary_create', label: 'Criar' },
      { key: 'diary_edit', label: 'Editar' },
      { key: 'diary_delete', label: 'Excluir' },
    ],
  },
  {
    key: 'report_object',
    label: 'Relatório do Objeto',
    actions: [
      { key: 'report_object_create', label: 'Criar' },
      { key: 'report_object_edit', label: 'Editar' },
      { key: 'report_object_delete', label: 'Excluir' },
    ],
  },
  {
    key: 'report_team',
    label: 'Relatório da Equipe',
    actions: [
      { key: 'report_team_create', label: 'Criar' },
      { key: 'report_team_edit', label: 'Editar' },
      { key: 'report_team_delete', label: 'Excluir' },
    ],
  },
  {
    key: 'team_management',
    label: 'Gestão de Equipes',
    actions: [
      { key: 'team_management_create', label: 'Criar' },
      { key: 'team_management_edit', label: 'Editar' },
      { key: 'team_management_delete', label: 'Excluir' },
    ],
  },
  {
    key: 'user_management',
    label: 'Gestão de Usuários',
    actions: [
      { key: 'user_management_create', label: 'Criar' },
      { key: 'user_management_edit', label: 'Editar' },
      { key: 'user_management_delete', label: 'Excluir' },
    ],
  },
  {
    key: 'system_logs',
    label: 'Logs do Sistema',
    actions: [],
  },
  {
    key: 'settings_edit',
    label: 'Configurações',
    actions: [],
  },
  {
    key: 'project_create',
    label: 'Criar Projetos',
    actions: [],
  },
  {
    key: 'project_delete',
    label: 'Excluir Projetos',
    actions: [],
  },
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
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      setSelected(new Set(user.permissions));
    }
  }, [user]);

  const has = (perm: string) => selected.has(perm);

  const toggle = (perm: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(perm)) {
        next.delete(perm);
      } else {
        next.add(perm);
      }
      return next;
    });
  };

  const toggleModule = (mod: ModuleConfig, enabled: boolean) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (enabled) {
        next.add(mod.key);
      } else {
        next.delete(mod.key);
        mod.actions.forEach(a => next.delete(a.key));
      }
      return next;
    });
  };

  const enableAll = () => {
    const all = new Set<string>();
    MODULES.forEach(m => {
      all.add(m.key);
      m.actions.forEach(a => all.add(a.key));
    });
    setSelected(all);
  };

  const disableAll = () => setSelected(new Set());

  const allKeys = useMemo(() => {
    const keys: string[] = [];
    MODULES.forEach(m => {
      keys.push(m.key);
      m.actions.forEach(a => keys.push(a.key));
    });
    return keys;
  }, []);

  const allEnabled = allKeys.every(k => selected.has(k));
  const noneEnabled = selected.size === 0;

  const handleSave = async () => {
    if (!user) return;
    const result = await onSave(user.id, Array.from(selected));
    if (result.success) {
      onOpenChange(false);
    }
  };

  const isSuperAdmin = user?.role === 'super_admin';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
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
          <div className="space-y-4">
            {/* Bulk controls */}
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={enableAll}
                disabled={allEnabled}
                className="gap-1.5 text-xs"
              >
                <ToggleRight className="w-3.5 h-3.5" />
                Ativar Tudo
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={disableAll}
                disabled={noneEnabled}
                className="gap-1.5 text-xs"
              >
                <ToggleLeft className="w-3.5 h-3.5" />
                Desativar Tudo
              </Button>
            </div>

            {/* Module matrix */}
            <div className="space-y-2">
              {MODULES.map(mod => {
                const moduleOn = has(mod.key);
                const hasActions = mod.actions.length > 0;

                return (
                  <div
                    key={mod.key}
                    className="rounded-lg border bg-card p-3 space-y-2"
                  >
                    {/* Module header row */}
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm text-foreground">{mod.label}</span>
                      <Switch
                        checked={moduleOn}
                        onCheckedChange={(checked) => toggleModule(mod, checked)}
                      />
                    </div>

                    {/* Action switches */}
                    {hasActions && moduleOn && (
                      <div className="flex flex-wrap gap-3 pl-2 pt-1 border-t border-border/50">
                        {mod.actions.map(action => {
                          const isDelete = action.label === 'Excluir';
                          return (
                            <label
                              key={action.key}
                              className="flex items-center gap-2 cursor-pointer py-1"
                            >
                              <Switch
                                checked={has(action.key)}
                                onCheckedChange={() => toggle(action.key)}
                                className={isDelete ? 'data-[state=checked]:bg-destructive' : ''}
                              />
                              <span className={`text-xs ${isDelete ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                                {action.label}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
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
