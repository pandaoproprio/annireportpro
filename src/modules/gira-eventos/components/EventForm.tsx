import React from 'react';
import { useForm } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EVENT_CATEGORIES } from '../types';
import type { GiraEvent } from '../types';
import { EventCoverUpload } from './EventCoverUpload';

interface EventFormProps {
  defaultValues?: Partial<GiraEvent>;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isLoading?: boolean;
  projects?: { id: string; name: string }[];
}

export const EventForm: React.FC<EventFormProps> = ({ defaultValues, onSubmit, onCancel, isLoading, projects }) => {
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    defaultValues: {
      title: defaultValues?.title ?? '',
      description: defaultValues?.description ?? '',
      location: defaultValues?.location ?? '',
      event_date: defaultValues?.event_date ? new Date(defaultValues.event_date).toISOString().slice(0, 16) : '',
      event_end_date: defaultValues?.event_end_date ? new Date(defaultValues.event_end_date).toISOString().slice(0, 16) : '',
      category: defaultValues?.category ?? 'geral',
      max_participants: defaultValues?.max_participants ?? '',
      project_id: defaultValues?.project_id ?? '',
      status: defaultValues?.status ?? 'ativo' as 'ativo' | 'encerrado' | 'cancelado',
    },
  });

  const category = watch('category');
  const status = watch('status');
  const projectId = watch('project_id');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="title">Título *</Label>
        <Input id="title" {...register('title', { required: 'Título obrigatório' })} placeholder="Nome do evento" />
        {errors.title && <p className="text-sm text-destructive mt-1">{errors.title.message as string}</p>}
      </div>

      <div>
        <Label htmlFor="description">Descrição</Label>
        <Textarea id="description" {...register('description')} placeholder="Descreva o evento..." rows={3} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="event_date">Data/Hora Início *</Label>
          <Input id="event_date" type="datetime-local" {...register('event_date', { required: 'Data obrigatória' })} />
          {errors.event_date && <p className="text-sm text-destructive mt-1">{errors.event_date.message as string}</p>}
        </div>
        <div>
          <Label htmlFor="event_end_date">Data/Hora Fim</Label>
          <Input id="event_end_date" type="datetime-local" {...register('event_end_date')} />
        </div>
      </div>

      <div>
        <Label htmlFor="location">Local</Label>
        <Input id="location" {...register('location')} placeholder="Endereço ou local do evento" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Categoria</Label>
          <Select value={category} onValueChange={v => setValue('category', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {EVENT_CATEGORIES.map(c => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="max_participants">Máx. Participantes</Label>
          <Input id="max_participants" type="number" {...register('max_participants')} placeholder="Ilimitado" />
        </div>
      </div>

      {projects && projects.length > 0 && (
        <div>
          <Label>Projeto vinculado</Label>
          <Select value={projectId} onValueChange={v => setValue('project_id', v)}>
            <SelectTrigger><SelectValue placeholder="Nenhum (opcional)" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">Nenhum</SelectItem>
              {projects.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {defaultValues?.id && (
        <div>
          <Label>Status</Label>
          <Select value={status} onValueChange={v => setValue('status', v as 'ativo' | 'encerrado' | 'cancelado')}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="encerrado">Encerrado</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={isLoading}>{defaultValues?.id ? 'Salvar' : 'Criar Evento'}</Button>
      </div>
    </form>
  );
};
