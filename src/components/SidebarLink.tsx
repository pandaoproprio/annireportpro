import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface SidebarLinkProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}

export const SidebarLink: React.FC<SidebarLinkProps> = ({ to, icon, label, onClick }) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link 
      to={to} 
      onClick={onClick}
      className={cn(
        "flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm",
        isActive 
          ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold" 
          : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
      )}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
};
