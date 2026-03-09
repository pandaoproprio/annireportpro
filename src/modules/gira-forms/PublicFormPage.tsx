import React, { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, ClipboardList, Loader2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import type { Form, FormField, FormDesignSettings } from './types';

export default function PublicFormPage() {
  const { id } = useParams<{ id: string }>();
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [respondentName, setRespondentName] = useState('');
  const [respondentEmail, setRespondentEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const formQuery = useQuery({
    queryKey: ['public-form', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('forms')
        .select('*')
        .eq('id', id!)
        .eq('status', 'ativo')
        .single();
      if (error) throw error;
      return data as unknown as Form;
    },
    enabled: !!id,
  });

  const fieldsQuery = useQuery({
    queryKey: ['public-form-fields', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('form_fields')
        .select('*')
        .eq('form_id', id!)
        .order('sort_order');
      if (error) throw error;
      return (data || []) as unknown as FormField[];
    },
    enabled: !!id,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('form_responses').insert({
        form_id: id!,
        respondent_name: respondentName || null,
        respondent_email: respondentEmail || null,
        answers: answers as any,
      });
      if (error) throw error;
    },
    onSuccess: () => setSubmitted(true),
    onError: () => toast.error('Erro ao enviar. Tente novamente.'),
  });

  const form = formQuery.data;
  const fields = fieldsQuery.data || [];
  const design: FormDesignSettings = (form?.settings || {}) as FormDesignSettings;

  const isDark = design.theme === 'dark';
  const isFullWidth = design.pageLayout === 'full';

  const brandStyles = useMemo(() => ({
    '--form-primary': design.primaryColor || '#2E7D32',
    '--form-button': design.buttonColor || design.primaryColor || '#2E7D32',
    '--form-bg': design.backgroundColor || (isDark ? '#1a1a2e' : '#f5f5f5'),
    '--form-card-bg': isDark ? '#16213e' : '#ffffff',
    '--form-text': isDark ? '#e0e0e0' : '#1a1a1a',
    '--form-muted': isDark ? '#a0a0a0' : '#6b7280',
    fontFamily: design.fontFamily || 'Inter, sans-serif',
  } as React.CSSProperties), [design, isDark]);

  const validate = () => {
    const errors: Record<string, string> = {};
    for (const field of fields) {
      if (field.required) {
        const val = answers[field.id];
        if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
          errors[field.id] = 'Campo obrigatório';
        }
      }
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.error('Preencha os campos obrigatórios.');
      return;
    }
    submitMutation.mutate();
  };

  const updateAnswer = (fieldId: string, value: unknown) => {
    setAnswers(prev => ({ ...prev, [fieldId]: value }));
    if (validationErrors[fieldId]) {
      setValidationErrors(prev => { const n = { ...prev }; delete n[fieldId]; return n; });
    }
  };

  if (formQuery.isLoading || fieldsQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#f5f5f5' }}>
        <div className="w-full max-w-2xl space-y-4">
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#f5f5f5' }}>
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-3">
            <AlertCircle className="w-12 h-12 mx-auto" style={{ color: '#999' }} />
            <h2 className="text-xl font-semibold">Formulário indisponível</h2>
            <p className="text-sm" style={{ color: '#666' }}>Este formulário não existe ou não está mais ativo.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const successMsg = design.successMessage || 'Obrigado por preencher o formulário.';

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ ...brandStyles, background: 'var(--form-bg)', color: 'var(--form-text)' }}>
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <div className="max-w-md w-full rounded-xl p-8 text-center space-y-4 shadow-lg" style={{ background: 'var(--form-card-bg)' }}>
            <CheckCircle2 className="w-16 h-16 mx-auto" style={{ color: 'var(--form-primary)' }} />
            <h2 className="text-2xl font-bold">Resposta enviada!</h2>
            <p style={{ color: 'var(--form-muted)' }}>{successMsg}</p>
            <button
              onClick={() => { setSubmitted(false); setAnswers({}); setRespondentName(''); setRespondentEmail(''); }}
              className="px-4 py-2 rounded-lg border text-sm font-medium hover:opacity-80 transition-opacity"
              style={{ borderColor: 'var(--form-primary)', color: 'var(--form-primary)' }}
            >
              Enviar outra resposta
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4" style={{ ...brandStyles, background: 'var(--form-bg)', color: 'var(--form-text)' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`mx-auto space-y-6 ${isFullWidth ? 'max-w-4xl' : 'max-w-2xl'}`}>

        {/* Cover image */}
        {design.coverImageUrl && (
          <div className="rounded-xl overflow-hidden shadow-md">
            <img src={design.coverImageUrl} alt="" className="w-full h-48 object-cover" />
          </div>
        )}

        {/* Form Header Card */}
        <div className="rounded-xl p-6 shadow-md" style={{ background: 'var(--form-card-bg)', borderTop: `4px solid var(--form-primary)` }}>
          {/* Header image */}
          {design.headerImageUrl && (
            <img src={design.headerImageUrl} alt="" className="w-full h-24 object-contain mb-4" />
          )}
          <div className="flex items-start gap-3">
            {design.logoUrl && (
              <img src={design.logoUrl} alt="Logo" className="h-12 w-12 object-contain rounded" />
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2" style={{ color: 'var(--form-primary)' }}>
                {!design.logoUrl && <ClipboardList className="w-5 h-5" />}
                <span className="text-xs font-medium uppercase tracking-wider">GIRA Forms</span>
              </div>
              <h1 className="text-2xl font-bold">{form.title}</h1>
              {form.description && <p className="mt-2" style={{ color: 'var(--form-muted)' }}>{form.description}</p>}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Respondent info */}
          <div className="rounded-xl p-5 shadow-sm space-y-4" style={{ background: 'var(--form-card-bg)' }}>
            <h3 className="font-medium text-sm" style={{ color: 'var(--form-muted)' }}>Identificação (opcional)</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm">Nome</Label>
                <Input value={respondentName} onChange={e => setRespondentName(e.target.value)} placeholder="Seu nome" className="mt-1" />
              </div>
              <div>
                <Label className="text-sm">E-mail</Label>
                <Input type="email" value={respondentEmail} onChange={e => setRespondentEmail(e.target.value)} placeholder="seu@email.com" className="mt-1" />
              </div>
            </div>
          </div>

          {/* Fields */}
          {fields.map((field, i) => (
            <motion.div key={field.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <div
                className="rounded-xl p-5 shadow-sm space-y-3"
                style={{
                  background: 'var(--form-card-bg)',
                  ...(validationErrors[field.id] ? { boxShadow: '0 0 0 2px #ef4444' } : {}),
                }}
              >
                <div>
                  <Label className="text-sm font-medium">
                    {field.label}
                    {field.required && <span className="ml-1" style={{ color: '#ef4444' }}>*</span>}
                  </Label>
                  {field.description && <p className="text-xs mt-0.5" style={{ color: 'var(--form-muted)' }}>{field.description}</p>}
                </div>
                <FieldInput field={field} value={answers[field.id]} onChange={val => updateAnswer(field.id, val)} />
                {validationErrors[field.id] && <p className="text-xs" style={{ color: '#ef4444' }}>{validationErrors[field.id]}</p>}
              </div>
            </motion.div>
          ))}

          <button
            type="submit"
            disabled={submitMutation.isPending}
            className="w-full py-3 rounded-lg text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            style={{ background: 'var(--form-button)' }}
          >
            {submitMutation.isPending ? 'Enviando...' : 'Enviar Resposta'}
          </button>
        </form>

        <p className="text-center text-xs pb-4" style={{ color: 'var(--form-muted)' }}>
          Powered by <span className="font-semibold">GIRA Forms</span>
        </p>
      </motion.div>
    </div>
  );
}

function FieldInput({ field, value, onChange }: { field: FormField; value: unknown; onChange: (v: unknown) => void }) {
  const options = field.options || [];

  switch (field.type) {
    case 'short_text':
      return <Input value={(value as string) || ''} onChange={e => onChange(e.target.value)} placeholder="Sua resposta" />;
    case 'long_text':
      return <Textarea value={(value as string) || ''} onChange={e => onChange(e.target.value)} placeholder="Sua resposta" rows={4} />;
    case 'number':
      return <Input type="number" value={(value as string) || ''} onChange={e => onChange(e.target.value)} placeholder="0" />;
    case 'date':
      return <Input type="date" value={(value as string) || ''} onChange={e => onChange(e.target.value)} />;
    case 'single_select':
      return (
        <RadioGroup value={(value as string) || ''} onValueChange={onChange}>
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <RadioGroupItem value={opt} id={`${field.id}-${i}`} />
              <Label htmlFor={`${field.id}-${i}`} className="text-sm font-normal cursor-pointer">{opt}</Label>
            </div>
          ))}
        </RadioGroup>
      );
    case 'multi_select':
    case 'checkbox': {
      const selected = (value as string[]) || [];
      return (
        <div className="space-y-2">
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <Checkbox
                id={`${field.id}-${i}`}
                checked={selected.includes(opt)}
                onCheckedChange={(checked) => {
                  onChange(checked ? [...selected, opt] : selected.filter(s => s !== opt));
                }}
              />
              <Label htmlFor={`${field.id}-${i}`} className="text-sm font-normal cursor-pointer">{opt}</Label>
            </div>
          ))}
        </div>
      );
    }
    case 'scale': {
      const numVal = typeof value === 'number' ? value : 5;
      return (
        <div className="space-y-2">
          <Slider value={[numVal]} onValueChange={([v]) => onChange(v)} min={1} max={10} step={1} />
          <div className="flex justify-between text-xs" style={{ color: 'var(--form-muted)' }}>
            <span>1</span><span className="font-medium">{numVal}</span><span>10</span>
          </div>
        </div>
      );
    }
    case 'file_upload':
      return (
        <div className="text-sm border-2 border-dashed rounded-lg p-6 text-center" style={{ borderColor: 'var(--form-muted)', color: 'var(--form-muted)' }}>
          Upload de arquivos disponível em breve
        </div>
      );
    default:
      return <Input value={(value as string) || ''} onChange={e => onChange(e.target.value)} />;
  }
}
