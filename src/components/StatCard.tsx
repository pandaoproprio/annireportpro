import React from 'react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  colorClass?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ 
  label, 
  value, 
  colorClass = "text-primary" 
}) => {
  return (
    <div className="bg-card p-6 rounded-lg shadow-sm border border-border hover:-translate-y-1 transition-transform duration-300 hover:shadow-lg cursor-default">
      <p className="text-sm text-muted-foreground font-medium">{label}</p>
      <p className={cn("text-3xl font-bold mt-2", colorClass)}>{value}</p>
    </div>
  );
};
