import React from 'react';
import { Navigate } from 'react-router-dom';
import { usePermissions, AppPermission } from '@/hooks/usePermissions';

interface PermissionGuardProps {
  permission?: AppPermission;
  requireAdmin?: boolean;
  children: React.ReactNode;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({ permission, requireAdmin, children }) => {
  const { hasPermission, isAdmin } = usePermissions();

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  if (permission && !hasPermission(permission)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
