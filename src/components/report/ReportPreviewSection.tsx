import React from 'react';
import { ReportSection, Activity, Goal, ExpenseItem, ReportPhotoMeta } from '@/types';
import { PhotoGallerySection } from '@/components/report/PhotoGallerySection';
import { INDENT } from '@/lib/previewConstants';

// Renders rich-text HTML content safely (from Tiptap editor)
const RichContent: React.FC<{ html: string; className?: string; style?: React.CSSProperties }> = ({ html, className, style }) => {
  if (!html || (!html.includes('<') && !html.includes('&'))) {
    return <div className={className} style={style}>{html}</div>;
  }

  // Parse gallery and inline-image nodes so they render in preview
  const parts: React.ReactNode[] = [];
  const temp = document.createElement('div');
  temp.innerHTML = html;

  temp.childNodes.forEach((node, idx) => {
    if (node instanceof HTMLElement) {
      // Gallery node
      if (node.hasAttribute('data-gallery') || node.getAttribute('data-gallery') !== null) {
        try {
          const images: Array<{ src: string; caption: string }> = JSON.parse(node.getAttribute('data-images') || '[]');
          const columns = parseInt(node.getAttribute('data-columns') || '2', 10);
          if (images.length > 0) {
            parts.push(
              <div key={`gallery-${idx}`} className="my-4 grid gap-3" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
                {images.map((img, i) => (
                  <div key={i}>
                    <img src={img.src} alt={img.caption || `Imagem ${i + 1}`} className="rounded-md w-full h-auto object-contain" />
                    {img.caption && <p className="text-xs text-muted-foreground italic mt-1 text-center">{img.caption}</p>}
                  </div>
                ))}
              </div>
            );
            return;
          }
        } catch { /* fall through */ }
      }

      // Inline image with custom caption/width
      if (node.tagName === 'IMG') {
        const src = node.getAttribute('src') || '';
        const caption = node.getAttribute('data-caption') || '';
        const widthPct = parseInt(node.getAttribute('data-width') || '100', 10);
        parts.push(
          <div key={`img-${idx}`} className="my-3 text-center">
            <img src={src} alt={caption || 'Imagem'} style={{ width: `${widthPct}%`, margin: '0 auto' }} className="rounded-md max-w-full block mx-auto" />
            {caption && <p className="text-xs text-muted-foreground italic mt-1">{caption}</p>}
          </div>
        );
        return;
      }
    }

    // Default: render as HTML
    const wrapper = document.createElement('div');
    wrapper.appendChild(node.cloneNode(true));
    parts.push(<div key={`html-${idx}`} dangerouslySetInnerHTML={{ __html: wrapper.innerHTML }} />);
  });

  return <div className={className} style={style}>{parts}</div>;
};

// ABNT-aligned text indent (1.25 cm = 12.5 mm)
const indentStyle: React.CSSProperties = { textIndent: `${INDENT}mm` };

// Section title style: bold only, no underline (matches PDF addSectionTitle)
const sectionTitleClass = "text-lg font-bold uppercase mb-4";

interface Props {
  section: ReportSection;
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
  links: { attendance: string; registration: string; media: string };
  sectionPhotos?: Record<string, string[]>;
  photoMetadata?: Record<string, ReportPhotoMeta[]>;
  goals: Goal[];
  organizationName: string;
  organizationAddress?: string;
  organizationWebsite?: string;
  organizationEmail?: string;
  organizationPhone?: string;
  getActivitiesByGoal: (goalId: string) => Activity[];
  getCommunicationActivities: () => Activity[];
  getOtherActivities: () => Activity[];
  formatActivityDate: (date: string, endDate?: string) => string;
}

// Renders a single photo with caption and width
const PreviewPhoto: React.FC<{ photo: string; meta?: ReportPhotoMeta; index: number }> = ({ photo, meta, index }) => {
  const widthPercent = meta?.widthPercent || 100;
  const caption = meta?.caption || '';
  return (
    <div className="break-inside-avoid mb-4" style={{ width: `${widthPercent}%` }}>
      <div className="overflow-hidden rounded-lg border shadow-sm">
        <img src={photo} alt={caption || `Registro ${index + 1}`} className="w-full object-contain bg-muted" />
      </div>
      {caption && (
        <p className="text-xs text-muted-foreground text-center mt-1 italic">{caption}</p>
      )}
    </div>
  );
};

const PreviewPhotoGrid: React.FC<{ photos: string[]; metas?: ReportPhotoMeta[]; title?: string }> = ({ photos, metas, title }) => {
  if (!photos || photos.length === 0) return null;
  return (
    <div className="mt-6 mb-4">
      {title && <p className="font-semibold text-sm mb-3 uppercase">{title}</p>}
      <div className="flex flex-wrap gap-4 justify-center">
        {photos.map((photo, idx) => (
          <PreviewPhoto key={idx} photo={photo} meta={metas?.[idx]} index={idx} />
        ))}
      </div>
    </div>
  );
};

export const ReportPreviewSection: React.FC<Props> = (props) => {
  const { section } = props;
  if (!section.isVisible) return null;

  const sectionKey = section.type === 'custom' ? section.id : section.key;
  const secPhotos = props.sectionPhotos?.[sectionKey] || [];
  const secMetas = props.photoMetadata?.[sectionKey] || [];

  const renderSectionPhotos = () => {
    if (secPhotos.length === 0) return null;
    return <PreviewPhotoGrid photos={secPhotos} metas={secMetas} title="Registros Fotográficos" />;
  };

  switch (section.key) {
    case 'object': return <ObjectPreview {...props} />;
    case 'summary': return <SummaryPreview {...props} renderPhotos={renderSectionPhotos} />;
    case 'goals': return <GoalsPreview {...props} />;
    case 'other': return <OtherPreview {...props} renderPhotos={renderSectionPhotos} />;
    case 'communication': return <CommunicationPreview {...props} renderPhotos={renderSectionPhotos} />;
    case 'satisfaction': return <SatisfactionPreview {...props} renderPhotos={renderSectionPhotos} />;
    case 'future': return <FuturePreview {...props} renderPhotos={renderSectionPhotos} />;
    case 'expenses': return <ExpensesPreview {...props} />;
    case 'links': return <LinksPreview {...props} />;
    case 'custom':
    default:
      return (
        <section key={section.id} className="mb-8 page-break">
          <h3 className={sectionTitleClass} style={{ textAlign: 'left' }}>{section.title}</h3>
          <RichContent html={section.content || ''} className="text-justify" />
          {renderSectionPhotos()}
        </section>
      );
  }
};

const ObjectPreview: React.FC<Props> = ({ section, objectText }) => (
  <section className="mb-8 page-break">
    <h3 className={sectionTitleClass} style={{ textAlign: 'left' }}>{section.title}</h3>
    <RichContent html={objectText} className="text-justify leading-relaxed" style={indentStyle} />
  </section>
);

const SummaryPreview: React.FC<Props & { renderPhotos?: () => React.ReactNode }> = ({ section, summary, renderPhotos }) => (
  <section className="mb-8 page-break">
    <h3 className={sectionTitleClass} style={{ textAlign: 'left' }}>{section.title}</h3>
    <RichContent html={summary} className="text-justify leading-relaxed" style={indentStyle} />
    {renderPhotos?.()}
  </section>
);

const GoalsPreview: React.FC<Props> = ({ section, goals, goalNarratives, goalPhotos, photoMetadata, getActivitiesByGoal, formatActivityDate }) => (
  <section className="mb-8 page-break">
    <h3 className={`${sectionTitleClass} mb-6`} style={{ textAlign: 'left' }}>{section.title}</h3>
    {goals.map((goal, idx) => {
      const goalActs = getActivitiesByGoal(goal.id);
      const manualPhotos = goalPhotos[goal.id] || [];
      const activityPhotos = goalActs.flatMap(a => a.photos || []);
      const allGoalPhotos = [...manualPhotos, ...activityPhotos];
      const goalMetas = photoMetadata?.[goal.id] || [];

      return (
        <div key={goal.id} className="mb-10">
          <h4 className="font-bold mb-3" style={{ textAlign: 'left', color: '#000' }}>{goal.title}</h4>
          <RichContent html={goalNarratives[goal.id] || '[Descreva as realizações da meta e das etapas, tendo como foco o que foi previsto]'} className="text-justify mb-4 leading-relaxed" style={indentStyle} />
          {goalActs.length > 0 && (
            <div className="mt-4 text-sm">
              <p className="font-medium mb-2">Atividades realizadas:</p>
              {goalActs.map(act => (
                <div key={act.id} className="mb-2 pl-4 border-l-2 border-muted">
                  <p><strong>{formatActivityDate(act.date, act.endDate)}</strong>{act.location && ` – ${act.location}`}{act.attendeesCount > 0 && ` – ${act.attendeesCount} participantes`}</p>
                  <p>{act.description}</p>
                  {act.results && <p className="text-muted-foreground">Resultados: {act.results}</p>}
                </div>
              ))}
            </div>
          )}
          <PreviewPhotoGrid photos={allGoalPhotos} metas={goalMetas} title={`Registros Fotográficos – Meta ${idx + 1}`} />
        </div>
      );
    })}
  </section>
);

const OtherPreview: React.FC<Props & { renderPhotos?: () => React.ReactNode }> = ({
  section, otherActionsNarrative, otherActionsPhotos, getOtherActivities, formatActivityDate,
  organizationName, organizationAddress, organizationWebsite, organizationEmail, organizationPhone,
  renderPhotos,
}) => {
  const otherActs = getOtherActivities();
  const hasPhotos = otherActionsPhotos.length > 0 || otherActs.some(a => a.photos && a.photos.length > 0);
  return (
    <React.Fragment>
      <section className="mb-8 page-break">
        <h3 className={sectionTitleClass} style={{ textAlign: 'left' }}>{section.title}</h3>
        <RichContent html={otherActionsNarrative || '[Descreva outras informações diversas sobre o projeto]'} className="text-justify mb-4 leading-relaxed" style={indentStyle} />
        {otherActs.length > 0 && (
          <div className="mt-4 text-sm">
            {otherActs.map(act => (
              <div key={act.id} className="mb-2 pl-4 border-l-2 border-muted">
                <p><strong>{formatActivityDate(act.date)}</strong>: {act.description}</p>
              </div>
            ))}
          </div>
        )}
        {renderPhotos?.()}
      </section>
      {hasPhotos && (
        <PhotoGallerySection title="OUTRAS AÇÕES" photos={otherActionsPhotos} activities={otherActs}
          organizationName={organizationName} organizationAddress={organizationAddress}
          organizationWebsite={organizationWebsite} organizationEmail={organizationEmail} organizationPhone={organizationPhone} />
      )}
    </React.Fragment>
  );
};

const CommunicationPreview: React.FC<Props & { renderPhotos?: () => React.ReactNode }> = ({
  section, communicationNarrative, communicationPhotos, getCommunicationActivities, formatActivityDate,
  organizationName, organizationAddress, organizationWebsite, organizationEmail, organizationPhone,
  renderPhotos,
}) => {
  const commActs = getCommunicationActivities();
  const hasPhotos = communicationPhotos.length > 0 || commActs.some(a => a.photos && a.photos.length > 0);
  return (
    <React.Fragment>
      <section className="mb-8 page-break">
        <h3 className={sectionTitleClass} style={{ textAlign: 'left' }}>{section.title}</h3>
        <RichContent html={communicationNarrative || '[Descreva as ações de divulgação]'} className="text-justify mb-4 leading-relaxed" style={indentStyle} />
        {commActs.length > 0 && (
          <div className="mt-4 text-sm">
            {commActs.map(act => (
              <div key={act.id} className="mb-3">
                <p><strong>{formatActivityDate(act.date)}</strong>: {act.description}</p>
              </div>
            ))}
          </div>
        )}
        {renderPhotos?.()}
      </section>
      {hasPhotos && (
        <PhotoGallerySection title="PUBLICAÇÕES E DIVULGAÇÃO" photos={communicationPhotos} activities={commActs}
          organizationName={organizationName} organizationAddress={organizationAddress}
          organizationWebsite={organizationWebsite} organizationEmail={organizationEmail} organizationPhone={organizationPhone} />
      )}
    </React.Fragment>
  );
};

const SatisfactionPreview: React.FC<Props & { renderPhotos?: () => React.ReactNode }> = ({ section, satisfaction, renderPhotos }) => (
  <section className="mb-8 page-break">
    <h3 className={sectionTitleClass} style={{ textAlign: 'left' }}>{section.title}</h3>
    <RichContent html={satisfaction || '[Descreva a visão do público sobre o projeto e os principais feedbacks]'} className="text-justify leading-relaxed" style={indentStyle} />
    {renderPhotos?.()}
  </section>
);

const FuturePreview: React.FC<Props & { renderPhotos?: () => React.ReactNode }> = ({ section, futureActions, renderPhotos }) => (
  <section className="mb-8 page-break">
    <h3 className={sectionTitleClass} style={{ textAlign: 'left' }}>{section.title}</h3>
    <RichContent html={futureActions || '[Descreva as ações futuras do projeto]'} className="text-justify leading-relaxed" style={indentStyle} />
    {renderPhotos?.()}
  </section>
);

const ExpensesPreview: React.FC<Props> = ({ section, expenses }) => (
  <section className="mb-8 page-break">
    <h3 className={sectionTitleClass} style={{ textAlign: 'left' }}>{section.title}</h3>
    <p className="text-sm text-muted-foreground mb-4">Insira fotos e descreva sobre o uso e aplicação de cada item de despesa previsto no plano de trabalho.</p>
    {expenses.length === 0 ? (
      <p className="text-muted-foreground italic">[Nenhum item de despesa registrado]</p>
    ) : (
      <table className="w-full text-sm border-collapse border">
        <thead>
          <tr className="bg-muted/50">
            <th className="text-left py-2 px-3 border font-semibold">ITEM DE DESPESA</th>
            <th className="text-left py-2 px-3 border font-semibold">RELATO DE USO NO PROJETO</th>
            <th className="text-left py-2 px-3 border font-semibold">REGISTRO FOTOGRÁFICO</th>
          </tr>
        </thead>
        <tbody>
          {expenses.map(exp => (
            <tr key={exp.id} className="border-b">
              <td className="py-2 px-3 border">{exp.itemName || '-'}</td>
              <td className="py-2 px-3 border">{exp.description || '-'}</td>
              <td className="py-2 px-3 border">{exp.image ? <img src={exp.image} alt="" className="h-16 w-16 object-cover rounded" /> : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </section>
);

const LinksPreview = React.forwardRef<HTMLElement, Props>(({ section, links }, ref) => (
  <section ref={ref} className="mb-8 page-break">
    <h3 className={sectionTitleClass} style={{ textAlign: 'left' }}>{section.title}</h3>
    <ul className="space-y-3 text-sm">
      <li><strong>Listas de Presença:</strong>{' '}{links.attendance ? <a href={links.attendance} className="text-primary underline break-all">{links.attendance}</a> : '[Insira o link]'}</li>
      <li><strong>Listas de Inscrição:</strong>{' '}{links.registration ? <a href={links.registration} className="text-primary underline break-all">{links.registration}</a> : '[Insira o link]'}</li>
      <li><strong>Mídias (Fotos, Vídeos):</strong>{' '}{links.media ? <a href={links.media} className="text-primary underline break-all">{links.media}</a> : '[Insira o link]'}</li>
    </ul>
  </section>
));
LinksPreview.displayName = 'LinksPreview';
