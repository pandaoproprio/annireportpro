
import type { ReportData, ReportAsset, ReportPhoto, ReportSection } from './schema'

const TIMEOUT_MS = 8000

const PLACEHOLDER =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

async function fetchAsBase64(url: string): Promise<string> {
  if (!url || url.startsWith('data:')) return url

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const response = await fetch(url, { signal: controller.signal, mode: 'cors' })
    if (!response.ok) return PLACEHOLDER

    const blob = await response.blob()
    return await new Promise<string>((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = () => resolve(PLACEHOLDER)
      reader.readAsDataURL(blob)
    })
  } catch {
    return PLACEHOLDER
  } finally {
    clearTimeout(timer)
  }
}

function extractUrls(data: ReportData): string[] {
  const urls: string[] = []

  if (data.meta.logoUrl) urls.push(data.meta.logoUrl)

  // Logo bar URLs
  const lb = data.meta.logoBar
  if (lb) {
    if (lb.leftLogoUrl) urls.push(lb.leftLogoUrl)
    if (lb.centerLogoUrl) urls.push(lb.centerLogoUrl)
    if (lb.rightLogoUrl) urls.push(lb.rightLogoUrl)
  }

  function collectFromSections(sections: ReportSection[]) {
    for (const section of sections) {
      section.photos?.forEach((p: ReportPhoto) => {
        if (p.url) urls.push(p.url)
      })
      if (section.subsections) collectFromSections(section.subsections)
    }
  }

  collectFromSections(data.sections)
  return [...new Set(urls)] // deduplica
}

export async function preloadAssets(data: ReportData): Promise<ReportData> {
  const urls = extractUrls(data)

  const results = await Promise.allSettled(
    urls.map(async (url) => {
      const dataUri = await fetchAsBase64(url)
      return { originalUrl: url, dataUri } satisfies ReportAsset
    })
  )

  const assets: ReportAsset[] = results
    .filter((r): r is PromiseFulfilledResult<ReportAsset> => r.status === 'fulfilled')
    .map((r) => r.value)

  const assetMap = new Map(assets.map((a) => [a.originalUrl, a.dataUri]))

  // Injeta base64 direto nas fotos para os templates não precisarem buscar
  function hydrateSection(section: ReportSection): ReportSection {
    return {
      ...section,
      photos: section.photos?.map((p: ReportPhoto) => ({
        ...p,
        base64: assetMap.get(p.url) ?? PLACEHOLDER,
      })),
      subsections: section.subsections?.map(hydrateSection),
    }
  }

  // Hydrate logo bar
  const logoBar = data.meta.logoBar
  const hydratedLogoBar = logoBar ? {
    ...logoBar,
    leftLogoBase64: logoBar.leftLogoUrl ? (assetMap.get(logoBar.leftLogoUrl) ?? undefined) : undefined,
    centerLogoBase64: logoBar.centerLogoUrl ? (assetMap.get(logoBar.centerLogoUrl) ?? undefined) : undefined,
    rightLogoBase64: logoBar.rightLogoUrl ? (assetMap.get(logoBar.rightLogoUrl) ?? undefined) : undefined,
  } : undefined

  return {
    ...data,
    meta: {
      ...data.meta,
      logoUrl: data.meta.logoUrl ? (assetMap.get(data.meta.logoUrl) ?? data.meta.logoUrl) : undefined,
      logoBar: hydratedLogoBar,
    },
    sections: data.sections.map(hydrateSection),
    assets,
  }
}
