import React, { useState, useMemo, useCallback, useRef } from 'react';
import { AudioRecorderButton } from '@/components/AudioRecorderButton';
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
import { PreCheckinButton } from '@/modules/gira-eventos/components/PreCheckinButton';
import { EventLocationLinks } from '@/modules/gira-eventos/components/EventLocationLinks';

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
function isBirthDateField(label: string): boolean {
  return /nascimento|birth/i.test(label);
}

function calculateAge(dateStr: string): number {
  const birth = new Date(dateStr);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

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
  const [registrationResult, setRegistrationResult] = useState<{ registration_number: number; qr_token: string; event_title: string; event_date: string; event_location: string } | null>(null);
  const [standaloneRegNumber, setStandaloneRegNumber] = useState<number | null>(null);
  const [checkinResult, setCheckinResult] = useState<{ checkin_code: string; qr_token: string } | null>(null);
  const [submittedInfo, setSubmittedInfo] = useState<{ responseId: string; name: string; identifier: string } | null>(null);
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
        const res = await supabase.from('forms').select('*').eq('id', id!).single();
        data = res.data; error = res.error;
      } else {
        const res = await supabase.from('forms').select('*').filter('public_slug', 'eq', id!).single();
        data = res.data; error = res.error;
      }
      if (error) throw error;
      const form = data as unknown as Form;
      // Auto-close: if closes_at is in the past and still active, treat as encerrado
      if (form.closes_at && new Date(form.closes_at) <= new Date() && form.status === 'ativo') {
        form.status = 'encerrado';
      }
      return form;
    },
    enabled: !!id,
  });

  const formId = formQuery.data?.id;

  // ─── Linked Event query ───────────────────────────────────
  const linkedEventQuery = useQuery({
    queryKey: ['linked-event-for-form', formId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('id, title, event_date, location, max_participants, status, linked_form_id')
        .eq('linked_form_id', formId!)
        .eq('status', 'ativo')
        .single();
      if (error) return null;
      return data as { id: string; title: string; event_date: string; location: string; max_participants: number | null; status: string };
    },
    enabled: !!formId,
  });

  const linkedEvent = linkedEventQuery.data;

  // ─── Registration count for linked event ──────────────────
  const regCountQuery = useQuery({
    queryKey: ['event-reg-count', linkedEvent?.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('event_registrations')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', linkedEvent!.id);
      if (error) return 0;
      return count || 0;
    },
    enabled: !!linkedEvent?.id,
  });

  const registrationCount = regCountQuery.data ?? 0;
  const maxParticipants = linkedEvent?.max_participants ?? null;
  const spotsRemaining = maxParticipants ? maxParticipants - registrationCount : null;

  // ─── Standalone response count (for forms without linked event) ──
  const formResponseCountQuery = useQuery({
    queryKey: ['form-response-count', formId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('form_responses')
        .select('*', { count: 'exact', head: true })
        .eq('form_id', formId!);
      if (error) return 0;
      return count || 0;
    },
    enabled: !!formId && !linkedEvent,
  });

  const formResponseCount = formResponseCountQuery.data ?? 0;

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

  // ─── Standalone vacancy & registration number logic ───────
  const standaloneMaxResponses = design.maxResponses ?? null;
  const standaloneSpotsRemaining = standaloneMaxResponses ? standaloneMaxResponses - formResponseCount : null;
  const showRegNumber = design.showRegistrationNumber ?? false;
  // Unified vacancy: use linked event if available, otherwise standalone
  const effectiveMaxSlots = linkedEvent ? maxParticipants : standaloneMaxResponses;
  const effectiveSpotsRemaining = linkedEvent ? spotsRemaining : standaloneSpotsRemaining;

  // ─── Dynamic OG meta tags for social previews ─────────────
  React.useEffect(() => {
    if (!form) return;
    const ogImage = design.coverImageUrl || design.headerImageUrl || design.logoUrl || '';
    const ogTitle = form.title || 'GIRA Formulários';
    const ogDesc = (form.description || '').slice(0, 160);

    document.title = ogTitle;

    const setMeta = (property: string, content: string) => {
      let el = document.querySelector(`meta[property="${property}"]`) || document.querySelector(`meta[name="${property}"]`);
      if (!el) {
        el = document.createElement('meta');
        if (property.startsWith('og:')) el.setAttribute('property', property);
        else el.setAttribute('name', property);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    setMeta('og:title', ogTitle);
    setMeta('og:description', ogDesc);
    setMeta('og:type', 'website');
    if (ogImage) setMeta('og:image', ogImage);
    setMeta('twitter:title', ogTitle);
    setMeta('twitter:description', ogDesc);
    if (ogImage) {
      setMeta('twitter:image', ogImage);
      setMeta('twitter:card', 'summary_large_image');
    }
    setMeta('description', ogDesc);

    return () => {
      document.title = 'GIRA Relatórios';
    };
  }, [form, design]);

  // ─── Find the respondent name/email fields ────────────────
  const nameFieldId = useMemo(() => fields.find(f => isNameField(f.label))?.id, [fields]);
  const emailFieldId = useMemo(() => fields.find(f => isEmailField(f.label))?.id, [fields]);
  const phoneFieldId = useMemo(() => fields.find(f => /\btelefone\b|\bwhatsapp\b|\bcelular\b/i.test(f.label))?.id, [fields]);
  const cpfFieldId = useMemo(() => fields.find(f => /\bcpf\b/i.test(f.label) && f.type !== 'section_header')?.id, [fields]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const respondentName = nameFieldId ? String(answers[nameFieldId] || '').trim() : '';
      const respondentEmail = emailFieldId ? String(answers[emailFieldId] || '').trim() : '';
      const respondentCpf = cpfFieldId ? String(answers[cpfFieldId] || '').replace(/\D/g, '').trim() : '';

      // ─── Duplicate check ───────────────────────────────────
      if (respondentCpf || respondentEmail || respondentName) {
        const { data: existing } = await supabase
          .from('form_responses')
          .select('id, respondent_name, respondent_email, answers')
          .eq('form_id', formId!);
        if (existing && existing.length > 0) {
          for (const row of existing) {
            const rowCpf = cpfFieldId ? String((row.answers as any)?.[cpfFieldId] || '').replace(/\D/g, '') : '';
            if (respondentCpf && rowCpf && respondentCpf === rowCpf) {
              throw new Error('DUPLICATE:Já existe uma inscrição com este CPF. Cada participante pode se inscrever apenas uma vez.');
            }
            if (respondentEmail && row.respondent_email && respondentEmail.toLowerCase() === row.respondent_email.toLowerCase()) {
              throw new Error('DUPLICATE:Já existe uma inscrição com este e-mail. Cada participante pode se inscrever apenas uma vez.');
            }
            if (respondentName && row.respondent_name && respondentName.toLowerCase() === row.respondent_name.toLowerCase()) {
              throw new Error('DUPLICATE:Já existe uma inscrição com este nome. Se não é duplicada, entre em contato com a organização.');
            }
          }
        }
      }

      // Generate a client-side ID so we can reference it for notifications
      const responseId = crypto.randomUUID();

      // Clean up __other__: prefix from answers before saving
      const cleanedAnswers: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(answers)) {
        if (typeof val === 'string' && val.startsWith('__other__:')) {
          cleanedAnswers[key] = val.replace('__other__:', '') || 'Outro';
        } else if (Array.isArray(val)) {
          cleanedAnswers[key] = val.map(v =>
            typeof v === 'string' && v.startsWith('__other__:')
              ? (v.replace('__other__:', '') || 'Outro')
              : v
          );
        } else {
          cleanedAnswers[key] = val;
        }
      }

      // Generate checkin_code and qr_token client-side to avoid needing SELECT after insert
      const genCheckinCode = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
        return code;
      };
      const checkinCode = genCheckinCode();
      const qrTokenVal = crypto.randomUUID();

      let emailRegistrationNumber: number | null = null;

      const { error } = await supabase.from('form_responses').insert({
        id: responseId,
        form_id: formId!,
        respondent_name: respondentName,
        respondent_email: respondentEmail,
        checkin_code: checkinCode,
        qr_token: qrTokenVal,
        answers: { ...cleanedAnswers, _lgpd_consent: true, _lgpd_consent_at: new Date().toISOString() } as any,
      } as any);
      if (error) throw error;

      // Track submitted info for pre-checkin offer on success screen
      setSubmittedInfo({
        responseId,
        name: respondentName || 'Participante',
        identifier: (respondentCpf || respondentEmail || respondentName || responseId).toLowerCase(),
      });

      // ─── Auto-register in linked event ──────────────────────
      if (linkedEvent?.id) {
        const regId = crypto.randomUUID();
        const qrToken = crypto.randomUUID();
        const phone = phoneFieldId ? String(answers[phoneFieldId] || '').trim() : '';
        const doc = cpfFieldId ? String(answers[cpfFieldId] || '').trim() : '';

        const { data: insertedRegistration, error: regError } = await supabase
          .from('event_registrations')
          .insert({
            id: regId,
            event_id: linkedEvent.id,
            name: respondentName || 'Participante',
            email: respondentEmail || null,
            phone: phone || null,
            document: doc || null,
            status: 'confirmado',
            qr_token: qrToken,
          } as any)
          .select('registration_number')
          .single();

        if (!regError && typeof insertedRegistration?.registration_number === 'number') {
          emailRegistrationNumber = insertedRegistration.registration_number;
          setRegistrationResult({
            registration_number: insertedRegistration.registration_number,
            qr_token: qrToken,
            event_title: linkedEvent.title,
            event_date: linkedEvent.event_date,
            event_location: linkedEvent.location,
          });
        }
      } else if (showRegNumber) {
        // Standalone registration number (count-based)
        const nextStandaloneRegNumber = formResponseCount + 1;
        emailRegistrationNumber = nextStandaloneRegNumber;
        setStandaloneRegNumber(nextStandaloneRegNumber);
      } else {
        emailRegistrationNumber = formResponseCount + 1;
      }

      // ─── Set checkin result for success screen ──────────────
      const enableCheckin = design.enableCheckin ?? false;
      if (enableCheckin && checkinCode && qrTokenVal) {
        setCheckinResult({ checkin_code: checkinCode, qr_token: qrTokenVal });

        // Send checkin email (non-blocking)
        if (respondentEmail) {
          try {
            await supabase.functions.invoke('send-form-checkin', {
              body: {
                respondent_name: respondentName,
                respondent_email: respondentEmail,
                form_title: form?.title || '',
                checkin_code: checkinCode,
                qr_token: qrTokenVal,
                form_id: formId,
                registration_number: emailRegistrationNumber,
              },
            });
          } catch {
            // Email is non-critical
          }
        }
      }

      // Non-blocking in-app notification
      if (form?.user_id) {
        try {
          await supabase.from('form_notifications').insert({
            form_id: formId!,
            form_response_id: responseId,
            recipient_user_id: form.user_id,
            form_title: form.title,
            respondent_name: respondentName,
            respondent_email: respondentEmail,
          } as any);
        } catch {
          // Notification is non-critical, don't block submission
        }
      }

      // Per-submission email notification (non-blocking)
      try {
        await supabase.functions.invoke('send-form-submission-notify', {
          body: { formId: formId!, responseId },
        });
      } catch {
        // Non-critical
      }
    },
    onSuccess: () => setSubmitted(true),
    onError: (err) => {
      console.error('Submit error:', err);
      const msg = String(err?.message || err || '');
      if (msg.startsWith('DUPLICATE:')) {
        toast.error(msg.replace('DUPLICATE:', ''), { duration: 6000 });
      } else {
        toast.error(`Erro ao enviar: ${msg}`, { duration: 8000 });
      }
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

    // Merge consecutive small sections (≤ 2 fields each) into one step
    const merged: Step[] = [];
    let idx = 0;
    while (idx < result.length) {
      const step = result[idx];
      if (step.type === 'section' && step.fields.length <= 2) {
        const combinedFields: FormField[] = [...step.fields];
        const titles: string[] = [step.title];
        let j = idx + 1;
        while (j < result.length && result[j].type === 'section' && result[j].fields.length <= 2) {
          combinedFields.push(...result[j].fields);
          titles.push(result[j].title);
          j++;
        }
        if (j > idx + 1) {
          merged.push({ title: titles.join(' · '), fields: combinedFields, type: 'section' });
        } else {
          merged.push(step);
        }
        idx = j;
      } else {
        merged.push(step);
        idx++;
      }
    }

    // Final step: LGPD + Review
    merged.push({
      title: 'Revisão e Envio',
      description: 'Confira suas respostas antes de enviar',
      fields: [],
      type: 'lgpd_review',
    });

    return merged;
  }, [reorderedFields]);

  const totalSteps = steps.length;
  const progress = useMemo(() => Math.round(((currentStep + 1) / totalSteps) * 100), [currentStep, totalSteps]);

  const isSinglePage = design.singlePage ?? false;
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
    // Only validate visible fields (skip fields hidden by conditional logic)
    const inputFields = step.fields.filter(f => f.type !== 'info_text' && f.type !== 'section_header' && isFieldVisible(f));

    for (const field of inputFields) {
      const smart = detectSmartType(field);
      const val = answers[field.id];

      if (field.required) {
        if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
          errors[field.id] = 'Este campo é obrigatório.';
          continue;
        }
      }

      if (!val) continue;

      if (smart === 'email' || field.type === 'email') {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(val))) errors[field.id] = 'Informe um e-mail válido para continuar.';
      }
      if (smart === 'cpf_cnpj' || field.type === 'cpf_cnpj') {
        const digits = String(val).replace(/\D/g, '');
        if (digits.length !== 11 && digits.length !== 14) errors[field.id] = 'CPF (11) ou CNPJ (14) dígitos';
      }
      if (smart === 'cpf') {
        const digits = String(val).replace(/\D/g, '');
        if (digits.length !== 11) errors[field.id] = 'CPF deve ter 11 dígitos';
      }
      if (smart === 'cnpj') {
        const digits = String(val).replace(/\D/g, '');
        if (digits.length !== 14) errors[field.id] = 'CNPJ deve ter 14 dígitos';
      }
      if (field.type === 'date' && isBirthDateField(field.label)) {
        const age = calculateAge(String(val));
        if (age < 18) errors[field.id] = 'Inscrição permitida apenas para maiores de 18 anos.';
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

  if (form.status === 'pausado') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#f5f5f5' }}>
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-3">
            <AlertCircle className="w-12 h-12 mx-auto" style={{ color: '#f59e0b' }} />
            <h2 className="text-xl font-semibold">Formulário pausado</h2>
            <p className="text-sm" style={{ color: '#666' }}>Este formulário está temporariamente indisponível.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (form.status === 'encerrado') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#f5f5f5' }}>
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-3">
            <AlertCircle className="w-12 h-12 mx-auto" style={{ color: '#ef4444' }} />
            <h2 className="text-xl font-semibold">Inscrições encerradas</h2>
            <p className="text-sm" style={{ color: '#666' }}>As inscrições para este formulário já foram encerradas.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (form.status !== 'ativo') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#f5f5f5' }}>
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-3">
            <AlertCircle className="w-12 h-12 mx-auto" style={{ color: '#999' }} />
            <h2 className="text-xl font-semibold">Formulário indisponível</h2>
            <p className="text-sm" style={{ color: '#666' }}>Este formulário não está mais disponível.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Vacancy check: block if full ─────────────────────────
  if (effectiveSpotsRemaining !== null && effectiveSpotsRemaining <= 0) {
    const label = linkedEvent ? linkedEvent.title : form.title;
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#f5f5f5' }}>
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-3">
            <AlertCircle className="w-12 h-12 mx-auto" style={{ color: '#ef4444' }} />
            <h2 className="text-xl font-semibold">Vagas esgotadas</h2>
            <p className="text-sm" style={{ color: '#666' }}>
              Todas as {effectiveMaxSlots} vagas para <strong>{label}</strong> foram preenchidas.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const successMsg = design.successMessage || 'Obrigado por preencher o formulário. Suas informações foram registradas com segurança.';

  if (submitted) {
    const checkinUrl = registrationResult
      ? `${window.location.origin}/checkin/${linkedEvent?.id}?token=${registrationResult.qr_token}`
      : checkinResult
        ? `${window.location.origin}/form-checkin/${formId}?token=${checkinResult.qr_token}`
        : null;
    const qrImageUrl = checkinUrl
      ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(checkinUrl)}&format=png&margin=8`
      : null;

    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ ...brandStyles, background: 'var(--form-bg)', color: 'var(--form-text)' }}>
        <motion.div initial={false} animate={{ scale: 1, opacity: 1 }}>
          <div className="max-w-md w-full rounded-xl p-8 text-center space-y-4 shadow-lg" style={{ background: 'var(--form-card-bg)' }}>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }}>
              <CheckCircle2 className="w-16 h-16 mx-auto" style={{ color: 'var(--form-primary)' }} />
            </motion.div>

            {registrationResult ? (
              <>
                <h2 className="text-2xl font-bold">Inscrição confirmada!</h2>
                <div className="rounded-lg p-4 space-y-2" style={{ background: 'var(--form-bg)', border: '1px solid var(--form-primary)' }}>
                  <p className="text-3xl font-bold" style={{ color: 'var(--form-primary)' }}>
                    Nº {String(registrationResult.registration_number).padStart(3, '0')}
                  </p>
                  <p className="text-xs font-medium" style={{ color: 'var(--form-muted)' }}>Número de inscrição</p>
                </div>
                <p className="text-sm font-medium">{registrationResult.event_title}</p>
                <p className="text-xs" style={{ color: 'var(--form-muted)' }}>
                  📅 {new Date(registrationResult.event_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  {registrationResult.event_location && ` · 📍 ${registrationResult.event_location}`}
                </p>
                {qrImageUrl && (
                  <div className="space-y-2 pt-2">
                    <p className="text-xs font-semibold">Seu QR Code de Check-in</p>
                    <img src={qrImageUrl} alt="QR Code" width={180} height={180} className="mx-auto rounded-lg" style={{ border: '1px solid #e2e8f0' }} />
                    <p className="text-[10px]" style={{ color: 'var(--form-muted)' }}>
                      Apresente este QR Code na entrada do evento. Salve uma captura de tela!
                    </p>
                  </div>
                )}
              </>
            ) : standaloneRegNumber ? (
              <>
                <h2 className="text-2xl font-bold">Inscrição confirmada!</h2>
                <div className="rounded-lg p-4 space-y-2" style={{ background: 'var(--form-bg)', border: '1px solid var(--form-primary)' }}>
                  <p className="text-3xl font-bold" style={{ color: 'var(--form-primary)' }}>
                    Nº {String(standaloneRegNumber).padStart(3, '0')}
                  </p>
                  <p className="text-xs font-medium" style={{ color: 'var(--form-muted)' }}>Número de inscrição</p>
                </div>
                {checkinResult && (
                  <>
                    {qrImageUrl && (
                      <div className="space-y-2 pt-2">
                        <p className="text-xs font-semibold">Seu QR Code de Check-in</p>
                        <img src={qrImageUrl} alt="QR Code" width={180} height={180} className="mx-auto rounded-lg" style={{ border: '1px solid #e2e8f0' }} />
                      </div>
                    )}
                    <div className="rounded-lg p-3 space-y-1" style={{ background: '#fef3c7', border: '1px solid #fcd34d' }}>
                      <p className="text-[10px] font-semibold" style={{ color: '#92400e' }}>Código de Check-in</p>
                      <p className="text-2xl font-bold font-mono tracking-[6px]" style={{ color: '#92400e' }}>
                        {checkinResult.checkin_code}
                      </p>
                      <p className="text-[10px]" style={{ color: '#b45309' }}>
                        Use este código caso não consiga ler o QR Code
                      </p>
                    </div>
                    <p className="text-[10px]" style={{ color: 'var(--form-muted)' }}>
                      📧 Um e-mail com o QR Code e código foi enviado para seu endereço. Salve uma captura de tela!
                    </p>
                  </>
                )}
              </>
            ) : (
              <h2 className="text-2xl font-bold">Resposta enviada!</h2>
            )}

            {/* Always render successMessage so it appears in every flow */}
            <p className="text-sm whitespace-pre-line text-left" style={{ color: 'var(--form-muted)' }}>
              {successMsg}
            </p>

            {form && (design.preCheckinEnabled || (form as any).pre_checkin_enabled) && submittedInfo && (
              <div className="space-y-3 pt-2">
                {((form as any).geofence_lat != null && (form as any).geofence_lng != null) && (
                  <div className="rounded-lg border p-3 text-left" style={{ background: 'var(--form-bg)' }}>
                    <p className="text-xs font-semibold mb-2" style={{ color: 'var(--form-muted)' }}>📍 Como chegar ao local</p>
                    <EventLocationLinks
                      lat={(form as any).geofence_lat}
                      lng={(form as any).geofence_lng}
                      address={(form as any).event_address ?? null}
                    />
                  </div>
                )}
                <PreCheckinButton
                  formId={formId!}
                  responseId={submittedInfo.responseId}
                  userIdentifier={submittedInfo.identifier}
                  fullName={submittedInfo.name}
                />
              </div>
            )}

            <motion.div initial={false} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
              <button
                onClick={() => { setSubmitted(false); setAnswers({}); setLgpdConsent(false); setCurrentStep(0); setRegistrationResult(null); setStandaloneRegNumber(null); setCheckinResult(null); }}
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

  // ─── Validate ALL fields (for single page mode) ───────────
  const validateAllFields = (): boolean => {
    const errors: Record<string, string> = {};
    for (const step of steps) {
      if (step.type !== 'section') continue;
      const inputFields = step.fields.filter(f => f.type !== 'info_text' && f.type !== 'section_header' && isFieldVisible(f));
      for (const field of inputFields) {
        const smart = detectSmartType(field);
        const val = answers[field.id];
        if (field.required) {
          if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
            errors[field.id] = 'Este campo é obrigatório.';
            continue;
          }
        }
        if (!val) continue;

        if (field.type === 'date' && isBirthDateField(field.label)) {
          const age = calculateAge(String(val));
          if (age < 18) {
            errors[field.id] = 'Inscrição permitida apenas para maiores de 18 anos.';
            continue;
          }
        }

        if (smart === 'email' || field.type === 'email') {
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(val))) errors[field.id] = 'Informe um e-mail válido.';
        }
        if (smart === 'cpf_cnpj' || field.type === 'cpf_cnpj') {
          const digits = String(val).replace(/\D/g, '');
          if (digits.length !== 11 && digits.length !== 14) errors[field.id] = 'CPF (11) ou CNPJ (14) dígitos';
        }
        if (smart === 'cpf') {
          const digits = String(val).replace(/\D/g, '');
          if (digits.length !== 11) errors[field.id] = 'CPF deve ter 11 dígitos';
        }
        if (smart === 'phone') {
          if (String(val).replace(/\D/g, '').length < 10) errors[field.id] = 'Telefone inválido';
        }
      }
    }
    setValidationErrors(errors);
    if (Object.keys(errors).length > 0) {
      toast.error('Preencha os campos obrigatórios.');
      // Scroll to first error
      const firstErrorId = Object.keys(errors)[0];
      const el = document.getElementById(`field-${firstErrorId}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return false;
    }
    return true;
  };

  const handleSinglePageSubmit = () => {
    if (!validateAllFields()) return;
    if (!lgpdConsent) { setLgpdError(true); toast.error('Aceite os termos de proteção de dados.'); return; }
    submitMutation.mutate();
  };

  // ─── Render field card (shared between modes) ─────────────
  const renderFieldCard = (field: FormField, i: number) => (
    <div key={field.id} id={`field-${field.id}`}>
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
            formId={formId}
            onAudioUrl={(fieldId, url) => {
              setAnswers(prev => ({ ...prev, [`${fieldId}_audio_url`]: url }));
            }}
          />
          {validationErrors[field.id] && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs" style={{ color: '#ef4444' }}>
              {validationErrors[field.id]}
            </motion.p>
          )}
        </div>
      )}
    </div>
  );

  // ─── LGPD block (shared) ──────────────────────────────────
  const renderLgpd = () => (
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
  );

  // ═══════════════════════════════════════════════════════════
  // SINGLE PAGE MODE
  // ═══════════════════════════════════════════════════════════
  if (isSinglePage) {
    return (
      <div className="min-h-screen py-6 px-4" ref={containerRef} style={{ ...brandStyles, background: 'var(--form-bg)', color: 'var(--form-text)' }}>
        <div className={`mx-auto space-y-4 ${isFullWidth ? 'max-w-4xl' : 'max-w-2xl'}`}>

          {/* Cover image */}
          {design.coverImageUrl && (
            <div className="rounded-xl overflow-hidden shadow-md">
              <img
                src={design.coverImageUrl}
                alt={`Capa do formulário ${form.title}`}
                className="block w-full h-auto"
              />
            </div>
          )}

          {/* Header Card (once) */}
          <div className="rounded-xl overflow-hidden shadow-md" style={{ background: 'var(--form-card-bg)', borderTop: `4px solid var(--form-primary)` }}>
            {design.headerImageUrl && (
              <div className="w-full">
                <img src={design.headerImageUrl} alt="" className="w-full h-auto object-contain" />
              </div>
            )}
            <div className="p-5">
              <div className="flex items-start gap-3">
                {design.logoUrl && (
                  <img src={design.logoUrl} alt="Logo" className="h-10 w-10 object-contain rounded" />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1" style={{ color: 'var(--form-primary)' }}>
                    {!design.logoUrl && <ClipboardList className="w-4 h-4" />}
                    <span className="text-[10px] font-medium uppercase tracking-wider">GIRA Formulários</span>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-bold leading-tight">{form.title}</h1>
                  {form.description && <p className="mt-1 text-sm whitespace-pre-wrap" style={{ color: 'var(--form-muted)' }}>{form.description}</p>}
                  {effectiveSpotsRemaining !== null && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full" style={{
                        background: effectiveSpotsRemaining <= 10 ? '#fef2f2' : '#f0fdf4',
                        color: effectiveSpotsRemaining <= 10 ? '#dc2626' : '#16a34a',
                      }}>
                        {effectiveSpotsRemaining <= 10 ? '⚠️' : '✅'} {effectiveSpotsRemaining} {effectiveSpotsRemaining === 1 ? 'vaga restante' : 'vagas restantes'} de {effectiveMaxSlots}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* All sections inline */}
          {steps.filter(s => s.type === 'section').map((section, sIdx) => (
            <div key={sIdx} className="space-y-3">
              {/* Section header */}
              <div className="rounded-xl overflow-hidden shadow-sm" style={{ background: 'var(--form-primary)' }}>
                <div className="px-5 py-3">
                  <h2 className="text-base sm:text-lg font-bold text-white">{section.title}</h2>
                </div>
              </div>
              {/* Section fields */}
              {section.fields.map((field, i) => renderFieldCard(field, i))}
            </div>
          ))}

          {/* LGPD */}
          {renderLgpd()}

          {/* Submit button */}
          <div className="pb-4">
            <motion.button
              type="button"
              onClick={handleSinglePageSubmit}
              disabled={submitMutation.isPending}
              className="w-full py-3 rounded-lg text-white font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: 'var(--form-button)' }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
            >
              {submitMutation.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
              ) : (
                <><Send className="w-4 h-4" /> Enviar Inscrição</>
              )}
            </motion.button>
          </div>

          <p className="text-center text-xs pb-4" style={{ color: 'var(--form-muted)' }}>
            Desenvolvido com <span className="font-semibold">GIRA Formulários</span>
          </p>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // WIZARD (MULTI-STEP) MODE — original behavior
  // ═══════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen py-6 px-4" ref={containerRef} style={{ ...brandStyles, background: 'var(--form-bg)', color: 'var(--form-text)' }}>
      <motion.div initial={false} animate={{ opacity: 1, y: 0 }} className={`mx-auto space-y-4 ${isFullWidth ? 'max-w-4xl' : 'max-w-2xl'}`}>

        {/* Cover image */}
        {design.coverImageUrl && (
          <div className="rounded-xl overflow-hidden shadow-md">
            <img
              src={design.coverImageUrl}
              alt={`Capa do formulário ${form.title}`}
              className="block w-full h-auto"
            />
          </div>
        )}

        {/* Form Header Card */}
        <div className="rounded-xl overflow-hidden shadow-md" style={{ background: 'var(--form-card-bg)', borderTop: `4px solid var(--form-primary)` }}>
          {design.headerImageUrl && (
              <div className="w-full">
                <img src={design.headerImageUrl} alt="" className="w-full h-auto object-contain" />
            </div>
          )}
          <div className="p-5">
          <div className="flex items-start gap-3">
            {design.logoUrl && (
              <img src={design.logoUrl} alt="Logo" className="h-10 w-10 object-contain rounded" />
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1" style={{ color: 'var(--form-primary)' }}>
                {!design.logoUrl && <ClipboardList className="w-4 h-4" />}
                <span className="text-[10px] font-medium uppercase tracking-wider">GIRA Formulários</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold leading-tight">{form.title}</h1>
              {currentStep === 0 && form.description && <p className="mt-1 text-sm whitespace-pre-wrap" style={{ color: 'var(--form-muted)' }}>{form.description}</p>}
              {/* Vacancy badge */}
              {effectiveSpotsRemaining !== null && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full" style={{
                    background: effectiveSpotsRemaining <= 10 ? '#fef2f2' : '#f0fdf4',
                    color: effectiveSpotsRemaining <= 10 ? '#dc2626' : '#16a34a',
                  }}>
                    {effectiveSpotsRemaining <= 10 ? '⚠️' : '✅'} {effectiveSpotsRemaining} {effectiveSpotsRemaining === 1 ? 'vaga restante' : 'vagas restantes'} de {effectiveMaxSlots}
                  </span>
                </div>
              )}
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
        </div>

        {/* Step Title */}
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={currentStep}
            initial={false}
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
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={currentStep}
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="space-y-4"
          >
            {activeStep.type === 'section' && activeStep.fields.map((field, i) => (
              <motion.div
                key={field.id}
                initial={false}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                {renderFieldCard(field, i)}
              </motion.div>
            ))}

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

                {renderLgpd()}
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
          Desenvolvido com <span className="font-semibold">GIRA Formulários</span>
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
function SmartFieldInput({ field, value, onChange, onCepAutoFill, isDark, formId, onAudioUrl }: {
  field: FormField;
  value: unknown;
  onChange: (v: unknown) => void;
  onCepAutoFill?: (data: CepData) => void;
  isDark?: boolean;
  formId?: string;
  onAudioUrl?: (fieldId: string, url: string) => void;
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
  if (smartType === 'cpf') {
    return <CpfOnlyField value={(value as string) || ''} onChange={onChange} />;
  }
  if (smartType === 'cnpj') {
    return <CnpjOnlyField value={(value as string) || ''} onChange={onChange} />;
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
    case 'long_text': {
      const enableAudio = !!(field.settings?.enableAudio);
      return (
        <div className="space-y-2">
          <div className="relative">
            <Textarea value={(value as string) || ''} onChange={e => onChange(e.target.value)} placeholder={enableAudio ? 'Digite sua resposta aqui. Se preferir, use o botão "Usar microfone" abaixo.' : 'Sua resposta'} rows={4} maxLength={5000} />
            <span className="absolute bottom-2 right-2 text-[10px]" style={{ color: 'var(--form-muted)' }}>
              {((value as string) || '').length}/5000
            </span>
          </div>
          {enableAudio && (
            <div className="space-y-3 rounded-lg p-3" style={{ background: isDark ? '#1e293b' : '#f0fdf4', border: '1px solid', borderColor: isDark ? '#334155' : '#bbf7d0' }}>
              <div className="space-y-1">
                <p className="text-sm font-medium" style={{ color: 'var(--form-text)' }}>
                  Responder por áudio (opcional)
                </p>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--form-muted)' }}>
                  Toque em <strong>Usar microfone</strong>. Se o navegador pedir autorização, escolha <strong>Permitir</strong>. Se preferir, você também pode continuar digitando normalmente.
                </p>
              </div>
              <AudioRecorderButton
                onTranscript={(text) => onChange(text)}
                onAudioUrl={(url) => {
                  onAudioUrl?.(field.id, url);
                }}
                currentText={(value as string) || ''}
                lang="pt-BR"
                storagePath={`forms/${formId}/audio`}
              />
            </div>
          )}
        </div>
      );
    }
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
    case 'single_select': {
      const allowOther = !!(field.settings?.allowOther);
      const isOtherSelected = typeof value === 'string' && value.startsWith('__other__:');
      const otherText = isOtherSelected ? (value as string).replace('__other__:', '') : '';
      return (
        <div className="space-y-2">
          <RadioGroup value={isOtherSelected ? '__other__' : (value as string) || ''} onValueChange={(v) => {
            if (v === '__other__') {
              onChange('__other__:');
            } else {
              onChange(v);
            }
          }}>
            {options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <RadioGroupItem value={opt} id={`${field.id}-${i}`} />
                <Label htmlFor={`${field.id}-${i}`} className="text-sm font-normal cursor-pointer">{opt}</Label>
              </div>
            ))}
            {allowOther && (
              <div className="flex items-center gap-2">
                <RadioGroupItem value="__other__" id={`${field.id}-other`} />
                <Label htmlFor={`${field.id}-other`} className="text-sm font-normal cursor-pointer">Outros (especifique)</Label>
              </div>
            )}
          </RadioGroup>
          {allowOther && isOtherSelected && (
            <Input
              value={otherText}
              onChange={e => onChange(`__other__:${e.target.value}`)}
              placeholder="Especifique aqui..."
              className="mt-1"
            />
          )}
        </div>
      );
    }
    case 'multi_select':
    case 'checkbox': {
      const allowOtherMulti = !!(field.settings?.allowOther);
      // Single boolean checkbox (no options) — must check BEFORE casting to array
      if (options.length === 0 && !allowOtherMulti) {
        return (
          <div className="flex items-center gap-2">
            <Checkbox id={field.id} checked={!!value} onCheckedChange={(checked) => onChange(!!checked)} />
            <Label htmlFor={field.id} className="text-sm font-normal cursor-pointer">{field.label}</Label>
          </div>
        );
      }
      const selected = Array.isArray(value) ? value as string[] : [];
      const otherEntry = selected.find(s => s.startsWith('__other__:'));
      const isOtherChecked = !!otherEntry;
      const otherTextMulti = otherEntry ? otherEntry.replace('__other__:', '') : '';
      return (
        <div className="space-y-2">
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <Checkbox
                id={`${field.id}-${i}`}
                checked={selected.includes(opt)}
                onCheckedChange={(checked) => {
                  const filtered = selected.filter(s => s !== opt);
                  onChange(checked ? [...filtered, opt] : filtered);
                }}
              />
              <Label htmlFor={`${field.id}-${i}`} className="text-sm font-normal cursor-pointer">{opt}</Label>
            </div>
          ))}
          {allowOtherMulti && (
            <>
              <div className="flex items-center gap-2">
                <Checkbox
                  id={`${field.id}-other`}
                  checked={isOtherChecked}
                  onCheckedChange={(checked) => {
                    const filtered = selected.filter(s => !s.startsWith('__other__:'));
                    onChange(checked ? [...filtered, '__other__:'] : filtered);
                  }}
                />
                <Label htmlFor={`${field.id}-other`} className="text-sm font-normal cursor-pointer">Outros (especifique)</Label>
              </div>
              {isOtherChecked && (
                <Input
                  value={otherTextMulti}
                  onChange={e => {
                    const filtered = selected.filter(s => !s.startsWith('__other__:'));
                    onChange([...filtered, `__other__:${e.target.value}`]);
                  }}
                  placeholder="Especifique aqui..."
                  className="ml-6"
                />
              )}
            </>
          )}
        </div>
      );
    }
    case 'scale': {
      const hasValue = value !== undefined && value !== null && value !== '';
      const numVal = hasValue ? (typeof value === 'number' ? value : Number(value)) : undefined;
      const min = (field.settings?.min as number) || 1;
      const max = (field.settings?.max as number) || 10;
      const displayVal = numVal ?? Math.round((min + max) / 2);
      return (
        <div className="space-y-2">
          {!hasValue && (
            <p className="text-xs" style={{ color: 'var(--form-muted)' }}>Arraste para selecionar um valor</p>
          )}
          <Slider value={[displayVal]} onValueChange={([v]) => onChange(v)} min={min} max={max} step={1} />
          <div className="flex justify-between text-xs" style={{ color: 'var(--form-muted)' }}>
            <span>{min}</span>
            <span className="font-medium text-sm">{hasValue ? numVal : '—'}</span>
            <span>{max}</span>
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

// ─── CPF Only Field ─────────────────────────────────────────
function CpfOnlyField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const digits = value.replace(/\D/g, '');
  const isComplete = digits.length === 11;

  return (
    <div className="space-y-1">
      <Input
        value={value}
        onChange={e => onChange(maskCpf(e.target.value))}
        placeholder="000.000.000-00"
        maxLength={14}
      />
      {isComplete && (
        <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[10px]" style={{ color: 'var(--form-primary)' }}>
          ✓ CPF válido
        </motion.span>
      )}
    </div>
  );
}

// ─── CNPJ Only Field ────────────────────────────────────────
function CnpjOnlyField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const digits = value.replace(/\D/g, '');
  const isComplete = digits.length === 14;

  return (
    <div className="space-y-1">
      <Input
        value={value}
        onChange={e => onChange(maskCnpj(e.target.value))}
        placeholder="00.000.000/0001-00"
        maxLength={18}
      />
      {isComplete && (
        <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[10px]" style={{ color: 'var(--form-primary)' }}>
          ✓ CNPJ válido
        </motion.span>
      )}
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
