import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  colorClass?: string;
  onClick?: () => void;
  active?: boolean;
  icon?: LucideIcon;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
}

function useAnimatedCount(target: number, duration = 800) {
  const [count, setCount] = useState(0);
  const prevTarget = useRef(0);
  useEffect(() => {
    if (isNaN(target)) { setCount(0); return; }
    const start = prevTarget.current;
    prevTarget.current = target;
    const diff = target - start;
    if (diff === 0) { setCount(target); return; }
    const startTime = performance.now();
    let raf: number;
    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      setCount(Math.round(start + diff * eased));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return count;
}

export const StatCard: React.FC<StatCardProps> = ({ 
  label, 
  value, 
  colorClass = "text-primary",
  onClick,
  active = false,
  icon: Icon,
  subtitle,
}) => {
  const numericValue = typeof value === 'number' ? value : parseInt(String(value), 10);
  const isNumeric = !isNaN(numericValue) && typeof value === 'number';
  const animatedValue = useAnimatedCount(isNumeric ? numericValue : 0);
  const displayValue = isNumeric ? animatedValue.toLocaleString('pt-BR') : value;

  return (
    <div
      className={cn(
        "bg-card p-5 rounded-xl shadow-sm border border-border hover:-translate-y-1 transition-all duration-300 hover:shadow-lg group",
        onClick ? "cursor-pointer" : "cursor-default",
        active && "ring-2 ring-primary border-primary"
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
          <p className={cn("text-3xl font-bold tabular-nums", colorClass)}>{displayValue}</p>
          {subtitle && (
            <p className="text-[11px] text-muted-foreground leading-tight">{subtitle}</p>
          )}
        </div>
        {Icon && (
          <div className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
            "bg-muted group-hover:bg-primary/10"
          )}>
            <Icon className={cn("w-5 h-5", colorClass)} />
          </div>
        )}
      </div>
    </div>
  );
};
