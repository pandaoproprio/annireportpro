export type AssetMap = Map<string, string> // url original → base64 data-URI

export interface ReportMeta {
  title: string
  subtitle?: string
  organization: string
  logoUrl?: string
  period?: string
  generatedAt: string // ISO date string
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
