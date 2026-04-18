/**
 * Detecta se a aplicação está rodando em modo "Forms-only"
 * (subdomínio dedicado apenas para o módulo GIRA Forms).
 *
 * Hosts considerados Forms-only:
 *  - forms.giraerp.com.br (produção)
 *  - qualquer host que comece com "forms." 
 *  - ?forms=1 na URL (para testes locais / preview)
 */
export function isFormsOnlyHost(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const host = window.location.hostname.toLowerCase();
    const params = new URLSearchParams(window.location.search);
    if (params.get('forms') === '1') return true;
    if (host.startsWith('forms.')) return true;
    if (host === 'forms.giraerp.com.br') return true;
    return false;
  } catch {
    return false;
  }
}

/**
 * Rotas permitidas no modo Forms-only.
 * Tudo fora dessa whitelist é redirecionado para "/" (landing pública de forms)
 * ou para "/login" (organizadores).
 */
export const FORMS_ONLY_ALLOWED_PREFIXES = [
  '/',                    // landing
  '/login',               // login do organizador
  '/reset-password',
  '/lgpd',
  '/licenca',
  '/forms',               // dashboard interno (organizador autenticado)
  '/f/',                  // formulário público
  '/form-checkin/',       // painel checkin público
  '/checkin/',            // checkin geofence
  '/certificado/',
  '/consentimento',
  '/change-password',
  '/mfa-verify',
];

export function isPathAllowedInFormsOnly(pathname: string): boolean {
  return FORMS_ONLY_ALLOWED_PREFIXES.some(p =>
    p.endsWith('/') ? pathname.startsWith(p) : pathname === p || pathname.startsWith(p + '/')
  );
}
