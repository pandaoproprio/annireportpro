import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { usePermissions, AppPermission } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';

interface PermissionGuardProps {
  permission?: AppPermission;
  requireAdmin?: boolean;
  children: React.ReactNode;
}

const ACCESS_DENIED_MESSAGE =
  'Você não tem permissão para acessar este módulo. Entre em contato com o administrador.';

export const PermissionGuard: React.FC<PermissionGuardProps> = ({ permission, requireAdmin, children }) => {
  const { hasPermission, isAdmin } = usePermissions();
  const { toast } = useToast();

  const denied = (requireAdmin && !isAdmin) || (permission && !hasPermission(permission));

  useEffect(() => {
    if (denied) {
      toast({
        variant: 'destructive',
        title: 'Acesso negado',
        description: ACCESS_DENIED_MESSAGE,
      });
    }
  }, [denied, toast]);

  if (denied) {
    return <Navigate to="/activities" replace />;
  }

  return <>{children}</>;
};
