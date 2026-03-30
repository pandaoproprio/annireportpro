export type AssetMap = Map<string, string> // url original → base64 data-URI

// ── Logo bar: 3 slots (left / center / right) ──
export interface LogoBarConfig {
  leftLogoUrl?: string
  centerLogoUrl?: string
  rightLogoUrl?: string
  leftLogoBase64?: string
  centerLogoBase64?: string
  rightLogoBase64?: string
  heightMm?: number      // default 20mm
  logoWidthMm?: number   // default 30mm
  alignment?: 'left' | 'center' | 'right' | 'space-between' | 'space-around'
  gapMm?: number         // default 4mm
  renderMode?: 'first-page' | 'all-pages'
}

// ── Footer institucional ──
export interface InstitutionalFooter {
  enabled?: boolean       // default true
  line1?: string          // org name (bold)
  line2?: string          // address
  line3?: string          // website | email | phone
  alignment?: 'left' | 'center' | 'right'
}

// ── CEAP Defaults ──
export const CEAP_FOOTER_DEFAULTS: Required<InstitutionalFooter> = {
  enabled: true,
  line1: 'Centro de Articulação de Populações Marginalizadas - CEAP',
  line2: 'R. Sr. dos Passos, 174 - Sl 701 - Centro, Rio de Janeiro - RJ, 20061-011',
  line3: 'ceapoficial.org.br | falecom@ceapoficial.org.br | (21) 9 7286-4717',
  alignment: 'center',
}

export interface ReportMeta {
  title: string
  subtitle?: string
  organization: string
  logoUrl?: string          // legacy single logo (backward compat)
  logoBar?: LogoBarConfig   // new: 3-slot logo bar
  footer?: InstitutionalFooter
  period?: string
  generatedAt: string       // ISO date string
}

export interface ReportPhoto {
  url: string
  caption?: string
  base64?: string // preenchido pelo assetLoader
}

export interface ReportSection {
  id: string
  title: string
  content?: string // texto rico em markdown simples
  photos?: ReportPhoto[]
  subsections?: ReportSection[]
}

export interface ReportAsset {
  originalUrl: string
  dataUri: string
}

export interface ReportData {
  meta: ReportMeta
  sections: ReportSection[]
  assets: ReportAsset[]
}

export type TemplateName = 'objeto-i' | 'objeto-ii' | 'relatorio-v2'
