import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface SidebarLinkProps {
  to: string;
  icon: React.ReactNode;
  label: string;
}

export const SidebarLink: React.FC<SidebarLinkProps> = ({ to, icon, label }) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link 
      to={to} 
      className={cn(
        "flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200",
        isActive 
          ? "bg-primary text-primary-foreground translate-x-1 shadow-md" 
          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:translate-x-1"
      )}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </Link>
  );
};
