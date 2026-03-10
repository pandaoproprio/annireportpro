import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { differenceInCalendarDays, eachDayOfInterval, parseISO, format } from 'date-fns';

export interface Sprint {
  id: string;
  project_id: string;
  user_id: string;
  name: string;
  goal: string;
  start_date: string;
  end_date: string;
  status: 'planning' | 'active' | 'completed' | 'cancelled';
  velocity_planned: number;
  velocity_completed: number;
  metadata: any;
  created_at: string;
  updated_at: string;
}

export interface SprintItem {
  id: string;
  sprint_id: string;
  project_id: string;
  user_id: string;
  title: string;
  description: string;
  story_points: number;
  status: 'todo' | 'in_progress' | 'done' | 'blocked';
  assignee_name: string;
  activity_id: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type SprintForm = { name: string; goal: string; start_date: string; end_date: string };
export type SprintItemForm = { title: string; description: string; story_points: string; assignee_name: string };

export interface BurndownPoint { date: string; ideal: number; actual: number }

export const SPRINT_STATUS_LABELS: Record<string, string> = {
  planning: 'Planejamento',
  active: 'Ativo',
  completed: 'Concluído',
  cancelled: 'Cancelado',
};

export const ITEM_STATUS_LABELS: Record<string, string> = {
  todo: 'A Fazer',
  in_progress: 'Em Progresso',
  done: 'Concluído',
  blocked: 'Bloqueado',
};

export function useSprints(projectId: string | undefined) {
  const { user } = useAuth();
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [items, setItems] = useState<SprintItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!projectId) { setSprints([]); setItems([]); setIsLoading(false); return; }
    setIsLoading(true);
    const [spRes, itRes] = await Promise.all([
      supabase.from('sprints' as any).select('*').eq('project_id', projectId).order('start_date', { ascending: false }),
      supabase.from('sprint_items' as any).select('*').eq('project_id', projectId).order('created_at'),
    ]);
    setSprints((spRes.data || []) as unknown as Sprint[]);
    setItems((itRes.data || []) as unknown as SprintItem[]);
    setIsLoading(false);
  }, [projectId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Sprint CRUD
  const createSprint = async (form: SprintForm) => {
    if (!projectId || !user) return false;
    const { error } = await supabase.from('sprints' as any).insert({
      project_id: projectId, user_id: user.id,
      name: form.name, goal: form.goal,
      start_date: form.start_date, end_date: form.end_date,
    } as any);
    if (error) { toast.error('Erro ao criar sprint'); return false; }
    toast.success('Sprint criada!'); fetchAll(); return true;
  };

  const updateSprint = async (id: string, updates: Partial<Sprint>) => {
    const { error } = await supabase.from('sprints' as any).update(updates as any).eq('id', id);
    if (error) { toast.error('Erro ao atualizar sprint'); return false; }
    toast.success('Sprint atualizada!'); fetchAll(); return true;
  };

  const deleteSprint = async (id: string) => {
    const { error } = await supabase.from('sprints' as any).delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir sprint'); return false; }
    toast.success('Sprint excluída!'); fetchAll(); return true;
  };

  const startSprint = async (id: string) => updateSprint(id, { status: 'active' } as any);
  const completeSprint = async (id: string) => {
    const sprintItems = items.filter(i => i.sprint_id === id);
    const completed = sprintItems.filter(i => i.status === 'done').reduce((s, i) => s + i.story_points, 0);
    return updateSprint(id, { status: 'completed', velocity_completed: completed } as any);
  };

  // Sprint Item CRUD
  const createItem = async (sprintId: string, form: SprintItemForm) => {
    if (!projectId || !user) return false;
    const { error } = await supabase.from('sprint_items' as any).insert({
      sprint_id: sprintId, project_id: projectId, user_id: user.id,
      title: form.title, description: form.description,
      story_points: parseInt(form.story_points) || 1,
      assignee_name: form.assignee_name,
    } as any);
    if (error) { toast.error('Erro ao criar item'); return false; }
    toast.success('Item adicionado!'); fetchAll(); return true;
  };

  const updateItemStatus = async (id: string, status: SprintItem['status']) => {
    const updates: any = { status };
    if (status === 'done') updates.completed_at = new Date().toISOString();
    else updates.completed_at = null;
    const { error } = await supabase.from('sprint_items' as any).update(updates).eq('id', id);
    if (error) { toast.error('Erro ao atualizar'); return false; }
    fetchAll(); return true;
  };

  const deleteItem = async (id: string) => {
    const { error } = await supabase.from('sprint_items' as any).delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir'); return false; }
    toast.success('Item excluído'); fetchAll(); return true;
  };

  // Burndown data for a sprint
  const getBurndown = (sprintId: string): BurndownPoint[] => {
    const sprint = sprints.find(s => s.id === sprintId);
    if (!sprint) return [];
    const sprintItems = items.filter(i => i.sprint_id === sprintId);
    const totalPoints = sprintItems.reduce((s, i) => s + i.story_points, 0);
    if (totalPoints === 0) return [];

    const start = parseISO(sprint.start_date);
    const end = parseISO(sprint.end_date);
    const totalDays = differenceInCalendarDays(end, start);
    if (totalDays <= 0) return [];

    const days = eachDayOfInterval({ start, end });
    const today = new Date();

    return days.map((day, idx) => {
      const ideal = totalPoints - (totalPoints * idx / totalDays);
      const completedBefore = sprintItems
        .filter(i => i.status === 'done' && i.completed_at && parseISO(i.completed_at) <= day)
        .reduce((s, i) => s + i.story_points, 0);
      return {
        date: format(day, 'dd/MM'),
        ideal: Math.round(ideal * 10) / 10,
        actual: day <= today ? totalPoints - completedBefore : NaN,
      };
    });
  };

  // Velocity history (completed sprints)
  const velocityHistory = sprints
    .filter(s => s.status === 'completed')
    .sort((a, b) => a.start_date.localeCompare(b.start_date))
    .map(s => ({
      name: s.name,
      planned: s.velocity_planned || items.filter(i => i.sprint_id === s.id).reduce((sum, i) => sum + i.story_points, 0),
      completed: s.velocity_completed,
    }));

  const avgVelocity = velocityHistory.length > 0
    ? velocityHistory.reduce((s, v) => s + v.completed, 0) / velocityHistory.length
    : 0;

  return {
    sprints, items, isLoading,
    createSprint, updateSprint, deleteSprint, startSprint, completeSprint,
    createItem, updateItemStatus, deleteItem,
    getBurndown, velocityHistory, avgVelocity,
    fetchAll,
  };
}
