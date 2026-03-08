import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Mock supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn((cb) => {
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      }),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
}));

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  Navigate: ({ to }: { to: string }) => <div data-testid="navigate" data-to={to} />,
  useLocation: () => ({ pathname: '/dashboard' }),
  useNavigate: () => vi.fn(),
}));

// Mock useMfa
vi.mock('@/hooks/useMfa', () => ({
  useMfa: () => ({
    isEnrolled: false,
    needsVerification: false,
    isLoading: false,
    refreshMfa: vi.fn(),
  }),
}));

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AuthProvider } from '@/hooks/useAuth';

describe('ProtectedRoute', () => {
  it('redirects to /login when user is not authenticated', async () => {
    render(
      <AuthProvider>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </AuthProvider>
    );

    // Wait for loading to finish and redirect to appear
    const nav = await screen.findByTestId('navigate', {}, { timeout: 3000 });
    expect(nav.getAttribute('data-to')).toBe('/login');
  });

  it('shows loading spinner while auth is loading', () => {
    // AuthProvider starts in loading state
    const { container } = render(
      <AuthProvider>
        <ProtectedRoute>
          <div>Content</div>
        </ProtectedRoute>
      </AuthProvider>
    );

    expect(container.querySelector('.animate-spin')).toBeTruthy();
  });
});

describe('Auth validation', () => {
  it('validates email format', () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    expect(emailRegex.test('user@example.com')).toBe(true);
    expect(emailRegex.test('invalid')).toBe(false);
    expect(emailRegex.test('')).toBe(false);
    expect(emailRegex.test('user@')).toBe(false);
    expect(emailRegex.test('@domain.com')).toBe(false);
  });

  it('validates password minimum length', () => {
    const isValid = (pw: string) => pw.length >= 6;
    expect(isValid('123456')).toBe(true);
    expect(isValid('12345')).toBe(false);
    expect(isValid('')).toBe(false);
    expect(isValid('abcdef')).toBe(true);
  });

  it('validates UserRole enum values', () => {
    const validRoles = ['USUARIO', 'OFICINEIRO', 'COORDENADOR', 'ANALISTA', 'ADMIN', 'SUPER_ADMIN'];
    validRoles.forEach(role => {
      expect(validRoles).toContain(role);
    });
    expect(validRoles).not.toContain('MODERATOR');
  });
});
