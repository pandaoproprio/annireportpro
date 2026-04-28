import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Login } from '@/pages/Login';
import { ResetPassword } from '@/pages/ResetPassword';
import { PrivacyPolicy } from '@/pages/PrivacyPolicy';
import { TermsOfUse } from '@/pages/TermsOfUse';
import { Skeleton } from '@/components/ui/skeleton';
import { MainLayout } from '@/components/layout/MainLayout';

const FormsLanding = lazy(() => import('@/pages/FormsLanding'));
const MfaVerify = lazy(() => import('@/pages/MfaVerify').then(m => ({ default: m.MfaVerify })));
const LgpdConsent = lazy(() => import('@/pages/LgpdConsent').then(m => ({ default: m.LgpdConsent })));
const ForcePasswordChange = lazy(() => import('@/pages/ForcePasswordChange').then(m => ({ default: m.ForcePasswordChange })));
const PublicFormPage = lazy(() => import('@/modules/gira-forms/PublicFormPage'));
const FormCheckinPanel = lazy(() => import('@/modules/gira-forms/components/FormCheckinPanel'));
const PublicCheckinPage = lazy(() => import('@/modules/gira-forms/PublicCheckinPage'));
const CheckinPage = lazy(() => import('@/modules/gira-eventos/components/CheckinPage'));
const CertificateVerifyPage = lazy(() => import('@/modules/gira-eventos/components/CertificateVerifyPage'));
const VolunteerTermVerifyPage = lazy(() => import('@/modules/gira-forms/volunteer-term/VolunteerTermVerifyPage'));

const PageFallback = () => (
  <div className="space-y-4 p-4">
    <Skeleton className="h-8 w-48" />
    <Skeleton className="h-64 w-full" />
  </div>
);

/**
 * Roteador exclusivo para o subdomínio Forms-only (forms.giraerp.com.br).
 * Expõe apenas: landing, autenticação, formulários públicos, painel de organizador
 * (restrito ao módulo gira-forms via MainLayout) e checkin geofence.
 *
 * Qualquer rota fora dessa whitelist é redirecionada para a landing.
 */
export const FormsOnlyRoutes: React.FC = () => {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        {/* Landing pública */}
        <Route path="/" element={<FormsLanding />} />

        {/* Autenticação */}
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/lgpd" element={<PrivacyPolicy />} />
        <Route path="/licenca" element={<TermsOfUse />} />

        {/* Formulário público + checkin */}
        <Route path="/f/:id" element={<PublicFormPage />} />
        <Route path="/form-checkin/:id" element={<FormCheckinPanel />} />
        <Route path="/c/:code" element={<PublicCheckinPage />} />
        <Route path="/c" element={<PublicCheckinPage />} />
        <Route path="/checkin/:id" element={<CheckinPage />} />
        <Route path="/certificado/:hash" element={<CertificateVerifyPage />} />

        {/* Fluxos auth obrigatórios */}
        <Route path="/consentimento" element={<ProtectedRoute><LgpdConsent /></ProtectedRoute>} />
        <Route path="/change-password" element={<ProtectedRoute><ForcePasswordChange /></ProtectedRoute>} />
        <Route path="/mfa-verify" element={<ProtectedRoute><MfaVerify /></ProtectedRoute>} />

        {/* Painel autenticado: somente rotas do módulo Forms.
            MainLayout cuidará da navegação; o sidebar mostrará apenas itens permitidos. */}
        <Route path="/forms/*" element={<ProtectedRoute><MainLayout /></ProtectedRoute>} />

        {/* Qualquer outra rota → landing */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};
