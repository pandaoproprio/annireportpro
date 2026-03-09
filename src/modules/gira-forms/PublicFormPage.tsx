import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
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
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, ClipboardList, AlertCircle, ShieldCheck, MapPin, Loader2, Sparkles, User, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { maskPhone, maskCpfCnpj } from '@/lib/masks';
import type { Form, FormField, FormDesignSettings, FieldCondition, FieldConditionGroup } from './types';

// ─── CEP API ────────────────────────────────────────────────
interface CepData {
  cep: string;
  state: string;
  city: string;
  neighborhood: string;
  street: string;
}

async function fetchCepData(cep: string): Promise<CepData> {
  const digits = cep.replace(/\D/g, '');
  if (digits.length !== 8) throw new Error('CEP deve ter 8 dígitos');
  const res = await fetch(`https://brasilapi.com.br/api/cep/v2/${digits}`);
  if (!res.ok) throw new Error('CEP não encontrado');
  return res.json();
}

function maskCep(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

// ─── Main Component ─────────────────────────────────────────
export default function PublicFormPage() {
  const { id } = useParams<{ id: string }>();
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [respondentName, setRespondentName] = useState('');
  const [respondentEmail, setRespondentEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [lgpdConsent, setLgpdConsent] = useState(false);
  const [lgpdError, setLgpdError] = useState(false);
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [currentStep, setCurrentStep] = useState(0); // For sectioned navigation
  const formRef = useRef<HTMLFormElement>(null);

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
      const { data: responseData, error } = await supabase.from('form_responses').insert({
        form_id: formId!,
        respondent_name: respondentName.trim(),
        respondent_email: respondentEmail.trim(),
        answers: { ...answers, _lgpd_consent: true, _lgpd_consent_at: new Date().toISOString() } as any,
      }).select('id').single();
      if (error) throw error;

      if (form?.user_id && responseData?.id) {
        await supabase.from('form_notifications').insert({
          form_id: formId!,
          form_response_id: responseData.id,
          recipient_user_id: form.user_id,
          form_title: form.title,
          respondent_name: respondentName.trim(),
          respondent_email: respondentEmail.trim(),
        } as any).single();
      }
    },
    onSuccess: () => setSubmitted(true),
    onError: () => toast.error('Erro ao enviar. Tente novamente.'),
  });

  const form = formQuery.data;
  const fields = fieldsQuery.data || [];
  const design: FormDesignSettings = (form?.settings || {}) as FormDesignSettings;

  // Evaluate conditions
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

  const isFieldVisible = (field: FormField): boolean => {
    const raw = field.settings?.condition;
    if (!raw) return true;
    if ((raw as any).field_id) return evalCondition(raw as FieldCondition);
    const group = raw as FieldConditionGroup;
    if (!group.conditions || group.conditions.length === 0) return true;
    if (group.logic === 'OR') return group.conditions.some(evalCondition);
    return group.conditions.every(evalCondition);
  };

  const visibleFields = fields.filter(isFieldVisible);
  const inputFields = visibleFields.filter(f => f.type !== 'section_header' && f.type !== 'info_text');

  // ─── Progress calculation ─────────────────────────────────
  const progress = useMemo(() => {
    if (inputFields.length === 0) return 0;
    let filled = 0;
    // Count name + email as 2 items
    const total = inputFields.length + 2;
    if (respondentName.trim()) filled++;
    if (respondentEmail.trim()) filled++;
    for (const field of inputFields) {
      const val = answers[field.id];
      if (val !== undefined && val !== null && val !== '' && !(Array.isArray(val) && val.length === 0)) {
        filled++;
      }
    }
    return Math.round((filled / total) * 100);
  }, [answers, inputFields, respondentName, respondentEmail]);

  // ─── Sections for step navigation ────────────────────────
  const sections = useMemo(() => {
    const result: { header?: FormField; fields: FormField[] }[] = [];
    let current: { header?: FormField; fields: FormField[] } = { fields: [] };
    for (const field of visibleFields) {
      if (field.type === 'section_header') {
        if (current.fields.length > 0 || current.header) {
          result.push(current);
        }
        current = { header: field, fields: [] };
      } else {
        current.fields.push(field);
      }
    }
    if (current.fields.length > 0 || current.header) {
      result.push(current);
    }
    return result;
  }, [visibleFields]);

  const hasSections = sections.length > 1;

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
    let hasNameErr = false;
    let hasEmailErr = false;

    // Name is required
    if (!respondentName.trim()) {
      setNameError('Nome é obrigatório');
      hasNameErr = true;
    } else {
      setNameError('');
    }

    // Email is required and must be valid
    if (!respondentEmail.trim()) {
      setEmailError('E-mail é obrigatório');
      hasEmailErr = true;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(respondentEmail.trim())) {
      setEmailError('E-mail inválido');
      hasEmailErr = true;
    } else {
      setEmailError('');
    }

    for (const field of inputFields) {
      if (field.required) {
        const val = answers[field.id];
        if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
          errors[field.id] = 'Campo obrigatório';
        }
      }
      // Smart validations
      if (field.type === 'email' && answers[field.id]) {
        const email = String(answers[field.id]);
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          errors[field.id] = 'E-mail inválido';
        }
      }
      if (field.type === 'cpf_cnpj' && answers[field.id]) {
        const digits = String(answers[field.id]).replace(/\D/g, '');
        if (digits.length !== 11 && digits.length !== 14) {
          errors[field.id] = 'CPF deve ter 11 dígitos ou CNPJ 14 dígitos';
        }
      }
      if (field.type === 'phone' && answers[field.id]) {
        const digits = String(answers[field.id]).replace(/\D/g, '');
        if (digits.length < 10) {
          errors[field.id] = 'Telefone inválido';
        }
      }
      if (field.type === 'cep' && answers[field.id]) {
        const cepObj = answers[field.id] as any;
        const cepDigits = (cepObj?.cep || '').replace(/\D/g, '');
        if (cepDigits.length !== 8) {
          errors[field.id] = 'CEP deve ter 8 dígitos';
        }
      }
    }
    setValidationErrors(errors);

    if (!lgpdConsent) setLgpdError(true);

    return Object.keys(errors).length === 0 && lgpdConsent && !hasNameErr && !hasEmailErr;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }
    submitMutation.mutate();
  };

  const updateAnswer = useCallback((fieldId: string, value: unknown) => {
    setAnswers(prev => ({ ...prev, [fieldId]: value }));
    setValidationErrors(prev => {
      if (prev[fieldId]) {
        const n = { ...prev };
        delete n[fieldId];
        return n;
      }
      return prev;
    });
  }, []);

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
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }}>
              <CheckCircle2 className="w-16 h-16 mx-auto" style={{ color: 'var(--form-primary)' }} />
            </motion.div>
            <h2 className="text-2xl font-bold">Resposta enviada!</h2>
            <p style={{ color: 'var(--form-muted)' }}>{successMsg}</p>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
              <button
                onClick={() => { setSubmitted(false); setAnswers({}); setRespondentName(''); setRespondentEmail(''); setLgpdConsent(false); }}
                className="px-4 py-2 rounded-lg border text-sm font-medium hover:opacity-80 transition-opacity"
                style={{ borderColor: 'var(--form-primary)', color: 'var(--form-primary)' }}
              >
                Enviar outra resposta
              </button>
            </motion.div>
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

          {/* Progress Bar */}
          <div className="mt-4 space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium flex items-center gap-1" style={{ color: 'var(--form-muted)' }}>
                <Sparkles className="w-3 h-3" /> Progresso
              </span>
              <span className="text-xs font-bold" style={{ color: progress === 100 ? 'var(--form-primary)' : 'var(--form-muted)' }}>
                {progress}%
              </span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: isDark ? '#333' : '#e5e7eb' }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: 'var(--form-primary)' }}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            </div>
          </div>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          {/* Respondent info - REQUIRED */}
          <div
            className="rounded-xl p-5 shadow-sm space-y-4"
            style={{
              background: 'var(--form-card-bg)',
              ...((nameError || emailError) ? { boxShadow: '0 0 0 2px #ef4444' } : {}),
            }}
          >
            <h3 className="font-medium text-sm flex items-center gap-2">
              <User className="w-4 h-4" style={{ color: 'var(--form-primary)' }} />
              Identificação <span style={{ color: '#ef4444' }}>*</span>
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Nome <span style={{ color: '#ef4444' }}>*</span></Label>
                <Input
                  value={respondentName}
                  onChange={e => { setRespondentName(e.target.value); if (nameError) setNameError(''); }}
                  placeholder="Seu nome completo"
                  className="mt-1"
                  maxLength={100}
                  style={nameError ? { boxShadow: '0 0 0 1px #ef4444' } : {}}
                />
                {nameError && <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{nameError}</p>}
              </div>
              <div>
                <Label className="text-sm font-medium flex items-center gap-1">
                  <Mail className="w-3 h-3" /> E-mail <span style={{ color: '#ef4444' }}>*</span>
                </Label>
                <Input
                  type="email"
                  value={respondentEmail}
                  onChange={e => { setRespondentEmail(e.target.value); if (emailError) setEmailError(''); }}
                  placeholder="seu@email.com"
                  className="mt-1"
                  maxLength={255}
                  style={emailError ? { boxShadow: '0 0 0 1px #ef4444' } : {}}
                />
                {emailError && <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{emailError}</p>}
              </div>
            </div>
          </div>

          {/* Fields */}
          <AnimatePresence mode="popLayout">
            {visibleFields.map((field, i) => (
              <motion.div
                key={field.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: i * 0.02 }}
                layout
              >
                {field.type === 'section_header' ? (
                  <div className="rounded-xl overflow-hidden shadow-sm" style={{ background: 'var(--form-primary)' }}>
                    <div className="px-5 py-3">
                      <h2 className="text-lg font-bold text-white">{field.label}</h2>
                    </div>
                  </div>
                ) : field.type === 'info_text' ? (
                  <div className="rounded-xl p-5 shadow-sm" style={{ background: 'var(--form-card-bg)' }}>
                    {field.label && <h3 className="font-semibold mb-2">{field.label}</h3>}
                    {field.description && (
                      <div className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--form-text)' }}>
                        {renderFormattedText(field.description)}
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    className="rounded-xl p-5 shadow-sm space-y-3 transition-all"
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
                    <SmartFieldInput field={field} value={answers[field.id]} onChange={val => updateAnswer(field.id, val)} allAnswers={answers} />
                    {validationErrors[field.id] && (
                      <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-xs" style={{ color: '#ef4444' }}>
                        {validationErrors[field.id]}
                      </motion.p>
                    )}
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

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

          <motion.button
            type="submit"
            disabled={submitMutation.isPending}
            className="w-full py-3 rounded-lg text-white font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-50"
            style={{ background: 'var(--form-button)' }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
          >
            {submitMutation.isPending ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Enviando...
              </span>
            ) : (
              'Enviar Resposta'
            )}
          </motion.button>
        </form>

        <p className="text-center text-xs pb-4" style={{ color: 'var(--form-muted)' }}>
          Powered by <span className="font-semibold">GIRA Forms</span>
        </p>
      </motion.div>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────
function renderFormattedText(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

// ─── Smart Field Input ──────────────────────────────────────
function SmartFieldInput({ field, value, onChange, allAnswers }: {
  field: FormField;
  value: unknown;
  onChange: (v: unknown) => void;
  allAnswers: Record<string, unknown>;
}) {
  const options = field.options || [];

  switch (field.type) {
    case 'short_text':
      return <Input value={(value as string) || ''} onChange={e => onChange(e.target.value)} placeholder="Sua resposta" maxLength={500} />;
    case 'long_text':
      return (
        <div className="relative">
          <Textarea value={(value as string) || ''} onChange={e => onChange(e.target.value)} placeholder="Sua resposta" rows={4} maxLength={5000} />
          <span className="absolute bottom-2 right-2 text-[10px]" style={{ color: 'var(--form-muted)' }}>
            {((value as string) || '').length}/5000
          </span>
        </div>
      );
    case 'number':
      return <Input type="number" value={(value as string) || ''} onChange={e => onChange(e.target.value)} placeholder="0" />;
    case 'date':
      return <Input type="date" value={(value as string) || ''} onChange={e => onChange(e.target.value)} />;
    case 'email':
      return <Input type="email" value={(value as string) || ''} onChange={e => onChange(e.target.value)} placeholder="exemplo@email.com" maxLength={255} />;
    case 'phone':
      return (
        <Input
          value={(value as string) || ''}
          onChange={e => onChange(maskPhone(e.target.value))}
          placeholder="(00) 00000-0000"
          maxLength={15}
        />
      );
    case 'cpf_cnpj':
      return (
        <CpfCnpjField value={(value as string) || ''} onChange={onChange} />
      );
    case 'cep':
      return <CepField value={value as any} onChange={onChange} />;
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
        return (
          <div className="flex items-center gap-2">
            <Checkbox id={field.id} checked={!!value} onCheckedChange={(checked) => onChange(!!checked)} />
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
            <span>{min}</span><span className="font-medium text-sm">{numVal}</span><span>{max}</span>
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

// ─── CPF/CNPJ Field with smart detection ────────────────────
function CpfCnpjField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const digits = value.replace(/\D/g, '');
  const docType = digits.length <= 11 ? 'CPF' : 'CNPJ';
  const isComplete = digits.length === 11 || digits.length === 14;

  return (
    <div className="space-y-1">
      <Input
        value={value}
        onChange={e => onChange(maskCpfCnpj(e.target.value))}
        placeholder="000.000.000-00 ou 00.000.000/0001-00"
        maxLength={18}
      />
      <div className="flex items-center gap-2">
        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{
          background: isComplete ? 'var(--form-primary)' : '#e5e7eb',
          color: isComplete ? '#fff' : '#6b7280',
        }}>
          {docType}
        </span>
        {isComplete && (
          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[10px]" style={{ color: 'var(--form-primary)' }}>
            ✓ Formato válido
          </motion.span>
        )}
      </div>
    </div>
  );
}

// ─── CEP Field with BrasilAPI auto-fill ─────────────────────
function CepField({ value, onChange }: { value: any; onChange: (v: any) => void }) {
  const [cepInput, setCepInput] = useState((value?.cep as string) || '');
  const [loading, setLoading] = useState(false);
  const [cepData, setCepData] = useState<CepData | null>(value?.data || null);
  const [error, setError] = useState('');

  const handleCepChange = async (raw: string) => {
    const masked = maskCep(raw);
    setCepInput(masked);
    setError('');

    const digits = masked.replace(/\D/g, '');
    if (digits.length === 8) {
      setLoading(true);
      try {
        const data = await fetchCepData(digits);
        setCepData(data);
        onChange({ cep: masked, data, endereco: `${data.street}, ${data.neighborhood}, ${data.city} - ${data.state}` });
        toast.success('Endereço encontrado!');
      } catch {
        setError('CEP não encontrado');
        setCepData(null);
        onChange({ cep: masked, data: null, endereco: '' });
      } finally {
        setLoading(false);
      }
    } else {
      setCepData(null);
      onChange({ cep: masked, data: null, endereco: '' });
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Input
          value={cepInput}
          onChange={e => handleCepChange(e.target.value)}
          placeholder="00000-000"
          maxLength={9}
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--form-primary)' }} />
          </div>
        )}
      </div>
      {error && <p className="text-xs" style={{ color: '#ef4444' }}>{error}</p>}

      <AnimatePresence>
        {cepData && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-lg p-3 space-y-1 text-sm"
            style={{ background: isDarkMode() ? '#1e293b' : '#f0fdf4', border: '1px solid', borderColor: 'var(--form-primary)' }}
          >
            <div className="flex items-center gap-1.5 font-medium text-xs" style={{ color: 'var(--form-primary)' }}>
              <MapPin className="w-3.5 h-3.5" />
              Endereço encontrado automaticamente
            </div>
            {cepData.street && <p className="text-xs">{cepData.street}</p>}
            <p className="text-xs">{cepData.neighborhood}</p>
            <p className="text-xs font-medium">{cepData.city} - {cepData.state}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function isDarkMode() {
  return document.documentElement.style.getPropertyValue('--form-bg')?.includes('1a') || false;
}
