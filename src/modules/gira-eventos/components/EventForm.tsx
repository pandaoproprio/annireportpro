import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EVENT_CATEGORIES } from '../types';
import type { GiraEvent } from '../types';
import { EventCoverUpload } from './EventCoverUpload';
import { supabase } from '@/integrations/supabase/client';
import { ClipboardList } from 'lucide-react';

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
      linked_form_id: defaultValues?.linked_form_id ?? '',
    },
  });

  const category = watch('category');
  const status = watch('status');
  const projectId = watch('project_id');
  const linkedFormId = watch('linked_form_id');
  const [coverUrl, setCoverUrl] = useState<string | null>(defaultValues?.cover_image_url ?? null);

  // Fetch available forms
  const formsQuery = useQuery({
    queryKey: ['gira-forms-for-linking'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('forms')
        .select('id, title, status')
        .eq('status', 'ativo')
        .order('title');
      if (error) return [];
      return data as { id: string; title: string; status: string }[];
    },
  });

  const onFormSubmit = (data: any) => {
    onSubmit({ ...data, cover_image_url: coverUrl, linked_form_id: data.linked_form_id || null });
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
      <div>
        <Label>Imagem de Capa</Label>
        <EventCoverUpload value={coverUrl} onChange={setCoverUrl} />
      </div>
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

      {/* Link to GIRA Form */}
      <div>
        <Label className="flex items-center gap-1.5">
          <ClipboardList className="w-4 h-4" />
          Formulário de inscrição (GIRA Forms)
        </Label>
        <Select value={linkedFormId || '__none__'} onValueChange={v => setValue('linked_form_id', v === '__none__' ? '' : v)}>
          <SelectTrigger><SelectValue placeholder="Nenhum (inscrição padrão)" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Nenhum (inscrição padrão)</SelectItem>
            {(formsQuery.data || []).map(f => (
              <SelectItem key={f.id} value={f.id}>{f.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground mt-1">
          Vincule um formulário personalizado para coletar dados detalhados na inscrição.
        </p>
      </div>

      {projects && projects.length > 0 && (
        <div>
          <Label>Projeto vinculado</Label>
          <Select value={projectId || '__none__'} onValueChange={v => setValue('project_id', v === '__none__' ? '' : v)}>
            <SelectTrigger><SelectValue placeholder="Nenhum (opcional)" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Nenhum</SelectItem>
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
