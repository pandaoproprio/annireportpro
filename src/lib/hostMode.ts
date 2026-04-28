/**
 * Detecta se a aplicação está rodando em modo "Forms-only"
 * (subdomínio dedicado apenas para o módulo GIRA Forms).
 *
 * Hosts considerados Forms-only:
 *  - relatorios.giraerp.com.br (produção)
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
    if (host === 'relatorios.giraerp.com.br') return true;

    // Rotas públicas de formulários DEVEM rodar em modo leve (sem Auth/AppData
    // pesados) em qualquer host — incluindo relatorios.giraerp.com.br — para
    // evitar travamentos em mobile/Android com rede instável.
    const path = window.location.pathname;
    if (
      path.startsWith('/f/') ||
      path.startsWith('/c/') || path === '/c' ||
      path.startsWith('/checkin/') ||
      path.startsWith('/form-checkin/') ||
      path.startsWith('/certificado/')
    ) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Domínio canônico do módulo Forms.
 * Rotas públicas de formulários abertas em outros domínios devem ser
 * redirecionadas para cá.
 */
export const FORMS_CANONICAL_HOST = 'relatorios.giraerp.com.br';

/**
 * Prefixos de rota que pertencem exclusivamente ao módulo Forms público.
 * Quando acessados fora do subdomínio canônico (ex: relatorios.giraerp.com.br),
 * devem ser redirecionados para FORMS_CANONICAL_HOST mantendo path + query.
 */
const FORMS_PUBLIC_PREFIXES = ['/f/', '/checkin/', '/form-checkin/', '/certificado/'];

/**
 * Se a URL atual for uma rota pública de forms acessada em um host diferente
 * do canônico, devolve a URL absoluta de destino. Caso contrário, devolve null.
 *
 * Hosts isentos do redirecionamento:
 *  - o próprio FORMS_CANONICAL_HOST
 *  - qualquer host "forms.*" (subdomínios alternativos)
 *  - localhost / 127.0.0.1 (desenvolvimento)
 *  - *.lovable.app e *.lovable.dev (preview/staging do Lovable)
 */
export function getFormsRedirectUrl(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const { hostname, pathname, search, hash, protocol } = window.location;
    const host = hostname.toLowerCase();

    // Já está no domínio correto
    if (host === FORMS_CANONICAL_HOST) return null;
    if (host.startsWith('forms.')) return null;

    // Ambientes de desenvolvimento / preview não devem redirecionar
    if (host === 'localhost' || host === '127.0.0.1') return null;
    if (host.endsWith('.lovable.app') || host.endsWith('.lovable.dev')) return null;

    // Só redireciona se o path for de forms público
    const isFormsPublic = FORMS_PUBLIC_PREFIXES.some(p => pathname.startsWith(p));
    if (!isFormsPublic) return null;

    return `${protocol}//${FORMS_CANONICAL_HOST}${pathname}${search}${hash}`;
  } catch {
    return null;
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
  '/diario',              // Diário de Bordo (login + app autenticado)
];

export function isPathAllowedInFormsOnly(pathname: string): boolean {
  return FORMS_ONLY_ALLOWED_PREFIXES.some(p =>
    p.endsWith('/') ? pathname.startsWith(p) : pathname === p || pathname.startsWith(p + '/')
  );
}
