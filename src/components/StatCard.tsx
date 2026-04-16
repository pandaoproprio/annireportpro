import React from 'react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  colorClass?: string;
  onClick?: () => void;
  active?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({ 
  label, 
  value, 
  colorClass = "text-primary",
  onClick,
  active = false,
}) => {
  return (
    <div
      className={cn(
        "bg-card p-6 rounded-lg shadow-sm border border-border hover:-translate-y-1 transition-transform duration-300 hover:shadow-lg",
        onClick ? "cursor-pointer" : "cursor-default",
        active && "ring-2 ring-primary border-primary"
      )}
      onClick={onClick}
    >
      <p className="text-sm text-muted-foreground font-medium">{label}</p>
      <p className={cn("text-3xl font-bold mt-2", colorClass)}>{value}</p>
    </div>
  );
};
