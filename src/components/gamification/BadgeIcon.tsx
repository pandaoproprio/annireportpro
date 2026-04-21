import {
  Award, Sparkles, Zap, Trophy, Crown, ShieldCheck, Gem, Clock,
  Medal, TrendingUp, Star, Flame, FileCheck,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  award: Award, sparkles: Sparkles, zap: Zap, trophy: Trophy, crown: Crown,
  'shield-check': ShieldCheck, gem: Gem, clock: Clock, medal: Medal,
  'trending-up': TrendingUp, star: Star, flame: Flame, 'file-check': FileCheck,
};

export function BadgeIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] || Award;
  return <Icon className={className} />;
}
