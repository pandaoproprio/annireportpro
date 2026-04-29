import React, { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Login } from '@/pages/Login';
import { ResetPassword } from '@/pages/ResetPassword';
import { PrivacyPolicy } from '@/pages/PrivacyPolicy';
import { TermsOfUse } from '@/pages/TermsOfUse';
import { DiaryLogin } from '@/pages/DiaryLogin';
import { Skeleton } from '@/components/ui/skeleton';
import { MainLayout } from '@/components/layout/MainLayout';

const GuiaAulaPage = lazy(() => import('@/pages/GuiaAulaPage'));
const InstallGuide = lazy(() => import('@/pages/InstallGuide').then(m => ({ default: m.InstallGuide })));
const MfaVerify = lazy(() => import('@/pages/MfaVerify').then(m => ({ default: m.MfaVerify })));
const LgpdConsent = lazy(() => import('@/pages/LgpdConsent').then(m => ({ default: m.LgpdConsent })));
const ForcePasswordChange = lazy(() => import('@/pages/ForcePasswordChange').then(m => ({ default: m.ForcePasswordChange })));
const DiaryLayout = lazy(() => import('@/pages/DiaryLayout').then(m => ({ default: m.DiaryLayout })));
const Onboarding = lazy(() => import('@/pages/Onboarding').then(m => ({ default: m.Onboarding })));
const PublicFormPage = lazy(() => import('@/modules/gira-forms/PublicFormPage'));
const PublicEventPage = lazy(() => import('@/modules/gira-eventos/PublicEventPage'));
const CheckinPage = lazy(() => import('@/modules/gira-eventos/components/CheckinPage'));
const CertificateVerifyPage = lazy(() => import('@/modules/gira-eventos/components/CertificateVerifyPage'));
const FormCheckinPanel = lazy(() => import('@/modules/gira-forms/components/FormCheckinPanel'));
const PublicCheckinPage = lazy(() => import('@/modules/gira-forms/PublicCheckinPage'));
const VerifyJustificationPage = lazy(() => import('@/pages/VerifyJustificationPage'));
const PublicSignJustificationPage = lazy(() => import('@/pages/PublicSignJustificationPage'));
const ShortLinkRedirect = lazy(() => import('@/pages/ShortLinkRedirect'));

const PageFallback = () => (
  <div className="space-y-4 p-4">
    <Skeleton className="h-8 w-48" />
    <Skeleton className="h-64 w-full" />
    <Skeleton className="h-32 w-full" />
  </div>
);

export const AppRoutes: React.FC = () => {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/guia-aula" element={<Suspense fallback={<PageFallback />}><GuiaAulaPage /></Suspense>} />
        <Route path="/instalar" element={<InstallGuide />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/lgpd" element={<PrivacyPolicy />} />
        <Route path="/licenca" element={<TermsOfUse />} />
        <Route path="/diario/login" element={<DiaryLogin />} />
        <Route path="/f/:id" element={<Suspense fallback={<PageFallback />}><PublicFormPage /></Suspense>} />
        <Route path="/e/:id" element={<Suspense fallback={<PageFallback />}><PublicEventPage /></Suspense>} />
        <Route path="/checkin/:id" element={<Suspense fallback={<PageFallback />}><CheckinPage /></Suspense>} />
        <Route path="/certificado/:hash" element={<Suspense fallback={<PageFallback />}><CertificateVerifyPage /></Suspense>} />
        <Route path="/form-checkin/:id" element={<Suspense fallback={<PageFallback />}><FormCheckinPanel /></Suspense>} />
        <Route path="/c/:code" element={<Suspense fallback={<PageFallback />}><PublicCheckinPage /></Suspense>} />
        <Route path="/c" element={<Suspense fallback={<PageFallback />}><PublicCheckinPage /></Suspense>} />
        <Route path="/verificar/:hash" element={<Suspense fallback={<PageFallback />}><VerifyJustificationPage /></Suspense>} />
        <Route path="/assinar/:token" element={<Suspense fallback={<PageFallback />}><PublicSignJustificationPage /></Suspense>} />

        {/* Protected routes */}
        <Route path="/consentimento" element={<ProtectedRoute><LgpdConsent /></ProtectedRoute>} />
        <Route path="/change-password" element={<ProtectedRoute><ForcePasswordChange /></ProtectedRoute>} />
        <Route path="/mfa-verify" element={<ProtectedRoute><MfaVerify /></ProtectedRoute>} />
        <Route path="/diario/*" element={<ProtectedRoute><DiaryLayout /></ProtectedRoute>} />
        <Route path="/setup" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />

        {/* Authenticated layout with sidebar */}
        <Route path="/*" element={<ProtectedRoute><MainLayout /></ProtectedRoute>} />
      </Routes>
    </Suspense>
  );
};
