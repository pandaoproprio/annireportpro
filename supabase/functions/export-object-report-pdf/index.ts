import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type JsonRecord = Record<string, unknown>;

type ReportLinkKey = "attendance" | "registration" | "media";

interface Goal {
  id: string;
  title: string;
}

interface Project {
  name: string;
  organizationName: string;
  organizationAddress?: string;
  organizationWebsite?: string;
  organizationEmail?: string;
  organizationPhone?: string;
  fomentoNumber: string;
  goals: Goal[];
}

interface Activity {
  id: string;
  goalId?: string;
  date: string;
  endDate?: string;
  location?: string;
  description?: string;
  attendeesCount?: number;
  photos?: string[];
  type?: string;
  deleted_at?: string | null;
  deletedAt?: string | null;
  deleted?: boolean;
}

interface ExpenseItem {
  id: string;
  itemName?: string;
  description?: string;
  image?: string;
  [key: string]: unknown;
}

interface ReportSection {
  id: string;
  key: string;
  title: string;
  type: "fixed" | "custom";
  content?: string;
  isVisible: boolean;
}

interface ReportPhotoMeta {
  caption?: string;
}

interface PhotoGroup {
  id: string;
  caption: string;
  photoIds: string[];
}

interface LogoConfig {
  visible?: boolean;
  widthMm?: number;
}

interface VisualConfig {
  headerBannerUrl?: string;
  headerBannerVisible?: boolean;
  headerBannerFit?: "contain" | "cover" | "fill";
  headerLeftText?: string;
  headerRightText?: string;
  logo?: string;
  logoCenter?: string;
  logoSecondary?: string;
  logoConfig?: LogoConfig;
  logoCenterConfig?: LogoConfig;
  logoSecondaryConfig?: LogoConfig;
  coverLogo?: string;
  coverTitle?: string;
  coverSubtitle?: string;
  coverHideSubtitle?: boolean;
  coverHideFomento?: boolean;
  coverHideOrg?: boolean;
  footerInstitutionalEnabled?: boolean;
  footerLine1Text?: string;
  footerLine2Text?: string;
  footerLine3Text?: string;
  pageMarginPreset?: "abnt" | "custom";
  headerBannerHeightMm?: number;
}

interface ReportPayload {
  project: Project;
  activities: Activity[];
  sections: ReportSection[];
  objectText: string;
  summary: string;
  goalNarratives: Record<string, string>;
  goalPhotos: Record<string, string[]>;
  otherActionsNarrative: string;
  otherActionsPhotos: string[];
  communicationNarrative: string;
  communicationPhotos: string[];
  satisfaction: string;
  futureActions: string;
  expenses: ExpenseItem[];
  links: { attendance?: string; registration?: string; media?: string };
  linkDisplayNames?: { attendance?: string; registration?: string; media?: string };
  sectionPhotos?: Record<string, string[]>;
  photoMetadata?: Record<string, ReportPhotoMeta[]>;
  sectionPhotoGroups?: Record<string, PhotoGroup[]>;
  visualConfig?: VisualConfig;
  selectedVideoUrls?: string[];
  hideActivitiesBySection?: Record<string, boolean>;
  goalTitleOverrides?: Record<string, { description?: string; hide?: boolean }>;
}

const FALLBACK_LINK_LABELS: Record<ReportLinkKey, string> = {
  attendance: "Clique aqui para ver a Lista de Presença",
  registration: "Clique aqui para ver a Lista de Inscrição",
  media: "Clique aqui para abrir a mídia",
};

const CEAP_FOOTER = {
  line1: "Centro de Articulação de Populações Marginalizadas - CEAP",
  line2: "R. Sr. dos Passos, 174 - Sl 701 - Centro, Rio de Janeiro - RJ, 20061-011",
  line3: "ceapoficial.org.br | falecom@ceapoficial.org.br | (21) 9 7286-4717",
};

const IMAGE_PRESETS = {
  inline: { width: 520, quality: 55 },
  gallery: { width: 420, quality: 52 },
  grid: { width: 420, quality: 52 },
  expenseThumb: { width: 180, quality: 45 },
  banner: { width: 720, quality: 60 },
  headerLogo: { width: 220, quality: 65 },
  coverLogo: { width: 320, quality: 65 },
} as const;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function uniqueStrings(values: unknown[]): string[] {
  return Array.from(new Set(values.filter(isNonEmptyString).map((value) => value.trim())));
}

function normalizeLinkTargets(primary?: string | null, extras: string[] = []): string[] {
  return Array.from(
    new Set(
      [primary ?? "", ...extras]
        .flatMap((value) => typeof value === "string" ? value.split("\n") : [])
        .map((value) => value.trim())
        .filter((value) => value.length > 0 && value !== "[não informado]"),
    ),
  );
}

function resolveLinkDisplayName(key: ReportLinkKey, custom?: string | null, index?: number): string {
  const trimmed = custom?.trim();
  if (trimmed && !/^https?:\/\//i.test(trimmed)) return trimmed;
  if (key === "media" && typeof index === "number") return `Abrir mídia ${index + 1}`;
  return FALLBACK_LINK_LABELS[key];
}

function formatActivityDate(date: string, endDate?: string): string {
  const start = new Date(date).toLocaleDateString("pt-BR");
  if (endDate) return `${start} a ${new Date(endDate).toLocaleDateString("pt-BR")}`;
  return start;
}

function formatLongDate(): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

function isSoftDeletedActivity(activity: Activity): boolean {
  return Boolean(activity.deleted_at || activity.deletedAt || activity.deleted);
}

function getActiveActivities(activities: Activity[]): Activity[] {
  return activities.filter((activity) => !isSoftDeletedActivity(activity));
}

function buildParagraphsFromText(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => `<p class="body-copy">${escapeHtml(chunk).replace(/\n/g, "<br />")}</p>`)
    .join("");
}

function renderGalleryHtml(match: string): string {
  const imagesMatch = match.match(/data-images="([^"]*)"/i) || match.match(/data-images='([^']*)'/i);
  const groupCaptionMatch = match.match(/data-group-caption="([^"]*)"/i);
  const imagesAttr = imagesMatch ? imagesMatch[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&') : "[]";
  const groupCaption = groupCaptionMatch ? groupCaptionMatch[1] : "";
  let images: Array<{ src?: string; caption?: string }> = [];
  try { images = JSON.parse(imagesAttr); } catch { images = []; }
  const validImages = images.filter((img) => isNonEmptyString(img?.src));
  if (validImages.length === 0) return "";
  const gridClass = validImages.length === 1 ? "photo-grid single-photo-grid" : "photo-grid";
  const inner = validImages
    .map((img, index) => `
      <figure class="photo-item rich-photo-item">
        <img src="${escapeHtml(optimizeStorageImageUrl(img.src!.trim(), IMAGE_PRESETS.gallery.width, IMAGE_PRESETS.gallery.quality))}" alt="${escapeHtml((img.caption || `Imagem ${index + 1}`).trim())}" loading="eager" decoding="sync" />
        <figcaption class="caption">${escapeHtml((img.caption || `Imagem ${index + 1}`).trim())}</figcaption>
      </figure>`)
    .join("");
  const wrapper = `<div class="${gridClass}">${inner}</div>`;
  if (groupCaption) {
    return `<div class="photo-group"><h4 class="photo-group-title">${escapeHtml(groupCaption)}</h4>${wrapper}</div>`;
  }
  return wrapper;
}

function sanitizeRichHtml(input: string): string {
  if (!input.trim()) return "";
  if (!/[<][a-z!/]/i.test(input)) return buildParagraphsFromText(input);

  let html = input;

  // Remove dangerous tags
  html = html.replace(/<(script|style|iframe|object|embed)\b[^>]*>[\s\S]*?<\/\1>/gi, "");
  html = html.replace(/<(script|style|iframe|object|embed)\b[^>]*\/?>/gi, "");

  // Process gallery nodes
  html = html.replace(/<[a-z][a-z0-9]*\b[^>]*data-gallery[^>]*>[\s\S]*?<\/[a-z][a-z0-9]*>/gi, renderGalleryHtml);
  html = html.replace(/<[a-z][a-z0-9]*\b[^>]*data-gallery[^>]*\/?>/gi, renderGalleryHtml);

  // Remove event handlers (on*)
  html = html.replace(/\s+on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");

  // Remove javascript: from href/src
  html = html.replace(/(href|src)\s*=\s*"javascript:[^"]*"/gi, '$1=""');
  html = html.replace(/(href|src)\s*=\s*'javascript:[^']*'/gi, "$1=''");

  // Process img tags: enforce sizing and loading
  html = html.replace(/<img\b([^>]*)>/gi, (_match, attrs: string) => {
    const widthMatch = attrs.match(/data-width="(\d+)"/i);
    const widthPct = widthMatch ? Math.min(Math.max(parseInt(widthMatch[1], 10), 35), 100) : 100;
    const hasAlt = /\balt\s*=/i.test(attrs);
    const srcMatch = attrs.match(/\bsrc\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const rawSrc = srcMatch?.[2] || srcMatch?.[3] || srcMatch?.[4] || "";
    const optimizedSrc = rawSrc
      ? optimizeStorageImageUrl(rawSrc.trim(), IMAGE_PRESETS.inline.width, IMAGE_PRESETS.inline.quality)
      : "";
    let newAttrs = attrs.replace(/\bstyle\s*=\s*"[^"]*"/gi, "");
    newAttrs = newAttrs.replace(/\bloading\s*=\s*"[^"]*"/gi, "");
    newAttrs = newAttrs.replace(/\bdecoding\s*=\s*"[^"]*"/gi, "");
    if (optimizedSrc) {
      newAttrs = newAttrs.replace(/\bsrc\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/i, `src="${optimizedSrc}"`);
    }
    if (!hasAlt) newAttrs += ` alt="Imagem"`;
    newAttrs += ` loading="eager"`;
    newAttrs += ` decoding="sync"`;
    newAttrs += ` style="display:block;max-width:${widthPct}%;width:${widthPct}%;height:auto;margin:12px auto;border-radius:10px;"`;
    return `<img${newAttrs}>`;
  });

  // Add target to links
  html = html.replace(/<a\b([^>]*href\s*=)/gi, '<a target="_blank" rel="noreferrer noopener" $1');

  return html;
}

function renderRichContent(content: string | undefined, fallback: string): string {
  const trimmed = content?.trim();
  if (!trimmed) return buildParagraphsFromText(fallback);
  return sanitizeRichHtml(trimmed);
}

function renderPlainActivityList(activities: Activity[], options?: { hideDescription?: boolean }): string {
  if (activities.length === 0) return "";
  const hideDescription = options?.hideDescription === true;
  return `
    <div class="activity-list">
      <p class="subheading">Atividades realizadas:</p>
      <ul class="activity-bullets">
        ${activities.map((activity) => {
          const dateText = formatActivityDate(activity.date, activity.endDate);
          const locationText = isNonEmptyString(activity.location) ? ` – ${escapeHtml(activity.location.trim())}` : "";
          const attendeesText = activity.attendeesCount && activity.attendeesCount > 0 ? ` – ${activity.attendeesCount} participantes` : "";
          const description = !hideDescription && isNonEmptyString(activity.description) ? `<p class="activity-description">${escapeHtml(activity.description.trim())}</p>` : "";
          return `
            <li class="activity-item">
              <div class="activity-meta"><strong>${escapeHtml(dateText)}</strong>${locationText}${attendeesText}</div>
              ${description}
            </li>
          `;
        }).join("")}
      </ul>
    </div>
  `;
}

function optimizeStorageImageUrl(src: string, width = IMAGE_PRESETS.grid.width, quality = IMAGE_PRESETS.grid.quality): string {
  try {
    const url = new URL(src);
    const isSupabaseStorage = url.hostname.endsWith("supabase.co") && url.pathname.includes("/storage/v1/");
    if (!isSupabaseStorage) return src;

    if (url.pathname.includes("/storage/v1/object/public/")) {
      url.pathname = url.pathname.replace("/storage/v1/object/public/", "/storage/v1/render/image/public/");
    }

    if (!url.pathname.includes("/storage/v1/render/image/public/")) return src;

    url.searchParams.set("width", String(Math.max(120, Math.min(width, 1600))));
    url.searchParams.set("quality", String(Math.max(35, Math.min(quality, 80))));
    url.searchParams.set("resize", "contain");
    return url.toString();
  } catch {
    return src;
  }
}

function chunkItems<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function normalizePhotoItems(photos: string[], metas: ReportPhotoMeta[] = []): Array<{ src: string; caption: string }> {
  const seen = new Set<string>();
  const items: Array<{ src: string; caption: string }> = [];

  photos.forEach((rawSrc, index) => {
    if (!isNonEmptyString(rawSrc)) return;
    const optimizedSrc = optimizeStorageImageUrl(rawSrc.trim(), IMAGE_PRESETS.grid.width, IMAGE_PRESETS.grid.quality);
    if (seen.has(optimizedSrc)) return;
    seen.add(optimizedSrc);
    items.push({
      src: optimizedSrc,
      caption: metas[index]?.caption?.trim() || `Foto ${items.length + 1}`,
    });
  });

  return items;
}

function renderPhotoGrid(items: Array<{ src: string; caption: string }>, title?: string): string {
  if (items.length === 0) return "";

  return chunkItems(items, 4)
    .map((chunk, chunkIndex) => {
      const gridClass = chunk.length === 1 ? "photo-grid single-photo-grid" : "photo-grid";
      return `
        <div class="photo-block">
          ${title && chunkIndex === 0 ? `<h3 class="section-title photo-section-title">${escapeHtml(title)}</h3>` : ""}
          <div class="${gridClass}">
            ${chunk.map((item, index) => `
              <figure class="photo-item">
                <img src="${escapeHtml(item.src)}" alt="${escapeHtml(item.caption || `Foto ${index + 1}`)}" loading="eager" decoding="sync" />
                <figcaption class="caption">${escapeHtml(item.caption || `Foto ${index + 1}`)}</figcaption>
              </figure>
            `).join("")}
          </div>
        </div>
      `;
    })
    .join("");
}

function renderGroupedPhotoBlocks(
  photos: string[],
  metas: ReportPhotoMeta[] = [],
  groups: PhotoGroup[] = [],
  title?: string,
): string {
  if (photos.length === 0) return "";

  const items = normalizePhotoItems(photos, metas);
  const groupedIndices = new Set<number>();
  const blocks: string[] = [];

  groups.forEach((group) => {
    const groupItems = uniqueStrings(group.photoIds.map((id) => {
      const index = Number(id);
      if (Number.isNaN(index) || index < 0 || index >= items.length) return "";
      groupedIndices.add(index);
      return String(index);
    }))
      .map((value) => items[Number(value)])
      .filter(Boolean);

    if (groupItems.length > 0) {
      blocks.push(`
        <div class="photo-group">
          <h4 class="photo-group-title">${escapeHtml(group.caption)}</h4>
          ${renderPhotoGrid(groupItems)}
        </div>
      `);
    }
  });

  const ungrouped = items.filter((_, index) => !groupedIndices.has(index));
  if (ungrouped.length > 0) blocks.push(renderPhotoGrid(ungrouped));

  return `
    <section class="section photo-section">
      ${title ? `<h2 class="section-title">${escapeHtml(title)}</h2>` : ""}
      ${blocks.join("")}
    </section>
  `;
}

function normalizeExpensePhotoUrl(value: unknown): string | null {
  if (isNonEmptyString(value)) return value.trim();
  if (!value || typeof value !== "object") return null;

  const media = value as JsonRecord;
  const mediaType = typeof media.type === "string"
    ? media.type.toLowerCase()
    : typeof media.mimeType === "string"
      ? media.mimeType.toLowerCase()
      : "";

  const candidate = [media.url, media.src, media.publicUrl, media.fileUrl, media.path].find(isNonEmptyString);
  if (!candidate) return null;
  if (!mediaType || mediaType === "image" || mediaType.startsWith("image/")) return candidate.trim();
  return null;
}

function extractExpensePhotoUrls(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap(extractExpensePhotoUrls);

  const directUrl = normalizeExpensePhotoUrl(value);
  if (directUrl) return [directUrl];
  if (typeof value !== "object") return [];

  const record = value as JsonRecord;
  return [
    ...extractExpensePhotoUrls(record.fotos),
    ...extractExpensePhotoUrls(record.photos),
    ...extractExpensePhotoUrls(record.images),
    ...extractExpensePhotoUrls(record.midias),
    ...extractExpensePhotoUrls(record.registroFotografico),
    ...extractExpensePhotoUrls(record.registro_fotografico),
    ...extractExpensePhotoUrls(record.itens),
    ...extractExpensePhotoUrls(record.items),
  ];
}

function collectExpensePhotos(expense: ExpenseItem): string[] {
  return Array.from(new Set([
    ...extractExpensePhotoUrls(expense.image),
    ...extractExpensePhotoUrls(expense.images),
    ...extractExpensePhotoUrls(expense.fotos),
    ...extractExpensePhotoUrls(expense.photos),
    ...extractExpensePhotoUrls(expense.midias),
    ...extractExpensePhotoUrls(expense.registroFotografico),
    ...extractExpensePhotoUrls(expense.registro_fotografico),
  ]));
}


function renderExpensesSection(payload: ReportPayload, renderedPhotoKeys: Set<string>, section: ReportSection): string {
  if (payload.expenses.length === 0) {
    renderedPhotoKeys.add(section.key);
    renderedPhotoKeys.add(section.id);
    return `
      <section class="section">
        <h2 class="section-title">${escapeHtml(section.title)}</h2>
        <p class="body-copy">[Nenhum item de despesa cadastrado]</p>
      </section>
    `;
  }

  const expenseSectionKey = payload.sectionPhotos?.[section.key] ? section.key : section.id;
  const extraExpensePhotos = payload.sectionPhotos?.[section.key] || payload.sectionPhotos?.[section.id] || [];
  const extraExpenseMetas = payload.photoMetadata?.[expenseSectionKey] || [];

  const groupedPhotos: string[] = [];
  const groupedCaptions: ReportPhotoMeta[] = [];
  const groups: PhotoGroup[] = [];

  const rows = payload.expenses.map((expense) => {
    const itemName = isNonEmptyString(expense.itemName) ? expense.itemName.trim() : "-";
    const description = isNonEmptyString(expense.description) ? expense.description.trim() : "-";
    const photos = collectExpensePhotos(expense).map((photo) => optimizeStorageImageUrl(photo, IMAGE_PRESETS.grid.width, IMAGE_PRESETS.grid.quality));
    const thumb = photos[0];

    if (photos.length > 0) {
      const startIndex = groupedPhotos.length;
      groupedPhotos.push(...photos);
      groupedCaptions.push(...photos.map((_, index) => ({ caption: `${itemName} — Foto ${index + 1}` })));
      groups.push({
        id: expense.id,
        caption: `Registro fotográfico — ${itemName}`,
        photoIds: photos.map((_, index) => String(startIndex + index)),
      });
    }

    return `
      <tr>
        <td>${escapeHtml(itemName)}</td>
        <td>${escapeHtml(description)}</td>
        <td>
          ${thumb ? `<img class="expense-thumb" src="${escapeHtml(optimizeStorageImageUrl(thumb, IMAGE_PRESETS.expenseThumb.width, IMAGE_PRESETS.expenseThumb.quality))}" alt="${escapeHtml(itemName)}" loading="eager" decoding="sync" />` : `<span class="empty-state">Sem foto</span>`}
        </td>
      </tr>
    `;
  }).join("");

  renderedPhotoKeys.add(section.key);
  renderedPhotoKeys.add(section.id);

  return `
    <section class="section">
      <h2 class="section-title">${escapeHtml(section.title)}</h2>
      <div class="table-wrap">
        <table class="expense-table">
          <thead>
            <tr>
              <th>Item de Despesa</th>
              <th>Descrição de Uso</th>
              <th>Registro Fotográfico</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
      ${groupedPhotos.length > 0 ? `
        <div class="expense-photos-section">
          <h3 class="section-title expense-photos-title">REGISTROS FOTOGRÁFICOS – COMPROVAÇÃO DA EXECUÇÃO DOS ITENS DE DESPESA</h3>
          ${groups.map((group) => {
            const groupItems = uniqueStrings(group.photoIds.map((id) => {
              const index = Number(id);
              if (Number.isNaN(index) || index < 0 || index >= normalizePhotoItems(groupedPhotos, groupedCaptions).length) return "";
              return String(index);
            }))
              .map((value) => normalizePhotoItems(groupedPhotos, groupedCaptions)[Number(value)])
              .filter(Boolean);
            if (groupItems.length === 0) return "";
            return `
              <div class="expense-photo-group">
                <h4 class="photo-group-title">${escapeHtml(group.caption)}</h4>
                ${renderPhotoGrid(groupItems)}
              </div>
            `;
          }).join("")}
        </div>
      ` : ""}
    </section>
    ${extraExpensePhotos.length > 0 ? renderGroupedPhotoBlocks(
      extraExpensePhotos,
      extraExpenseMetas,
      [],
      groupedPhotos.length > 0 ? "REGISTROS FOTOGRÁFICOS – COMPROVAÇÃO DA EXECUÇÃO DOS ITENS DE DESPESA (COMPLEMENTARES)" : "REGISTROS FOTOGRÁFICOS – COMPROVAÇÃO DA EXECUÇÃO DOS ITENS DE DESPESA",
    ) : ""}
  `;
}

function buildHeaderHtml(config: VisualConfig = {}): string {
  const showBanner = isNonEmptyString(config.headerBannerUrl) && config.headerBannerVisible !== false;
  const bannerFit = config.headerBannerFit === "fill" ? "fill" : config.headerBannerFit === "cover" ? "cover" : "contain";
  const primaryLogoVisible = isNonEmptyString(config.logo) && config.logoConfig?.visible !== false;
  const centerLogoVisible = isNonEmptyString(config.logoCenter) && config.logoCenterConfig?.visible !== false;
  const secondaryLogoVisible = isNonEmptyString(config.logoSecondary) && config.logoSecondaryConfig?.visible !== false;
  const rawHeight = typeof config.headerBannerHeightMm === "number" && Number.isFinite(config.headerBannerHeightMm)
    ? config.headerBannerHeightMm
    : 25;
  const headerHeightMm = Math.max(15, Math.min(80, rawHeight));

  if (showBanner) {
    const bannerUrl = optimizeStorageImageUrl(config.headerBannerUrl!.trim(), IMAGE_PRESETS.banner.width, IMAGE_PRESETS.banner.quality);
    return `
      <div style="width:100%;height:${headerHeightMm}mm;display:flex;align-items:center;justify-content:center;">
        <img src="${escapeHtml(bannerUrl)}" alt="Cabeçalho institucional" style="max-width:100%;height:${headerHeightMm}mm;max-height:${headerHeightMm}mm;display:block;object-fit:${bannerFit};" />
      </div>
    `;
  }

  const logoUrl = primaryLogoVisible ? optimizeStorageImageUrl(config.logo!.trim(), IMAGE_PRESETS.headerLogo.width, IMAGE_PRESETS.headerLogo.quality) : "";
  const centerUrl = centerLogoVisible ? optimizeStorageImageUrl(config.logoCenter!.trim(), IMAGE_PRESETS.headerLogo.width, IMAGE_PRESETS.headerLogo.quality) : "";
  const secUrl = secondaryLogoVisible ? optimizeStorageImageUrl(config.logoSecondary!.trim(), IMAGE_PRESETS.headerLogo.width, IMAGE_PRESETS.headerLogo.quality) : "";

  return `
    <div style="width:100%;display:flex;align-items:center;justify-content:space-between;gap:8mm;height:${headerHeightMm}mm;">
      <div style="flex:1;display:flex;align-items:center;justify-content:flex-start;gap:3mm;min-width:0;">
        ${primaryLogoVisible ? `<img src="${escapeHtml(logoUrl)}" alt="Logo principal" style="max-height:${headerHeightMm}mm;max-width:100%;object-fit:contain;display:block;" />` : ""}
        ${isNonEmptyString(config.headerLeftText) ? `<span style="font-size:8pt;line-height:1.2;color:#374151;word-break:break-word;">${escapeHtml(config.headerLeftText.trim())}</span>` : ""}
      </div>
      <div style="flex:1;display:flex;align-items:center;justify-content:center;min-width:0;">
        ${centerLogoVisible ? `<img src="${escapeHtml(centerUrl)}" alt="Logo central" style="max-height:${headerHeightMm}mm;max-width:100%;object-fit:contain;display:block;" />` : ""}
      </div>
      <div style="flex:1;display:flex;align-items:center;justify-content:flex-end;gap:3mm;min-width:0;">
        ${isNonEmptyString(config.headerRightText) ? `<span style="font-size:8pt;line-height:1.2;color:#374151;word-break:break-word;text-align:right;">${escapeHtml(config.headerRightText.trim())}</span>` : ""}
        ${secondaryLogoVisible ? `<img src="${escapeHtml(secUrl)}" alt="Logo secundário" style="max-height:${headerHeightMm}mm;max-width:100%;object-fit:contain;display:block;" />` : ""}
      </div>
    </div>
  `;
}

function resolveHeaderHeightMm(config: VisualConfig = {}): number {
  const raw = typeof config.headerBannerHeightMm === "number" && Number.isFinite(config.headerBannerHeightMm)
    ? config.headerBannerHeightMm
    : 25;
  return Math.max(15, Math.min(80, raw));
}

function renderHeaderSlot(config: VisualConfig = {}): string {
  const h = resolveHeaderHeightMm(config);
  return `<div class="report-header-slot" style="height:${h}mm;border-bottom:0.5pt solid #CCCCCC;padding-bottom:2mm;margin-bottom:10mm;display:flex;align-items:center;">${buildHeaderHtml(config)}</div>`;
}

function buildFooterHtml(config: VisualConfig = {}): string {
  if (config.footerInstitutionalEnabled === false) return "";
  return `
    <div style="font-family:'Times New Roman',serif;color:#4b5563;font-size:8.5pt;line-height:1.25;text-align:center;">
      <div style="font-weight:bold;">${escapeHtml(config.footerLine1Text || CEAP_FOOTER.line1)}</div>
      <div>${escapeHtml(config.footerLine2Text || CEAP_FOOTER.line2)}</div>
      <div>${escapeHtml(config.footerLine3Text || CEAP_FOOTER.line3)}</div>
    </div>
  `;
}

function buildCoverHtml(payload: ReportPayload): string {
  const vc = payload.visualConfig || {};
  const coverLogoSrc = vc.coverLogo || vc.logo || "";
  const coverTitle = vc.coverTitle || "RELATÓRIO DE CUMPRIMENTO DO OBJETO";
  const coverSubtitle = vc.coverSubtitle || "";
  const projectName = payload.project.name;
  const fomentoNumber = payload.project.fomentoNumber || "";
  const orgName = payload.project.organizationName || "";

  const logoHtml = isNonEmptyString(coverLogoSrc)
    ? `<img src="${escapeHtml(optimizeStorageImageUrl(coverLogoSrc.trim(), IMAGE_PRESETS.coverLogo.width, IMAGE_PRESETS.coverLogo.quality))}" class="cover-logo" alt="Logo" loading="eager" decoding="sync" />`
    : "";

  const subtitleHtml = !vc.coverHideSubtitle && isNonEmptyString(coverSubtitle)
    ? `<p class="cover-subtitle">${escapeHtml(coverSubtitle)}</p>`
    : "";

  const fomentoHtml = !vc.coverHideFomento && isNonEmptyString(fomentoNumber)
    ? `<p class="cover-meta">Termo de Fomento nº ${escapeHtml(fomentoNumber)}</p>`
    : "";

  const orgHtml = !vc.coverHideOrg && isNonEmptyString(orgName)
    ? `<p class="cover-meta strong">${escapeHtml(orgName)}</p>`
    : "";

  // Cover page footer is now rendered globally via Puppeteer footerTemplate
  const coverFooterHtml = "";

  return `
    <div class="cover">
      ${renderHeaderSlot(vc)}
      <div class="cover-body">
        ${logoHtml}
        <p class="cover-eyebrow">RELATÓRIO INSTITUCIONAL</p>
        <h1 class="cover-title">${escapeHtml(coverTitle)}</h1>
        ${subtitleHtml}
        <p class="cover-project-name">${escapeHtml(projectName)}</p>
        ${fomentoHtml}
        ${orgHtml}
      </div>
    </div>
  `;
}

function buildLinksSection(payload: ReportPayload, section: ReportSection): string {
  const links = {
    attendance: normalizeLinkTargets(payload.links.attendance),
    registration: normalizeLinkTargets(payload.links.registration),
    media: normalizeLinkTargets(payload.links.media, payload.selectedVideoUrls || []),
  };

  if (!Object.values(links).some((targets) => targets.length > 0)) return "";

  const rows: string[] = [];
  if (links.attendance[0]) {
    rows.push(`<li><span class="link-label">Lista de Presença:</span> <a href="${escapeHtml(links.attendance[0])}">${escapeHtml(resolveLinkDisplayName("attendance", payload.linkDisplayNames?.attendance))}</a></li>`);
  }
  if (links.registration[0]) {
    rows.push(`<li><span class="link-label">Lista de Inscrição:</span> <a href="${escapeHtml(links.registration[0])}">${escapeHtml(resolveLinkDisplayName("registration", payload.linkDisplayNames?.registration))}</a></li>`);
  }
  links.media.forEach((url, index) => {
    rows.push(`<li><span class="link-label">Mídia ${index + 1}:</span> <a href="${escapeHtml(url)}">${escapeHtml(resolveLinkDisplayName("media", payload.linkDisplayNames?.media, index))}</a></li>`);
  });

  return `
    <section class="section">
      <h2 class="section-title">${escapeHtml(section.title)}</h2>
      <ul class="link-list">${rows.join("")}</ul>
    </section>
  `;
}

function formatGoalTitle(idx: number, title: string | undefined | null): string {
  const t = (title ?? "").trim();
  if (!t) return `META ${idx + 1}`;
  if (/^meta\s*\d+/i.test(t)) return t;
  return `META ${idx + 1}: ${t}`;
}

function extractGoalDescription(title: string | undefined | null): string {
  const t = (title ?? "").trim();
  return t.replace(/^meta\s*\d+\s*[:\-–]?\s*/i, "").trim();
}

function formatGoalPhotoTitle(
  idx: number,
  title: string | undefined | null,
  override?: { description?: string; hide?: boolean },
): string {
  const prefix = `REGISTROS FOTOGRÁFICOS – META ${idx + 1}`;
  if (override?.hide) return prefix;
  const desc = override?.description !== undefined
    ? override.description.trim()
    : extractGoalDescription(title);
  return desc ? `${prefix}: ${desc}` : prefix;
}

function buildGoalSections(payload: ReportPayload, renderedPhotoKeys: Set<string>): string {
  const activeActivities = getActiveActivities(payload.activities);
  return payload.project.goals.map((goal, idx) => {
    const goalActivities = activeActivities
      .filter((activity) => activity.goalId === goal.id)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const photos = [
      ...(payload.goalPhotos[goal.id] || []),
      ...goalActivities.flatMap((activity) => activity.photos || []),
    ];
    const metas = payload.photoMetadata?.[goal.id] || [];
    renderedPhotoKeys.add(goal.id);
    const displayTitle = formatGoalTitle(idx, goal.title);
    const photoTitle = formatGoalPhotoTitle(idx, goal.title, payload.goalTitleOverrides?.[goal.id]);

    const hasNarrative = isNonEmptyString(payload.goalNarratives[goal.id]);
    const hideActs = !!payload.hideActivitiesBySection?.[goal.id];
    return `
      <div class="goal-block">
        <h3 class="subsection-title">${escapeHtml(displayTitle)}</h3>
        ${renderRichContent(payload.goalNarratives[goal.id], "[Descreva as realizações da meta]")}
        ${hideActs ? "" : renderPlainActivityList(goalActivities, { hideDescription: hasNarrative })}
        ${photos.length > 0 ? renderGroupedPhotoBlocks(
          photos,
          metas,
          payload.sectionPhotoGroups?.[goal.id] || [],
          photoTitle,
        ) : ""}
      </div>
    `;
  }).join("");
}

function buildStandardSection(payload: ReportPayload, section: ReportSection, renderedPhotoKeys: Set<string>): string {
  const activeActivities = getActiveActivities(payload.activities);

  if (section.key === "goals") {
    return `
      <section class="section">
        <h2 class="section-title">${escapeHtml(section.title)}</h2>
        ${buildGoalSections(payload, renderedPhotoKeys)}
      </section>
    `;
  }

  if (section.key === "other") {
    const activities = activeActivities
      .filter((activity) => ["Outras Ações", "Administrativo/Financeiro", "Ocorrência/Imprevisto"].includes(activity.type || ""))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const photos = [...payload.otherActionsPhotos, ...activities.flatMap((activity) => activity.photos || [])];
    renderedPhotoKeys.add("other");

    return `
      <section class="section">
        <h2 class="section-title">${escapeHtml(section.title)}</h2>
        ${renderRichContent(payload.otherActionsNarrative, "[Outras informações sobre as ações desenvolvidas]")}
        ${renderPlainActivityList(activities, { hideDescription: isNonEmptyString(payload.otherActionsNarrative) })}
      </section>
      ${photos.length > 0 ? renderGroupedPhotoBlocks(
        photos,
        payload.photoMetadata?.other || [],
        payload.sectionPhotoGroups?.other || [],
        "REGISTROS FOTOGRÁFICOS – OUTRAS AÇÕES",
      ) : ""}
    `;
  }

  if (section.key === "communication") {
    const activities = activeActivities
      .filter((activity) => activity.type === "Divulgação/Mídia")
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const photos = [...payload.communicationPhotos, ...activities.flatMap((activity) => activity.photos || [])];
    renderedPhotoKeys.add("communication");

    return `
      <section class="section">
        <h2 class="section-title">${escapeHtml(section.title)}</h2>
        ${renderRichContent(payload.communicationNarrative, "[Publicações e ações de divulgação]")}
        ${renderPlainActivityList(activities, { hideDescription: isNonEmptyString(payload.communicationNarrative) })}
      </section>
      ${photos.length > 0 ? renderGroupedPhotoBlocks(
        photos,
        payload.photoMetadata?.communication || [],
        payload.sectionPhotoGroups?.communication || [],
        "REGISTROS FOTOGRÁFICOS – PUBLICAÇÕES E DIVULGAÇÃO",
      ) : ""}
    `;
  }

  if (section.key === "object") {
    return `
      <section class="section">
        <h2 class="section-title">${escapeHtml(section.title)}</h2>
        ${renderRichContent(payload.objectText, "[Descrição do objeto]")}
      </section>
    `;
  }

  if (section.key === "summary") {
    return `
      <section class="section">
        <h2 class="section-title">${escapeHtml(section.title)}</h2>
        ${renderRichContent(payload.summary, "[Resumo das atividades]")}
      </section>
    `;
  }

  if (section.key === "satisfaction") {
    return `
      <section class="section">
        <h2 class="section-title">${escapeHtml(section.title)}</h2>
        ${renderRichContent(payload.satisfaction, "[Grau de satisfação do público-alvo]")}
      </section>
    `;
  }

  if (section.key === "future") {
    return `
      <section class="section">
        <h2 class="section-title">${escapeHtml(section.title)}</h2>
        ${renderRichContent(payload.futureActions, "[Sobre as ações futuras]")}
      </section>
    `;
  }

  if (section.key === "links") {
    return buildLinksSection(payload, section);
  }

  if (section.type === "custom") {
    return `
      <section class="section">
        <h2 class="section-title">${escapeHtml(section.title)}</h2>
        ${renderRichContent(section.content, "")}
      </section>
    `;
  }

  return "";
}

function buildTocHtml(sections: ReportSection[]): string {
  const visibleSections = sections.filter((s) => s.isVisible);
  if (visibleSections.length === 0) return "";

  const items = visibleSections.map((s, idx) => {
    const num = idx + 1;
    return `<li class="toc-item"><span class="toc-text">${num}. ${escapeHtml(s.title)}</span><span class="toc-dots"></span></li>`;
  }).join("");

  return `
    <section class="toc-section">
      <h2 class="toc-title">SUMÁRIO</h2>
      <ol class="toc-list">${items}</ol>
    </section>
  `;
}

function buildHtml(payload: ReportPayload): string {
  const renderedPhotoKeys = new Set<string>();
  const sectionPhotos = payload.sectionPhotos || {};
  const photoMetadata = payload.photoMetadata || {};
  const photoGroups = payload.sectionPhotoGroups || {};

  const sectionsHtml = payload.sections
    .filter((section) => section.isVisible)
    .map((section) => {
      let sectionHtml = "";

      if (section.key === "expenses") {
        sectionHtml = renderExpensesSection(payload, renderedPhotoKeys, section);
      } else {
        sectionHtml = buildStandardSection(payload, section, renderedPhotoKeys);
      }

      const secPhotos = sectionPhotos[section.key] || sectionPhotos[section.id] || [];
      const secKey = sectionPhotos[section.key] ? section.key : section.id;
      if (secPhotos.length > 0 && !renderedPhotoKeys.has(secKey)) {
        sectionHtml += renderGroupedPhotoBlocks(
          secPhotos,
          photoMetadata[secKey] || [],
          photoGroups[secKey] || [],
          `REGISTROS FOTOGRÁFICOS – ${section.title}`,
        );
        renderedPhotoKeys.add(secKey);
      }

      return sectionHtml;
    })
    .join("");

  const signatureHtml = `
    <section class="signature-section">
      <p class="signature-date">Rio de Janeiro, ${escapeHtml(formatLongDate())}.</p>
      <div class="signature-line"></div>
      <p class="signature-label">Assinatura do Responsável</p>
      <p class="signature-name">${escapeHtml(payload.project.organizationName)}</p>
    </section>
  `;

  // Generate extraction timestamp for audit trail
  const extractionTimestamp = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date());

  return `<!DOCTYPE html>
  <html lang="pt-BR">
    <head>
      <meta charset="UTF-8" />
      <style>
        /* ─── Page: ABNT size only — margins handled by Puppeteer ─── */
        @page {
          size: A4;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }

        /* ─── PDF LAYOUT TABLE: thead/tfoot repeat on every page ─── */
        .pdf-layout { width: 100%; border-collapse: collapse; }
        .pdf-layout thead { display: table-header-group; }
        .pdf-layout tfoot { display: table-footer-group; }
        .pdf-layout td { padding: 0; border: none; vertical-align: top; }
        .pdf-header-cell { padding-bottom: 12mm; border-bottom: none; }
        .pdf-footer-cell { padding-top: 2mm; border-top: 1px solid #9ca3af; }
        html, body {
          margin: 0; padding: 0;
          font-family: "Times New Roman", Times, serif;
          font-size: 12pt;
          line-height: 1.55;
          color: #111827;
          background: #fff;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .pdf-body-row {
          display: table-row-group;
        }
        .pdf-body-cell {
          display: table-cell;
          vertical-align: top;
        }

        .header-banner-wrap,
        .header-logos {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }

        .header-banner {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: contain;
        }

        .header-slot {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }
        .header-slot-center { justify-content: center; }
        .header-slot-right  { justify-content: flex-end; }

        .header-logo {
          max-width: 100%;
          object-fit: contain;
          display: block;
        }

        .header-text {
          font-size: 9pt;
          line-height: 1.25;
          color: #374151;
          word-break: break-word;
        }

        /* ─── CONTENT ─── */
        .pdf-body-cell { padding: 0; }

        /* ─── COVER ─── */
        .cover {
          min-height: 260mm;
          display: flex;
          flex-direction: column;
          break-after: page;
          page-break-after: always;
        }
        .cover-header {
          border-bottom: 0.5pt solid #000000;
          padding-bottom: 4mm;
          display: flex;
          align-items: center;
        }
        .cover-body {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 10mm 0;
        }
        .cover-logo { max-width: 70mm; max-height: 50mm; object-fit: contain; display: block; margin: 0 auto 14mm; }
        .cover-eyebrow { margin: 0 0 6mm; font-size: 11pt; letter-spacing: 0.08em; text-transform: uppercase; color: #4b5563; }
        .cover-title { margin: 0 0 8mm; font-size: 22pt; line-height: 1.25; text-transform: uppercase; overflow-wrap: break-word; word-break: normal; font-weight: 700; }
        .cover-subtitle, .cover-meta, .cover-project-name { margin: 0 0 6mm; word-break: break-word; }
        .cover-project-name { font-size: 16pt; font-weight: 700; }
        .cover-meta.strong { font-weight: 700; }

        /* ─── SECTIONS ─── */
        .section { margin: 0 0 10mm; }

        /* Smart typography: prevent orphans/widows */
        p, li { orphans: 3; widows: 3; }

        .section-title, .subsection-title, .photo-group-title,
        h1, h2, h3 {
          font-weight: 700;
          overflow-wrap: anywhere;
          word-break: break-word;
          break-after: avoid;
          page-break-after: avoid;
          break-inside: avoid;
          page-break-inside: avoid;
          margin: 0 0 5mm;
        }

        .section-title {
          font-size: 14pt;
          text-transform: uppercase;
          border-bottom: 0.5pt solid #000000;
          padding-bottom: 4px;
          margin-bottom: 8px;
        }
        .subsection-title { font-size: 12.5pt; border-bottom: none; padding-bottom: 0; margin-left: 0; }
        .photo-group-title { font-size: 12pt; }

        .body-copy, .section p, .section li, .activity-description {
          text-align: justify;
          overflow-wrap: anywhere;
          word-break: break-word;
        }
        .body-copy { margin: 0 0 4mm; text-indent: 12.5mm; }
        .section p { text-indent: 12.5mm; margin: 0 0 4mm; }
        .section p.subheading,
        .section p.cover-eyebrow,
        .section p.cover-meta,
        .section p.cover-project-name,
        .section p.cover-subtitle,
        .section p.signature-date,
        .section p.signature-label,
        .section p.signature-name,
        .section li p,
        .section .photo-group-title,
        .section .caption p,
        .section .activity-meta p,
        .toc-section p,
        .cover p,
        .institutional-footer p,
        .audit-footer p { text-indent: 0; }

        /* Rich-text list styles from editor */
        .section ul, .section ol { display: block; list-style-position: outside; margin: 0 0 4mm; padding-left: 12.5mm; }
        .section ul { list-style-type: disc; }
        .section ul ul { list-style-type: circle; }
        .section ul ul ul { list-style-type: square; }
        .section ol { list-style-type: decimal; }
        .section li { display: list-item; margin: 0 0 2mm; line-height: 1.5; text-align: justify; overflow-wrap: anywhere; word-break: break-word; }
        .section li p { text-indent: 0; margin: 0; }

        .activity-list { margin-top: 5mm; }
        .subheading { margin: 0 0 3mm; font-weight: 700; }
        .activity-bullets { margin: 0; padding-left: 6mm; list-style: disc; }
        .activity-item { margin: 0 0 4mm; break-inside: avoid; page-break-inside: avoid; }
        .activity-meta { margin-bottom: 2mm; }
        .activity-description { margin: 0; }
        .goal-block { margin-bottom: 10mm; }

        /* ─── TABLES ─── */
        .table-wrap {
          border: 1px solid #374151;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 8mm;
        }

        .expense-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
        }
        .expense-table thead { display: table-header-group; }
        .expense-table tr {
          break-inside: avoid;
          page-break-inside: avoid;
        }
        .expense-table th, .expense-table td {
          border: 1px solid #9ca3af;
          padding: 6px 8px;
          vertical-align: top;
          overflow-wrap: anywhere;
          word-break: break-word;
          font-size: 11pt;
          line-height: 1.4;
        }
        .expense-table th {
          background: #e5e7eb;
          font-size: 11pt;
          font-weight: 700;
          text-align: center;
          text-transform: uppercase;
          letter-spacing: 0.02em;
          padding: 8px 10px;
          color: #111827;
        }
        .expense-table td:nth-child(1) { width: 22%; }
        .expense-table td:nth-child(2) { width: 48%; }
        .expense-table td:nth-child(3) { width: 30%; text-align: center; }

        .expense-thumb {
          width: 100%;
          max-height: 100px;
          object-fit: cover;
          border-radius: 4px;
          display: block;
          margin: 0 auto;
          background: #f3f4f6;
        }

        .empty-state {
          display: inline-block;
          font-style: italic;
          color: #6b7280;
          padding-top: 10px;
        }

        /* ─── EXPENSE PHOTOS SECTION ─── */
        .expense-photos-section {
          margin-top: 10mm;
        }
        .expense-photos-title {
          margin-bottom: 6mm;
        }
        .expense-photo-group {
          margin-bottom: 8mm;
          break-inside: avoid;
          page-break-inside: avoid;
        }

        /* ─── PHOTOS ─── */
        .photo-section { margin-bottom: 10mm; }
        .photo-block { margin-bottom: 8mm; }
        .photo-group { margin-bottom: 8mm; }

        .photo-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }
        .single-photo-grid {
          grid-template-columns: 1fr;
          max-width: 85mm;
        }

        .photo-item {
          margin: 0;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          overflow: hidden;
          background: #fff;
          break-inside: avoid;
          page-break-inside: avoid;
        }
        .photo-item img {
          display: block;
          width: 100%;
          height: 280px;
          object-fit: contain;
          object-position: center;
          background: #f8f8f8;
        }
        .rich-photo-item img { height: 280px; object-fit: contain; }

        .caption {
          padding: 6px 8px;
          font-size: 10pt;
          line-height: 1.3;
          word-break: break-word;
          color: #374151;
          text-align: center;
          font-style: italic;
        }

        /* ─── SIGNATURE ─── */
        .signature-section { margin-top: 18mm; break-inside: avoid; page-break-inside: avoid; }
        .signature-date { margin: 0 0 18mm; }
        .signature-line { width: 78mm; border-top: 1px solid #111827; margin: 0 0 3mm; }
        .signature-label, .signature-name { margin: 0 0 2mm; }

        /* ─── FOOTER ─── */
        .institutional-footer {
          margin-top: 14mm; padding-top: 6mm;
          border-top: 1px solid #d1d5db;
          text-align: center; font-size: 9pt; line-height: 1.3; color: #4b5563;
        }
        .institutional-footer p { margin: 0 0 2mm; }

        /* ─── AUDIT FOOTER ─── */
        .audit-footer {
          margin-top: 10mm; padding-top: 4mm;
          border-top: 1px solid #e5e7eb;
          font-size: 7pt; color: #9ca3af; text-align: right;
          break-inside: avoid; page-break-inside: avoid;
        }

        /* ─── LINKS ─── */
        .link-list { margin: 0; padding-left: 6mm; }
        .link-list li { margin: 0 0 3mm; word-break: break-word; }
        .link-label { font-weight: 700; }
        a { color: #111827; text-decoration: underline; }

        /* ─── Inline images in rich text ─── */
        img { max-width: 100%; height: auto; }

        /* ─── TABLE OF CONTENTS ─── */
        .toc-section {
          break-after: page;
          page-break-after: always;
        }
        .toc-title {
          font-size: 16pt;
          font-weight: 700;
          text-transform: uppercase;
          text-align: center;
          margin: 0 0 10mm;
        }
        .toc-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .toc-item {
          display: flex;
          align-items: baseline;
          margin: 0 0 4mm;
          font-size: 12pt;
          line-height: 1.8;
        }
        .toc-text {
          white-space: nowrap;
          flex-shrink: 0;
        }
        .toc-dots {
          flex: 1;
          border-bottom: 1px dotted #9ca3af;
          margin: 0 3mm;
          min-width: 10mm;
        }
      </style>
    </head>
    <body>
      ${buildCoverHtml(payload)}
      <table class="pdf-layout">
        <thead>
          <tr><td class="pdf-header-cell">${buildHeaderHtml(payload.visualConfig)}</td></tr>
        </thead>
        <tbody>
          <tr><td>
            ${buildTocHtml(payload.sections)}
            ${sectionsHtml}
            ${signatureHtml}
            <div class="audit-footer">
              Documento gerado em ${extractionTimestamp} (Brasília) · ID: <span id="doc-hash"></span>
            </div>
          </td></tr>
        </tbody>
      </table>
      <script>
        // 1. Force eager loading on all images
        (function() {
          var imgs = [].slice.call(document.querySelectorAll('img'));
          imgs.forEach(function(img) {
            img.loading = 'eager';
            img.decoding = 'sync';
            img.onerror = function() { this.style.background = '#f3f4f6'; this.alt = '[Imagem indisponível]'; };
          });
        })();

        // 2. Generate SHA-256 hash of document content for audit integrity
        (async function() {
          try {
            var content = document.querySelector('.pdf-layout tbody').innerText;
            var encoder = new TextEncoder();
            var data = encoder.encode(content);
            var hashBuffer = await crypto.subtle.digest('SHA-256', data);
            var hashArray = Array.from(new Uint8Array(hashBuffer));
            var hashHex = hashArray.map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');
            var el = document.getElementById('doc-hash');
            if (el) el.textContent = hashHex.substring(0, 16).toUpperCase();
          } catch(e) { /* hash generation failed silently */ }
        })();

        // 3. Signal readiness when all images loaded
        window.__imagesReady = new Promise(function(resolve) {
          var imgs = [].slice.call(document.querySelectorAll('img'));
          if (imgs.length === 0) { resolve(true); return; }
          var loaded = 0;
          var total = imgs.length;
          function check() { loaded++; if (loaded >= total) resolve(true); }
          imgs.forEach(function(img) {
            if (img.complete && img.naturalWidth > 0) { check(); return; }
            img.addEventListener('load', check);
            img.addEventListener('error', check);
          });
          // Safety timeout: resolve after 8s regardless
          setTimeout(function() { resolve(true); }, 8000);
        });
        window.__imagesReady.then(function() { window.__imagesReady = true; });
      </script>
    </body>
  </html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth validation
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await req.json() as ReportPayload;
    let html = buildHtml(payload);

    const browserlessApiKey = Deno.env.get("BROWSERLESS_API_KEY");
    if (!browserlessApiKey) {
      return new Response(JSON.stringify({ error: "BROWSERLESS_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`HTML size: ${(html.length / 1024).toFixed(1)}KB`);

    let browserlessResponse: Response;
    try {
      const controller = new AbortController();
      const abortTimer = setTimeout(() => controller.abort(), 55000);

      browserlessResponse = await fetch(
        `https://chrome.browserless.io/pdf?token=${browserlessApiKey}&timeout=45000&bestAttempt=true`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            html,
            bestAttempt: true,
            gotoOptions: {
              waitUntil: "networkidle0",
              timeout: 40000,
            },
            waitForFunction: {
              fn: "() => window.__imagesReady === true",
              timeout: 12000,
            },
            options: (() => {
              const preset = payload.visualConfig?.pageMarginPreset === "custom" ? "custom" : "abnt";
              const margins = preset === "custom"
                ? { top: "12mm", bottom: "20mm", left: "15mm", right: "15mm" }
                : { top: "15mm", bottom: "22mm", left: "30mm", right: "20mm" };
              const vc = payload.visualConfig || {};
              const footerEnabled = vc.footerInstitutionalEnabled !== false;
              const escFt = (s: string) => String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]!));
              const l1 = escFt(vc.footerLine1Text || CEAP_FOOTER.line1);
              const l2 = escFt(vc.footerLine2Text || CEAP_FOOTER.line2);
              const l3 = escFt(vc.footerLine3Text || CEAP_FOOTER.line3);
              const instBlock = footerEnabled
                ? `<div style="text-align:center;font-family:'Times New Roman',serif;color:#4b5563;line-height:1.25;"><div style="font-weight:bold;font-size:8.5pt;">${l1}</div><div style="font-size:7.5pt;">${l2}</div><div style="font-size:7.5pt;">${l3}</div></div>`
                : "";
              const footerTpl = `<div style="width:100%;font-size:8pt;padding:0 15mm;-webkit-print-color-adjust:exact;">${instBlock}<div style="text-align:right;font-size:10pt;font-family:'Times New Roman',serif;margin-top:1mm;"><span class="pageNumber"></span></div></div>`;
              return {
                format: "A4",
                printBackground: true,
                timeout: 50000,
                preferCSSPageSize: false,
                displayHeaderFooter: true,
                margin: margins,
                headerTemplate: '<span></span>',
                footerTemplate: footerTpl,
              };
            })(),
          }),
        },
      );

      clearTimeout(abortTimer);
    } catch (fetchErr) {
      console.error("Browserless fetch failed:", fetchErr);
      return new Response(JSON.stringify({ error: `Browserless fetch failed: ${fetchErr instanceof Error ? fetchErr.message : String(fetchErr)}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!browserlessResponse.ok) {
      const errorText = await browserlessResponse.text();
      console.error("Browserless error:", browserlessResponse.status, errorText);
      return new Response(JSON.stringify({ error: `Browserless ${browserlessResponse.status}: ${errorText}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Browserless OK, reading PDF buffer...");
    const rawPdfBuffer = await browserlessResponse.arrayBuffer();
    console.log(`Raw PDF size: ${(rawPdfBuffer.byteLength / 1024).toFixed(1)}KB`);

    // Post-processing: fix page numbering using pdf-lib
    // Reference format: cover has NO number, content pages start at "1"
    // Puppeteer numbers all pages starting at 1, so we redraw with offset
    let pdfBuffer: ArrayBuffer;
    try {
      const pdfDoc = await PDFDocument.load(rawPdfBuffer);
      const timesFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
      const pages = pdfDoc.getPages();

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const { width } = page.getSize();

        // Draw white rectangle over Puppeteer's page number on ALL pages
        // The number sits in the bottom-right margin area
        page.drawRectangle({
          x: width - 70,
          y: 12,
          width: 60,
          height: 24,
          color: rgb(1, 1, 1),
        });

        // Redraw correct number on content pages (skip cover = page 0)
        if (i > 0) {
          const pageNum = String(i); // page 1 of content = "1", page 2 = "2", etc.
          const textWidth = timesFont.widthOfTextAtSize(pageNum, 10);
          // Position: right-aligned at ~20mm (56.7pt) from right edge
          page.drawText(pageNum, {
            x: width - 56.7 - textWidth / 2,
            y: 20,
            size: 10,
            font: timesFont,
            color: rgb(0, 0, 0),
          });
        }
      }
      const finalPdfBytes = await pdfDoc.save();
      pdfBuffer = finalPdfBytes.buffer;
      console.log(`Final PDF size: ${(pdfBuffer.byteLength / 1024).toFixed(1)}KB`);
    } catch (pdfLibErr) {
      console.error("pdf-lib post-processing failed, using raw PDF:", pdfLibErr);
      pdfBuffer = rawPdfBuffer;
    }

    const safeFilename = encodeURIComponent(`Relatorio_${(payload.project?.name || "Projeto").replace(/\s+/g, "_")}.pdf`);

    return new Response(pdfBuffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename*=UTF-8''${safeFilename}`,
      },
    });
  } catch (error) {
    console.error("export-object-report-pdf error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
