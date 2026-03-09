import React, { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, ClipboardList, AlertCircle, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import type { Form, FormField, FormDesignSettings, FieldCondition, FieldConditionGroup } from './types';

export default function PublicFormPage() {
  const { id } = useParams<{ id: string }>();
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [respondentName, setRespondentName] = useState('');
  const [respondentEmail, setRespondentEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [lgpdConsent, setLgpdConsent] = useState(false);
  const [lgpdError, setLgpdError] = useState(false);

  // Detect if param is UUID or slug
  const isUuid = id ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) : false;

  const formQuery = useQuery({
    queryKey: ['public-form', id],
    queryFn: async () => {
      let data: any;
      let error: any;
      if (isUuid) {
        const res = await supabase.from('forms').select('*').eq('status', 'ativo').eq('id', id!).single();
        data = res.data; error = res.error;
      } else {
        // Query by slug using raw filter to avoid deep type instantiation
        const res = await supabase.from('forms').select('*').eq('status', 'ativo').filter('public_slug', 'eq', id!).single();
        data = res.data; error = res.error;
      }
      if (error) throw error;
      return data as unknown as Form;
    },
    enabled: !!id,
  });

  const formId = formQuery.data?.id;

  const fieldsQuery = useQuery({
    queryKey: ['public-form-fields', formId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('form_fields')
        .select('*')
        .eq('form_id', formId!)
        .order('sort_order');
      if (error) throw error;
      return (data || []) as unknown as FormField[];
    },
    enabled: !!formId,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      // Insert the response
      const { data: responseData, error } = await supabase.from('form_responses').insert({
        form_id: formId!,
        respondent_name: respondentName || null,
        respondent_email: respondentEmail || null,
        answers: { ...answers, _lgpd_consent: true, _lgpd_consent_at: new Date().toISOString() } as any,
      }).select('id').single();
      if (error) throw error;

      // Create in-app notification for form owner
      if (form?.user_id && responseData?.id) {
        await supabase.from('form_notifications').insert({
          form_id: formId!,
          form_response_id: responseData.id,
          recipient_user_id: form.user_id,
          form_title: form.title,
          respondent_name: respondentName || null,
          respondent_email: respondentEmail || null,
        } as any).single();
      }
    },
    onSuccess: () => setSubmitted(true),
    onError: () => toast.error('Erro ao enviar. Tente novamente.'),
  });

  const form = formQuery.data;
  const fields = fieldsQuery.data || [];
  const design: FormDesignSettings = (form?.settings || {}) as FormDesignSettings;

  // Evaluate a single condition
  const evalCondition = (cond: FieldCondition): boolean => {
    if (!cond.field_id) return true;
    const answer = answers[cond.field_id];
    const strVal = answer == null ? '' : Array.isArray(answer) ? answer.join(', ') : String(answer);
    switch (cond.operator) {
      case 'equals': return strVal === cond.value;
      case 'not_equals': return strVal !== cond.value;
      case 'contains': return strVal.toLowerCase().includes((cond.value || '').toLowerCase());
      case 'not_empty': return strVal !== '';
      case 'is_empty': return strVal === '';
      default: return true;
    }
  };

  // Evaluate field conditions (supports legacy single + new group format)
  const isFieldVisible = (field: FormField): boolean => {
    const raw = field.settings?.condition;
    if (!raw) return true;
    // Legacy single condition
    if ((raw as any).field_id) return evalCondition(raw as FieldCondition);
    // Group format
    const group = raw as FieldConditionGroup;
    if (!group.conditions || group.conditions.length === 0) return true;
    if (group.logic === 'OR') return group.conditions.some(evalCondition);
    return group.conditions.every(evalCondition);
  };

  const visibleFields = fields.filter(isFieldVisible);

  // Filter out non-input fields for validation (only visible ones)
  const inputFields = visibleFields.filter(f => f.type !== 'section_header' && f.type !== 'info_text');

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
    for (const field of inputFields) {
      if (field.required) {
        const val = answers[field.id];
        if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
          errors[field.id] = 'Campo obrigatório';
        }
      }
    }
    setValidationErrors(errors);

    if (!lgpdConsent) {
      setLgpdError(true);
    }

    return Object.keys(errors).length === 0 && lgpdConsent;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.error('Preencha os campos obrigatórios e aceite os termos de privacidade.');
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

  const successMsg = design.successMessage || 'Obrigado por preencher o formulário. Suas informações foram registradas com segurança.';

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ ...brandStyles, background: 'var(--form-bg)', color: 'var(--form-text)' }}>
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <div className="max-w-md w-full rounded-xl p-8 text-center space-y-4 shadow-lg" style={{ background: 'var(--form-card-bg)' }}>
            <CheckCircle2 className="w-16 h-16 mx-auto" style={{ color: 'var(--form-primary)' }} />
            <h2 className="text-2xl font-bold">Resposta enviada!</h2>
            <p style={{ color: 'var(--form-muted)' }}>{successMsg}</p>
            <button
              onClick={() => { setSubmitted(false); setAnswers({}); setRespondentName(''); setRespondentEmail(''); setLgpdConsent(false); }}
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
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`mx-auto space-y-4 ${isFullWidth ? 'max-w-4xl' : 'max-w-2xl'}`}>

        {/* Cover image */}
        {design.coverImageUrl && (
          <div className="rounded-xl overflow-hidden shadow-md">
            <img src={design.coverImageUrl} alt="" className="w-full h-48 object-cover" />
          </div>
        )}

        {/* Form Header Card */}
        <div className="rounded-xl p-6 shadow-md" style={{ background: 'var(--form-card-bg)', borderTop: `4px solid var(--form-primary)` }}>
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
          {visibleFields.map((field, i) => (
            <motion.div key={field.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
              {field.type === 'section_header' ? (
                <div
                  className="rounded-xl overflow-hidden shadow-sm"
                  style={{ background: 'var(--form-primary)' }}
                >
                  <div className="px-5 py-3">
                    <h2 className="text-lg font-bold text-white">{field.label}</h2>
                  </div>
                </div>
              ) : field.type === 'info_text' ? (
                <div
                  className="rounded-xl p-5 shadow-sm"
                  style={{ background: 'var(--form-card-bg)' }}
                >
                  {field.label && <h3 className="font-semibold mb-2">{field.label}</h3>}
                  {field.description && (
                    <div className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--form-text)' }}>
                      {renderFormattedText(field.description)}
                    </div>
                  )}
                </div>
              ) : (
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
              )}
            </motion.div>
          ))}

          {/* LGPD Consent */}
          <div
            className="rounded-xl p-5 shadow-sm space-y-3"
            style={{
              background: 'var(--form-card-bg)',
              ...(lgpdError && !lgpdConsent ? { boxShadow: '0 0 0 2px #ef4444' } : {}),
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-5 h-5" style={{ color: 'var(--form-primary)' }} />
              <h3 className="font-semibold text-sm">Proteção de Dados (LGPD)</h3>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--form-muted)' }}>
              De acordo com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), informamos que os dados coletados
              neste formulário serão utilizados exclusivamente para os fins descritos neste formulário.
              Seus dados serão tratados com sigilo e segurança, não sendo compartilhados com terceiros sem seu
              consentimento, exceto quando exigido por lei. Você pode solicitar a exclusão dos seus dados a qualquer
              momento entrando em contato com a organização responsável.
            </p>
            <div className="flex items-start gap-2 pt-2">
              <Checkbox
                id="lgpd-consent"
                checked={lgpdConsent}
                onCheckedChange={(checked) => {
                  setLgpdConsent(!!checked);
                  if (checked) setLgpdError(false);
                }}
              />
              <Label htmlFor="lgpd-consent" className="text-sm font-normal cursor-pointer leading-snug">
                Li e concordo com os termos de proteção de dados e autorizo o uso das informações fornecidas para os fins descritos.
                <span className="ml-1" style={{ color: '#ef4444' }}>*</span>
              </Label>
            </div>
            {lgpdError && !lgpdConsent && (
              <p className="text-xs" style={{ color: '#ef4444' }}>Você precisa aceitar os termos para enviar o formulário.</p>
            )}
          </div>

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

/** Simple markdown-like bold text renderer for info_text descriptions */
function renderFormattedText(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
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
      if (options.length === 0) {
        // Single checkbox without options (boolean)
        return (
          <div className="flex items-center gap-2">
            <Checkbox
              id={field.id}
              checked={!!value}
              onCheckedChange={(checked) => onChange(!!checked)}
            />
            <Label htmlFor={field.id} className="text-sm font-normal cursor-pointer">{field.label}</Label>
          </div>
        );
      }
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
      const min = (field.settings?.min as number) || 1;
      const max = (field.settings?.max as number) || 10;
      return (
        <div className="space-y-2">
          <Slider value={[numVal]} onValueChange={([v]) => onChange(v)} min={min} max={max} step={1} />
          <div className="flex justify-between text-xs" style={{ color: 'var(--form-muted)' }}>
            <span>{min}</span><span className="font-medium">{numVal}</span><span>{max}</span>
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
