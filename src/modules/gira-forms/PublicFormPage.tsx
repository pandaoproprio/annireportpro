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
  Sparkles, ChevronRight, ChevronLeft, Send, Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { maskPhone, maskCpfCnpj, maskCpf, maskCnpj } from '@/lib/masks';
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

// ─── Smart label detection ──────────────────────────────────
function detectSmartType(field: FormField): 'cep' | 'cpf' | 'cnpj' | 'cpf_cnpj' | 'phone' | 'email' | null {
  if (field.type === 'cep' || field.type === 'cpf_cnpj' || field.type === 'phone' || field.type === 'email') {
    return field.type as any;
  }
  if (field.type !== 'short_text') return null;
  const label = field.label.toLowerCase();
  if (/^cep$/i.test(field.label.trim()) || /\bcep\b/.test(label)) return 'cep';
  if (/\bcpf\b.*\bcnpj\b|\bcnpj\b.*\bcpf\b/.test(label)) return 'cpf_cnpj';
  if (/\bcpf\b/.test(label) && !/cnpj/.test(label)) return 'cpf';
  if (/\bcnpj\b/.test(label) && !/cpf/.test(label)) return 'cnpj';
  if (/\bcelular\b|\btelefone\b|\bfone\b|\bwhatsapp\b/.test(label)) return 'phone';
  if (/\be-?mail\b/.test(label) && !/social/.test(label)) return 'email';
  return null;
}

function isAddressField(label: string): boolean {
  return /endere[çc]o|logradouro|rua|munic[ií]pio.*uf|cidade.*estado|bairro/i.test(label);
}

function isNameField(label: string): boolean {
  return /^nome\s*(completo)?$/i.test(label.trim()) || /^nome$/i.test(label.trim());
}

function isEmailField(label: string): boolean {
  return /e-?mail\s*(de\s*contato)?$/i.test(label.trim());
}

// ─── Step interface ─────────────────────────────────────────
interface Step {
  title: string;
  description?: string;
  fields: FormField[];
  type: 'section' | 'lgpd_review';
}

// ─── Main Component ─────────────────────────────────────────
export default function PublicFormPage() {
  const { id } = useParams<{ id: string }>();
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [submitted, setSubmitted] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [lgpdConsent, setLgpdConsent] = useState(false);
  const [lgpdError, setLgpdError] = useState(false);
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

  const form = formQuery.data;
  const fields = fieldsQuery.data || [];
  const design: FormDesignSettings = (form?.settings || {}) as FormDesignSettings;

  // ─── Find the respondent name/email fields ────────────────
  const nameFieldId = useMemo(() => fields.find(f => isNameField(f.label))?.id, [fields]);
  const emailFieldId = useMemo(() => fields.find(f => isEmailField(f.label))?.id, [fields]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const respondentName = nameFieldId ? String(answers[nameFieldId] || '').trim() : '';
      const respondentEmail = emailFieldId ? String(answers[emailFieldId] || '').trim() : '';

      const { data: responseData, error } = await supabase.from('form_responses').insert({
        form_id: formId!,
        respondent_name: respondentName,
        respondent_email: respondentEmail,
        answers: { ...answers, _lgpd_consent: true, _lgpd_consent_at: new Date().toISOString() } as any,
      }).select('id').single();
      if (error) throw error;

      // Non-blocking notification
      if (form?.user_id && responseData?.id) {
        try {
          await supabase.from('form_notifications').insert({
            form_id: formId!,
            form_response_id: responseData.id,
            recipient_user_id: form.user_id,
            form_title: form.title,
            respondent_name: respondentName,
            respondent_email: respondentEmail,
          } as any);
        } catch {
          // Notification is non-critical, don't block submission
        }
      }
    },
    onSuccess: () => setSubmitted(true),
    onError: (err) => {
      console.error('Submit error:', err);
      toast.error('Erro ao enviar. Tente novamente.');
    },
  });

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

  // ─── Reorder: move CEP before address fields in each section ──
  const reorderedFields = useMemo(() => {
    const result: FormField[] = [];
    let buffer: FormField[] = [];

    const flushBuffer = () => {
      if (buffer.length === 0) return;
      // Find CEP and address fields in buffer
      const cepFields: FormField[] = [];
      const addressFields: FormField[] = [];
      const otherFields: FormField[] = [];

      for (const f of buffer) {
        const smart = detectSmartType(f);
        if (smart === 'cep') {
          cepFields.push(f);
        } else if (isAddressField(f.label)) {
          addressFields.push(f);
        } else {
          otherFields.push(f);
        }
      }

      // Put CEP before address fields
      result.push(...otherFields.filter(f => {
        // Put non-address, non-cep fields that come before address fields
        const idx = buffer.indexOf(f);
        const firstAddrIdx = buffer.findIndex(b => isAddressField(b.label));
        const firstCepIdx = buffer.findIndex(b => detectSmartType(b) === 'cep');
        const firstSpecialIdx = Math.min(
          firstAddrIdx >= 0 ? firstAddrIdx : Infinity,
          firstCepIdx >= 0 ? firstCepIdx : Infinity
        );
        return idx < firstSpecialIdx;
      }));
      result.push(...cepFields);
      result.push(...addressFields);
      result.push(...otherFields.filter(f => {
        const idx = buffer.indexOf(f);
        const firstAddrIdx = buffer.findIndex(b => isAddressField(b.label));
        const firstCepIdx = buffer.findIndex(b => detectSmartType(b) === 'cep');
        const firstSpecialIdx = Math.min(
          firstAddrIdx >= 0 ? firstAddrIdx : Infinity,
          firstCepIdx >= 0 ? firstCepIdx : Infinity
        );
        return idx >= firstSpecialIdx;
      }));

      buffer = [];
    };

    for (const f of visibleFields) {
      if (f.type === 'section_header') {
        flushBuffer();
        result.push(f);
      } else {
        buffer.push(f);
      }
    }
    flushBuffer();
    return result;
  }, [visibleFields]);

  // ─── Build multi-step structure ───────────────────────────
  const steps = useMemo<Step[]>(() => {
    const result: Step[] = [];
    let currentFields: FormField[] = [];
    let currentTitle = 'Informações';

    for (const field of reorderedFields) {
      if (field.type === 'section_header') {
        if (currentFields.length > 0) {
          result.push({ title: currentTitle, fields: currentFields, type: 'section' });
        }
        currentTitle = field.label;
        currentFields = [];
      } else {
        currentFields.push(field);
      }
    }

    if (currentFields.length > 0) {
      result.push({ title: currentTitle, fields: currentFields, type: 'section' });
    }

    // Final step: LGPD + Review
    result.push({
      title: 'Revisão e Envio',
      description: 'Confira suas respostas antes de enviar',
      fields: [],
      type: 'lgpd_review',
    });

    return result;
  }, [reorderedFields]);

  const totalSteps = steps.length;
  const progress = useMemo(() => Math.round(((currentStep + 1) / totalSteps) * 100), [currentStep, totalSteps]);

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

  // ─── CEP auto-fill: fill address/city/state fields ────────
  const handleCepAutoFill = useCallback((cepData: CepData, cepFieldId: string) => {
    const updates: Record<string, string> = {};
    for (const f of reorderedFields) {
      if (f.id === cepFieldId) continue;
      const label = f.label.toLowerCase();
      if (/endere[çc]o.*completo|rua.*n[°ºo].*bairro/i.test(f.label)) {
        // Full address field
        const parts = [cepData.street, cepData.neighborhood].filter(Boolean);
        if (parts.length > 0) updates[f.id] = parts.join(', ');
      } else if (/munic[ií]pio.*uf|cidade.*estado/i.test(f.label)) {
        updates[f.id] = `${cepData.city} / ${cepData.state}`;
      } else if (/\brua\b|\blogradouro\b/.test(label) && !/completo/.test(label)) {
        if (cepData.street) updates[f.id] = cepData.street;
      } else if (/\bbairro\b/.test(label)) {
        if (cepData.neighborhood) updates[f.id] = cepData.neighborhood;
      } else if (/\bcidade\b|\bmunic[ií]pio\b/.test(label) && !/uf|estado/.test(label)) {
        if (cepData.city) updates[f.id] = cepData.city;
      } else if (/\bestado\b|\buf\b/.test(label)) {
        if (cepData.state) updates[f.id] = cepData.state;
      }
    }
    if (Object.keys(updates).length > 0) {
      setAnswers(prev => ({ ...prev, ...updates }));
    }
  }, [reorderedFields]);

  // ─── Validation per step ──────────────────────────────────
  const validateStep = (stepIndex: number): boolean => {
    const step = steps[stepIndex];
    if (!step) return true;

    if (step.type === 'lgpd_review') {
      if (!lgpdConsent) { setLgpdError(true); return false; }
      return true;
    }

    const errors: Record<string, string> = {};
    const inputFields = step.fields.filter(f => f.type !== 'info_text' && f.type !== 'section_header');

    for (const field of inputFields) {
      const smart = detectSmartType(field);
      const val = answers[field.id];

      if (field.required) {
        if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
          errors[field.id] = 'Campo obrigatório';
          continue;
        }
      }

      if (!val) continue;

      if (smart === 'email' || field.type === 'email') {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(val))) errors[field.id] = 'E-mail inválido';
      }
      if (smart === 'cpf_cnpj' || field.type === 'cpf_cnpj') {
        const digits = String(val).replace(/\D/g, '');
        if (digits.length !== 11 && digits.length !== 14) errors[field.id] = 'CPF (11) ou CNPJ (14) dígitos';
      }
      if (smart === 'phone') {
        if (String(val).replace(/\D/g, '').length < 10) errors[field.id] = 'Telefone inválido';
      }
    }

    setValidationErrors(prev => {
      const cleaned = { ...prev };
      // Clear errors for fields in this step
      for (const field of inputFields) {
        if (!errors[field.id]) delete cleaned[field.id];
      }
      return { ...cleaned, ...errors };
    });

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
                onClick={() => { setSubmitted(false); setAnswers({}); setLgpdConsent(false); setCurrentStep(0); }}
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
                      onCepAutoFill={(data) => handleCepAutoFill(data, field.id)}
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
                <div className="rounded-xl p-5 shadow-sm space-y-4" style={{ background: 'var(--form-card-bg)' }}>
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Eye className="w-4 h-4" style={{ color: 'var(--form-primary)' }} />
                    Resumo das suas respostas
                  </h3>

                  <div className="space-y-3">
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
                              if (Array.isArray(val)) {
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
  const smartType = detectSmartType(field);

  // Render by smart type first (overrides stored type for short_text fields)
  if (smartType === 'cep') {
    return <CepField value={(value as string) || ''} onChange={onChange} onAutoFill={onCepAutoFill} isDark={isDark} />;
  }
  if (smartType === 'cpf_cnpj') {
    return <CpfCnpjField value={(value as string) || ''} onChange={onChange} />;
  }
  if (smartType === 'phone') {
    return (
      <Input
        value={(value as string) || ''}
        onChange={e => onChange(maskPhone(e.target.value))}
        placeholder="(00) 00000-0000"
        maxLength={15}
      />
    );
  }
  if (smartType === 'email') {
    return <Input type="email" value={(value as string) || ''} onChange={e => onChange(e.target.value)} placeholder="exemplo@email.com" maxLength={255} />;
  }

  // Standard field types
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
      return <CepField value={(value as string) || ''} onChange={onChange} onAutoFill={onCepAutoFill} isDark={isDark} />;
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
  value: string;
  onChange: (v: unknown) => void;
  onAutoFill?: (data: CepData) => void;
  isDark?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [cepData, setCepData] = useState<CepData | null>(null);
  const [error, setError] = useState('');

  const handleCepChange = async (raw: string) => {
    const masked = maskCep(raw);
    onChange(masked);
    setError('');

    const digits = masked.replace(/\D/g, '');
    if (digits.length === 8) {
      setLoading(true);
      try {
        const data = await fetchCepData(digits);
        setCepData(data);
        onAutoFill?.(data);
        toast.success('Endereço encontrado! Campos preenchidos automaticamente.');
      } catch {
        setError('CEP não encontrado');
        setCepData(null);
      } finally {
        setLoading(false);
      }
    } else {
      setCepData(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Input
          value={(value as string) || ''}
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
              Endereço encontrado
            </div>
            {cepData.street && <p className="text-xs">{cepData.street}</p>}
            {cepData.neighborhood && <p className="text-xs">{cepData.neighborhood}</p>}
            <p className="text-xs font-medium">{cepData.city} - {cepData.state}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
