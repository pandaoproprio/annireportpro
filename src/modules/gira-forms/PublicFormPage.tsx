import React, { useState, useMemo, useCallback, useRef } from 'react';
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
import {
  CheckCircle2, ClipboardList, AlertCircle, ShieldCheck, MapPin, Loader2,
  Sparkles, User, Mail, ChevronRight, ChevronLeft, Send, Eye, ArrowUp
} from 'lucide-react';
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

// ─── Address keyword matching for CEP auto-fill ─────────────
const ADDRESS_KEYWORDS: Record<string, RegExp> = {
  street: /rua|logradouro|endere[çc]o/i,
  neighborhood: /bairro/i,
  city: /cidade|munic[ií]pio/i,
  state: /estado|uf/i,
};

function findAddressFieldIds(fields: FormField[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const f of fields) {
    if (f.type === 'section_header' || f.type === 'info_text') continue;
    const label = f.label.toLowerCase();
    for (const [key, regex] of Object.entries(ADDRESS_KEYWORDS)) {
      if (!map[key] && regex.test(label)) {
        map[key] = f.id;
      }
    }
  }
  return map;
}

// ─── Step interface ─────────────────────────────────────────
interface Step {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  fields: FormField[];
  type: 'identification' | 'section' | 'lgpd_review';
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
  const [currentStep, setCurrentStep] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

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

  // Address field mapping for CEP auto-fill
  const addressFieldIds = useMemo(() => findAddressFieldIds(visibleFields), [visibleFields]);

  // ─── Build multi-step structure ───────────────────────────
  const steps = useMemo<Step[]>(() => {
    const result: Step[] = [];

    // Step 0: Identification
    result.push({
      title: 'Identificação',
      description: 'Seus dados pessoais',
      icon: <User className="w-4 h-4" />,
      fields: [],
      type: 'identification',
    });

    // Group fields by section_header
    let currentFields: FormField[] = [];
    let currentTitle = 'Informações';

    for (const field of visibleFields) {
      if (field.type === 'section_header') {
        if (currentFields.length > 0) {
          result.push({
            title: currentTitle,
            fields: currentFields,
            type: 'section',
          });
        }
        currentTitle = field.label;
        currentFields = [];
      } else {
        currentFields.push(field);
      }
    }

    // Push remaining fields
    if (currentFields.length > 0) {
      result.push({
        title: currentTitle,
        fields: currentFields,
        type: 'section',
      });
    }

    // Final step: LGPD + Review
    result.push({
      title: 'Revisão e Envio',
      description: 'Confira suas respostas antes de enviar',
      icon: <Eye className="w-4 h-4" />,
      fields: [],
      type: 'lgpd_review',
    });

    return result;
  }, [visibleFields]);

  const totalSteps = steps.length;

  // ─── Progress ─────────────────────────────────────────────
  const progress = useMemo(() => {
    return Math.round(((currentStep + 1) / totalSteps) * 100);
  }, [currentStep, totalSteps]);

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

  // ─── Validation per step ──────────────────────────────────
  const validateStep = (stepIndex: number): boolean => {
    const step = steps[stepIndex];
    if (!step) return true;

    if (step.type === 'identification') {
      let valid = true;
      if (!respondentName.trim()) { setNameError('Nome é obrigatório'); valid = false; } else setNameError('');
      if (!respondentEmail.trim()) { setEmailError('E-mail é obrigatório'); valid = false; }
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(respondentEmail.trim())) { setEmailError('E-mail inválido'); valid = false; }
      else setEmailError('');
      return valid;
    }

    if (step.type === 'lgpd_review') {
      if (!lgpdConsent) { setLgpdError(true); return false; }
      return true;
    }

    // Validate section fields
    const errors: Record<string, string> = {};
    const inputFieldsInStep = step.fields.filter(f => f.type !== 'info_text');
    for (const field of inputFieldsInStep) {
      if (field.required) {
        const val = answers[field.id];
        if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
          errors[field.id] = 'Campo obrigatório';
        }
      }
      if (field.type === 'email' && answers[field.id]) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(answers[field.id]))) errors[field.id] = 'E-mail inválido';
      }
      if (field.type === 'cpf_cnpj' && answers[field.id]) {
        const digits = String(answers[field.id]).replace(/\D/g, '');
        if (digits.length !== 11 && digits.length !== 14) errors[field.id] = 'CPF (11) ou CNPJ (14) dígitos';
      }
      if (field.type === 'phone' && answers[field.id]) {
        if (String(answers[field.id]).replace(/\D/g, '').length < 10) errors[field.id] = 'Telefone inválido';
      }
      if (field.type === 'cep' && answers[field.id]) {
        const cepObj = answers[field.id] as any;
        if ((cepObj?.cep || '').replace(/\D/g, '').length !== 8) errors[field.id] = 'CEP deve ter 8 dígitos';
      }
    }
    setValidationErrors(prev => ({ ...prev, ...errors }));
    if (Object.keys(errors).length > 0) {
      toast.error('Preencha os campos obrigatórios desta etapa.');
      return false;
    }
    return true;
  };

  const scrollToTop = () => {
    containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goNext = () => {
    if (!validateStep(currentStep)) return;
    if (currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1);
      scrollToTop();
    }
  };

  const goPrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      scrollToTop();
    }
  };

  const goToStep = (idx: number) => {
    // Allow going back freely, going forward only if current step valid
    if (idx < currentStep) {
      setCurrentStep(idx);
      scrollToTop();
    } else if (idx === currentStep + 1) {
      goNext();
    }
  };

  const handleSubmit = () => {
    if (!validateStep(currentStep)) return;
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

  // CEP auto-fill handler
  const handleCepAutoFill = useCallback((cepData: CepData) => {
    const updates: Record<string, string> = {};
    if (addressFieldIds.street && cepData.street) updates[addressFieldIds.street] = cepData.street;
    if (addressFieldIds.neighborhood && cepData.neighborhood) updates[addressFieldIds.neighborhood] = cepData.neighborhood;
    if (addressFieldIds.city && cepData.city) updates[addressFieldIds.city] = cepData.city;
    if (addressFieldIds.state && cepData.state) updates[addressFieldIds.state] = cepData.state;
    if (Object.keys(updates).length > 0) {
      setAnswers(prev => ({ ...prev, ...updates }));
    }
  }, [addressFieldIds]);

  // ─── Loading ──────────────────────────────────────────────
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
                onClick={() => { setSubmitted(false); setAnswers({}); setRespondentName(''); setRespondentEmail(''); setLgpdConsent(false); setCurrentStep(0); }}
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

  const activeStep = steps[currentStep];
  const isLastStep = currentStep === totalSteps - 1;
  const isFirstStep = currentStep === 0;

  // Get all input fields for review
  const allInputFields = visibleFields.filter(f => f.type !== 'section_header' && f.type !== 'info_text');

  return (
    <div className="min-h-screen py-6 px-4" ref={containerRef} style={{ ...brandStyles, background: 'var(--form-bg)', color: 'var(--form-text)' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`mx-auto space-y-4 ${isFullWidth ? 'max-w-4xl' : 'max-w-2xl'}`}>

        {/* Cover image */}
        {design.coverImageUrl && (
          <div className="rounded-xl overflow-hidden shadow-md">
            <img src={design.coverImageUrl} alt="" className="w-full h-40 object-cover" />
          </div>
        )}

        {/* Form Header Card */}
        <div className="rounded-xl p-5 shadow-md" style={{ background: 'var(--form-card-bg)', borderTop: `4px solid var(--form-primary)` }}>
          {design.headerImageUrl && (
            <img src={design.headerImageUrl} alt="" className="w-full h-20 object-contain mb-3" />
          )}
          <div className="flex items-start gap-3">
            {design.logoUrl && (
              <img src={design.logoUrl} alt="Logo" className="h-10 w-10 object-contain rounded" />
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1" style={{ color: 'var(--form-primary)' }}>
                {!design.logoUrl && <ClipboardList className="w-4 h-4" />}
                <span className="text-[10px] font-medium uppercase tracking-wider">GIRA Forms</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold leading-tight">{form.title}</h1>
              {form.description && <p className="mt-1 text-sm" style={{ color: 'var(--form-muted)' }}>{form.description}</p>}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium flex items-center gap-1" style={{ color: 'var(--form-muted)' }}>
                <Sparkles className="w-3 h-3" />
                Etapa {currentStep + 1} de {totalSteps}
              </span>
              <span className="text-xs font-bold" style={{ color: progress === 100 ? 'var(--form-primary)' : 'var(--form-muted)' }}>
                {progress}%
              </span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: isDark ? '#333' : '#e5e7eb' }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: 'var(--form-primary)' }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            </div>

            {/* Step indicators */}
            <div className="flex gap-1 pt-1">
              {steps.map((step, idx) => (
                <button
                  key={idx}
                  onClick={() => goToStep(idx)}
                  className="flex-1 h-1.5 rounded-full transition-all"
                  title={step.title}
                  style={{
                    background: idx <= currentStep ? 'var(--form-primary)' : isDark ? '#333' : '#e5e7eb',
                    opacity: idx <= currentStep ? 1 : 0.5,
                    cursor: idx <= currentStep ? 'pointer' : 'default',
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Step Title */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <div className="rounded-xl overflow-hidden shadow-sm" style={{ background: 'var(--form-primary)' }}>
              <div className="px-5 py-3 flex items-center justify-between">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white">{activeStep.title}</h2>
                  {activeStep.description && (
                    <p className="text-xs text-white/70 mt-0.5">{activeStep.description}</p>
                  )}
                </div>
                <span className="text-sm text-white/60 font-mono">{currentStep + 1}/{totalSteps}</span>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="space-y-4"
          >
            {/* ─── Identification Step ─────────────────────────────── */}
            {activeStep.type === 'identification' && (
              <div
                className="rounded-xl p-5 shadow-sm space-y-4"
                style={{
                  background: 'var(--form-card-bg)',
                  ...((nameError || emailError) ? { boxShadow: '0 0 0 2px #ef4444' } : {}),
                }}
              >
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Nome completo <span style={{ color: '#ef4444' }}>*</span></Label>
                    <Input
                      value={respondentName}
                      onChange={e => { setRespondentName(e.target.value); if (nameError) setNameError(''); }}
                      placeholder="Seu nome completo"
                      className="mt-1"
                      maxLength={100}
                      autoFocus
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
            )}

            {/* ─── Section Fields Step ─────────────────────────────── */}
            {activeStep.type === 'section' && activeStep.fields.map((field, i) => (
              <motion.div
                key={field.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                {field.type === 'info_text' ? (
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
                    <SmartFieldInput
                      field={field}
                      value={answers[field.id]}
                      onChange={val => updateAnswer(field.id, val)}
                      onCepAutoFill={handleCepAutoFill}
                      isDark={isDark}
                    />
                    {validationErrors[field.id] && (
                      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs" style={{ color: '#ef4444' }}>
                        {validationErrors[field.id]}
                      </motion.p>
                    )}
                  </div>
                )}
              </motion.div>
            ))}

            {/* ─── Review & LGPD Step ─────────────────────────────── */}
            {activeStep.type === 'lgpd_review' && (
              <>
                {/* Review summary */}
                <div className="rounded-xl p-5 shadow-sm space-y-4" style={{ background: 'var(--form-card-bg)' }}>
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Eye className="w-4 h-4" style={{ color: 'var(--form-primary)' }} />
                    Resumo das suas respostas
                  </h3>

                  <div className="space-y-3">
                    {/* Identity */}
                    <div className="rounded-lg p-3" style={{ background: isDark ? '#1e293b' : '#f8fafc' }}>
                      <p className="text-xs font-medium mb-1" style={{ color: 'var(--form-muted)' }}>Identificação</p>
                      <p className="text-sm font-medium">{respondentName || '—'}</p>
                      <p className="text-sm" style={{ color: 'var(--form-muted)' }}>{respondentEmail || '—'}</p>
                    </div>

                    {/* Field answers grouped by section */}
                    {steps.filter(s => s.type === 'section').map((section, sIdx) => {
                      const sectionInputs = section.fields.filter(f => f.type !== 'info_text');
                      if (sectionInputs.length === 0) return null;
                      return (
                        <div key={sIdx} className="rounded-lg p-3" style={{ background: isDark ? '#1e293b' : '#f8fafc' }}>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-medium" style={{ color: 'var(--form-muted)' }}>{section.title}</p>
                            <button
                              type="button"
                              onClick={() => {
                                const idx = steps.findIndex(s => s === section);
                                if (idx >= 0) { setCurrentStep(idx); scrollToTop(); }
                              }}
                              className="text-[10px] font-medium underline"
                              style={{ color: 'var(--form-primary)' }}
                            >
                              Editar
                            </button>
                          </div>
                          {sectionInputs.map(field => {
                            const val = answers[field.id];
                            let displayVal = '—';
                            if (val !== undefined && val !== null && val !== '') {
                              if (typeof val === 'object' && (val as any)?.cep) {
                                displayVal = (val as any).endereco || (val as any).cep;
                              } else if (Array.isArray(val)) {
                                displayVal = val.join(', ') || '—';
                              } else if (typeof val === 'boolean') {
                                displayVal = val ? 'Sim' : 'Não';
                              } else {
                                displayVal = String(val);
                              }
                            }
                            return (
                              <div key={field.id} className="flex justify-between gap-4 py-1 border-b last:border-0" style={{ borderColor: isDark ? '#334155' : '#e2e8f0' }}>
                                <span className="text-xs" style={{ color: 'var(--form-muted)' }}>{field.label}</span>
                                <span className="text-xs font-medium text-right max-w-[60%] break-words">{displayVal}</span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>

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
                    neste formulário serão utilizados exclusivamente para os fins descritos. Seus dados serão tratados com
                    sigilo e segurança, não sendo compartilhados com terceiros sem seu consentimento, exceto quando exigido
                    por lei. Você pode solicitar a exclusão dos seus dados a qualquer momento.
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
                      Li e concordo com os termos de proteção de dados.
                      <span className="ml-1" style={{ color: '#ef4444' }}>*</span>
                    </Label>
                  </div>
                  {lgpdError && !lgpdConsent && (
                    <p className="text-xs" style={{ color: '#ef4444' }}>Você precisa aceitar os termos para enviar.</p>
                  )}
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className="flex gap-3 pt-2 pb-4">
          {!isFirstStep && (
            <motion.button
              type="button"
              onClick={goPrev}
              className="flex-1 py-3 rounded-lg font-semibold text-sm border-2 hover:opacity-80 transition-all flex items-center justify-center gap-2"
              style={{ borderColor: 'var(--form-primary)', color: 'var(--form-primary)', background: 'var(--form-card-bg)' }}
              whileTap={{ scale: 0.98 }}
            >
              <ChevronLeft className="w-4 h-4" /> Anterior
            </motion.button>
          )}

          {isLastStep ? (
            <motion.button
              type="button"
              onClick={handleSubmit}
              disabled={submitMutation.isPending}
              className="flex-1 py-3 rounded-lg text-white font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: 'var(--form-button)' }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
            >
              {submitMutation.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
              ) : (
                <><Send className="w-4 h-4" /> Enviar Resposta</>
              )}
            </motion.button>
          ) : (
            <motion.button
              type="button"
              onClick={goNext}
              className="flex-1 py-3 rounded-lg text-white font-semibold text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2"
              style={{ background: 'var(--form-button)' }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
            >
              Próxima Etapa <ChevronRight className="w-4 h-4" />
            </motion.button>
          )}
        </div>

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
function SmartFieldInput({ field, value, onChange, onCepAutoFill, isDark }: {
  field: FormField;
  value: unknown;
  onChange: (v: unknown) => void;
  onCepAutoFill?: (data: CepData) => void;
  isDark?: boolean;
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
      return <CpfCnpjField value={(value as string) || ''} onChange={onChange} />;
    case 'cep':
      return <CepField value={value as any} onChange={onChange} onAutoFill={onCepAutoFill} isDark={isDark} />;
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

// ─── CPF/CNPJ Field ─────────────────────────────────────────
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
function CepField({ value, onChange, onAutoFill, isDark }: {
  value: any;
  onChange: (v: any) => void;
  onAutoFill?: (data: CepData) => void;
  isDark?: boolean;
}) {
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
        onAutoFill?.(data);
        toast.success('Endereço encontrado automaticamente!');
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
            style={{ background: isDark ? '#1e293b' : '#f0fdf4', border: '1px solid', borderColor: 'var(--form-primary)' }}
          >
            <div className="flex items-center gap-1.5 font-medium text-xs" style={{ color: 'var(--form-primary)' }}>
              <MapPin className="w-3.5 h-3.5" />
              Endereço preenchido automaticamente
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
