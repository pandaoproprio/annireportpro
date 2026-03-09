import React, { useState } from 'react';
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
import type { Form, FormField } from './types';

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
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl space-y-4">
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-3">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto" />
            <h2 className="text-xl font-semibold">Formulário indisponível</h2>
            <p className="text-muted-foreground text-sm">Este formulário não existe ou não está mais ativo.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <Card className="max-w-md w-full">
            <CardContent className="p-8 text-center space-y-4">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
              <h2 className="text-2xl font-bold text-foreground">Resposta enviada!</h2>
              <p className="text-muted-foreground">Obrigado por preencher o formulário.</p>
              <Button variant="outline" onClick={() => { setSubmitted(false); setAnswers({}); setRespondentName(''); setRespondentEmail(''); }}>
                Enviar outra resposta
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto space-y-6">
        {/* Form Header */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 text-primary mb-2">
              <ClipboardList className="w-5 h-5" />
              <span className="text-xs font-medium uppercase tracking-wider">GIRA Forms</span>
            </div>
            <CardTitle className="text-2xl">{form.title}</CardTitle>
            {form.description && <p className="text-muted-foreground mt-2">{form.description}</p>}
          </CardHeader>
        </Card>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Respondent info */}
          <Card>
            <CardContent className="p-5 space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground">Identificação (opcional)</h3>
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
            </CardContent>
          </Card>

          {/* Fields */}
          {fields.map((field, i) => (
            <motion.div key={field.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Card className={validationErrors[field.id] ? 'ring-2 ring-destructive/50' : ''}>
                <CardContent className="p-5 space-y-3">
                  <div>
                    <Label className="text-sm font-medium">
                      {field.label}
                      {field.required && <span className="text-destructive ml-1">*</span>}
                    </Label>
                    {field.description && <p className="text-xs text-muted-foreground mt-0.5">{field.description}</p>}
                  </div>

                  <FieldInput field={field} value={answers[field.id]} onChange={val => updateAnswer(field.id, val)} />

                  {validationErrors[field.id] && (
                    <p className="text-xs text-destructive">{validationErrors[field.id]}</p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}

          <Button type="submit" size="lg" className="w-full" disabled={submitMutation.isPending}>
            {submitMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...</> : 'Enviar Resposta'}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground pb-4">
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
      const min = 1, max = 10;
      const numVal = typeof value === 'number' ? value : 5;
      return (
        <div className="space-y-2">
          <Slider value={[numVal]} onValueChange={([v]) => onChange(v)} min={min} max={max} step={1} />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{min}</span>
            <span className="font-medium text-foreground">{numVal}</span>
            <span>{max}</span>
          </div>
        </div>
      );
    }

    case 'file_upload':
      return (
        <div className="text-sm text-muted-foreground border-2 border-dashed border-border rounded-lg p-6 text-center">
          Upload de arquivos disponível em breve
        </div>
      );

    default:
      return <Input value={(value as string) || ''} onChange={e => onChange(e.target.value)} />;
  }
}
