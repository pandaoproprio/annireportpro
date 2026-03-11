import React from 'react';
import { usePermissions, AppPermission } from '@/hooks/usePermissions';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface PermissionGuardProps {
  permission?: AppPermission;
  requireAdmin?: boolean;
  children: React.ReactNode;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({ permission, requireAdmin, children }) => {
  const { hasPermission, isAdmin } = usePermissions();
  const navigate = useNavigate();

  if ((requireAdmin && !isAdmin) || (permission && !hasPermission(permission))) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <ShieldAlert className="w-12 h-12 text-destructive" />
        <h2 className="text-lg font-semibold text-foreground">Acesso negado</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          Você não tem permissão para acessar este módulo. Solicite acesso ao administrador do sistema.
        </p>
        <Button variant="outline" onClick={() => navigate('/')}>Voltar ao início</Button>
      </div>
    );
  }

  return <>{children}</>;
};
