import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  useGamification, LEVEL_LABELS, LEVEL_COLORS, RARITY_COLORS,
  nextLevelXp, levelProgress,
} from '@/hooks/useGamification';
import { BadgeIcon } from './BadgeIcon';
import { Trophy, Lock, Target, Sparkles, RefreshCw, Crown, Flame, Shield } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export function GamificationPanel() {
  const {
    myStats, myStatsLoading, allStats, isAdmin,
    badges, myBadges, missions, myMissions,
    recalcAll, recalcMine,
  } = useGamification();

  const unlockedIds = new Set(myBadges.map(b => b.badge_id));

  if (myStatsLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  const stats = myStats;
  const xp = stats?.xp || 0;
  const level = stats?.level || 'bronze';
  const next = nextLevelXp(level);
  const progress = levelProgress(xp, level);

  return (
    <div className="space-y-6">
      {/* HERO LEVEL CARD */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b">
          <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-full bg-background border-4 border-primary/20 flex items-center justify-center ${LEVEL_COLORS[level]}`}>
                <Crown className="w-8 h-8" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Seu nível</p>
                <h2 className={`text-2xl font-bold ${LEVEL_COLORS[level]}`}>{LEVEL_LABELS[level]}</h2>
                <p className="text-sm text-muted-foreground">{xp.toLocaleString('pt-BR')} XP acumulado</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => recalcMine.mutate()} disabled={recalcMine.isPending}>
                <RefreshCw className={`w-4 h-4 mr-1.5 ${recalcMine.isPending ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
              {isAdmin && (
                <Button variant="default" size="sm" onClick={() => recalcAll.mutate()} disabled={recalcAll.isPending}>
                  <Sparkles className={`w-4 h-4 mr-1.5 ${recalcAll.isPending ? 'animate-spin' : ''}`} />
                  Recalcular todos
                </Button>
              )}
            </div>
          </CardHeader>
        </div>
        <CardContent className="pt-6 space-y-4">
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-muted-foreground">Próximo nível</span>
              <span className="font-medium">{xp} / {next} XP</span>
            </div>
            <Progress value={progress} className="h-3" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatTile icon={<Flame className="w-4 h-4 text-orange-500" />} label="Sem retrabalho" value={stats?.streak_no_rework || 0} suffix="dias" />
            <StatTile icon={<Shield className="w-4 h-4 text-emerald-500" />} label="No prazo" value={stats?.streak_on_time || 0} suffix="dias" />
            <StatTile icon={<Target className="w-4 h-4 text-blue-500" />} label="Atividades" value={stats?.total_activities || 0} />
            <StatTile icon={<Trophy className="w-4 h-4 text-yellow-500" />} label="Badges" value={`${unlockedIds.size}/${badges.length}`} />
          </div>
        </CardContent>
      </Card>

      {/* MISSIONS */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Missões da semana
          </CardTitle>
        </CardHeader>
        <CardContent>
          {missions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhuma missão ativa no momento.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {missions.map(m => {
                const userMission = myMissions.find(um => um.mission_id === m.id);
                const progress = userMission?.progress || 0;
                const pct = Math.min(100, (progress / Math.max(m.target_value, 1)) * 100);
                const completed = !!userMission?.completed_at;
                return (
                  <div key={m.id} className={`p-4 rounded-lg border ${completed ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20' : 'bg-muted/20'}`}>
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-sm">{m.title}</h4>
                      <Badge variant="secondary" className="text-[10px]">+{m.xp_reward} XP</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">{m.description}</p>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span>{progress} / {m.target_value}</span>
                      {completed && <span className="text-emerald-600 font-medium">✓ Concluída</span>}
                    </div>
                    <Progress value={pct} className="h-2" />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* BADGES */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            Conquistas ({unlockedIds.size}/{badges.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TooltipProvider>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
              {badges.map(b => {
                const unlocked = unlockedIds.has(b.id);
                return (
                  <Tooltip key={b.id}>
                    <TooltipTrigger asChild>
                      <div className={`aspect-square rounded-xl border-2 ${unlocked ? RARITY_COLORS[b.rarity] : 'border-dashed border-muted bg-muted/20 opacity-50'} flex flex-col items-center justify-center p-2 transition-transform hover:scale-105 cursor-help`}>
                        {unlocked ? (
                          <BadgeIcon name={b.icon} className="w-6 h-6 text-foreground" />
                        ) : (
                          <Lock className="w-5 h-5 text-muted-foreground" />
                        )}
                        <span className="text-[10px] text-center mt-1 leading-tight font-medium line-clamp-2">{b.name}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="space-y-1 max-w-[200px]">
                        <p className="font-semibold">{b.name}</p>
                        <p className="text-xs">{b.description}</p>
                        <p className="text-xs text-muted-foreground">+{b.xp_reward} XP · {b.rarity}</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </TooltipProvider>
        </CardContent>
      </Card>

      {/* RANKING — admin only */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Crown className="w-5 h-5 text-yellow-500" />
              Ranking de XP (apenas admins)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {allStats.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhum dado. Clique em "Recalcular todos".</p>
            ) : (
              <div className="space-y-2">
                {allStats.slice(0, 20).map((u, idx) => (
                  <div key={u.user_id} className="flex items-center gap-3 p-2.5 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      idx === 0 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400' :
                      idx === 1 ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' :
                      idx === 2 ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{u.user_name}</p>
                      <p className={`text-xs ${LEVEL_COLORS[u.level]}`}>{LEVEL_LABELS[u.level]}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm">{u.xp.toLocaleString('pt-BR')} XP</p>
                      <p className="text-[10px] text-muted-foreground">Score: {Number(u.current_score).toFixed(0)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatTile({ icon, label, value, suffix }: { icon: React.ReactNode; label: string; value: number | string; suffix?: string }) {
  return (
    <div className="rounded-lg bg-muted/40 border p-3">
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
      <p className="text-lg font-bold leading-none">
        {value}
        {suffix && <span className="text-xs text-muted-foreground font-normal ml-1">{suffix}</span>}
      </p>
    </div>
  );
}
