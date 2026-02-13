import React from 'react';
import { ReportSection, Activity, Goal, ExpenseItem } from '@/types';
import { PhotoGallerySection } from '@/components/report/PhotoGallerySection';

interface Props {
  section: ReportSection;
  // Data
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
  // Project
  goals: Goal[];
  organizationName: string;
  organizationAddress?: string;
  organizationWebsite?: string;
  organizationEmail?: string;
  organizationPhone?: string;
  // Helpers
  getActivitiesByGoal: (goalId: string) => Activity[];
  getCommunicationActivities: () => Activity[];
  getOtherActivities: () => Activity[];
  formatActivityDate: (date: string, endDate?: string) => string;
}

export const ReportPreviewSection: React.FC<Props> = (props) => {
  const { section } = props;
  if (!section.isVisible) return null;

  switch (section.key) {
    case 'object': return <ObjectPreview {...props} />;
    case 'summary': return <SummaryPreview {...props} />;
    case 'goals': return <GoalsPreview {...props} />;
    case 'other': return <OtherPreview {...props} />;
    case 'communication': return <CommunicationPreview {...props} />;
    case 'satisfaction': return <SatisfactionPreview {...props} />;
    case 'future': return <FuturePreview {...props} />;
    case 'expenses': return <ExpensesPreview {...props} />;
    case 'links': return <LinksPreview {...props} />;
    case 'custom':
    default:
      return (
        <section key={section.id} className="mb-8 page-break">
          <h3 className="text-lg font-bold uppercase mb-4">{section.title}</h3>
          <div className="whitespace-pre-line text-justify">{section.content}</div>
        </section>
      );
  }
};

const ObjectPreview: React.FC<Props> = ({ section, objectText }) => (
  <section className="mb-8 page-break">
    <h3 className="text-lg font-bold uppercase mb-4">{section.title}</h3>
    <p className="text-justify leading-relaxed">{objectText}</p>
  </section>
);

const SummaryPreview: React.FC<Props> = ({ section, summary }) => (
  <section className="mb-8 page-break">
    <h3 className="text-lg font-bold uppercase mb-4">{section.title}</h3>
    <div className="whitespace-pre-line text-justify leading-relaxed">{summary}</div>
  </section>
);

const GoalsPreview: React.FC<Props> = ({ section, goals, goalNarratives, goalPhotos, getActivitiesByGoal, formatActivityDate }) => (
  <section className="mb-8 page-break">
    <h3 className="text-lg font-bold uppercase mb-6">{section.title}</h3>
    {goals.map((goal, idx) => {
      const goalActs = getActivitiesByGoal(goal.id);
      const manualPhotos = goalPhotos[goal.id] || [];
      const activityPhotos = goalActs.flatMap(a => a.photos || []);
      const allGoalPhotos = [...manualPhotos, ...activityPhotos];

      return (
        <div key={goal.id} className="mb-10">
          <h4 className="font-bold text-primary mb-3">META {idx + 1} – {goal.title}</h4>
          <div className="whitespace-pre-line text-justify mb-4 leading-relaxed">
            {goalNarratives[goal.id] || '[Descreva as realizações da meta e das etapas, tendo como foco o que foi previsto]'}
          </div>
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
          {allGoalPhotos.length > 0 && (
            <div className="mt-6 mb-4">
              <p className="font-semibold text-sm mb-3 uppercase">Registros Fotográficos – Meta {idx + 1}</p>
              <div className="grid grid-cols-2 gap-4">
                {allGoalPhotos.map((photo, photoIdx) => (
                  <div key={photoIdx} className="aspect-[4/3] overflow-hidden rounded-lg border shadow-sm">
                    <img src={photo} alt={`Meta ${idx + 1} - Registro ${photoIdx + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    })}
  </section>
);

const OtherPreview: React.FC<Props> = ({
  section, otherActionsNarrative, otherActionsPhotos, getOtherActivities, formatActivityDate,
  organizationName, organizationAddress, organizationWebsite, organizationEmail, organizationPhone,
}) => {
  const otherActs = getOtherActivities();
  const hasPhotos = otherActionsPhotos.length > 0 || otherActs.some(a => a.photos && a.photos.length > 0);
  return (
    <React.Fragment>
      <section className="mb-8 page-break">
        <h3 className="text-lg font-bold uppercase mb-4">{section.title}</h3>
        <div className="whitespace-pre-line text-justify mb-4 leading-relaxed">
          {otherActionsNarrative || '[Descreva outras informações diversas sobre o projeto]'}
        </div>
        {otherActs.length > 0 && (
          <div className="mt-4 text-sm">
            {otherActs.map(act => (
              <div key={act.id} className="mb-2 pl-4 border-l-2 border-muted">
                <p><strong>{formatActivityDate(act.date)}</strong>: {act.description}</p>
              </div>
            ))}
          </div>
        )}
      </section>
      {hasPhotos && (
        <PhotoGallerySection title="OUTRAS AÇÕES" photos={otherActionsPhotos} activities={otherActs}
          organizationName={organizationName} organizationAddress={organizationAddress}
          organizationWebsite={organizationWebsite} organizationEmail={organizationEmail} organizationPhone={organizationPhone} />
      )}
    </React.Fragment>
  );
};

const CommunicationPreview: React.FC<Props> = ({
  section, communicationNarrative, communicationPhotos, getCommunicationActivities, formatActivityDate,
  organizationName, organizationAddress, organizationWebsite, organizationEmail, organizationPhone,
}) => {
  const commActs = getCommunicationActivities();
  const hasPhotos = communicationPhotos.length > 0 || commActs.some(a => a.photos && a.photos.length > 0);
  return (
    <React.Fragment>
      <section className="mb-8 page-break">
        <h3 className="text-lg font-bold uppercase mb-4">{section.title}</h3>
        <div className="whitespace-pre-line text-justify mb-4 leading-relaxed">
          {communicationNarrative || '[Descreva as ações de divulgação]'}
        </div>
        {commActs.length > 0 && (
          <div className="mt-4 text-sm">
            {commActs.map(act => (
              <div key={act.id} className="mb-3">
                <p><strong>{formatActivityDate(act.date)}</strong>: {act.description}</p>
              </div>
            ))}
          </div>
        )}
      </section>
      {hasPhotos && (
        <PhotoGallerySection title="PUBLICAÇÕES E DIVULGAÇÃO" photos={communicationPhotos} activities={commActs}
          organizationName={organizationName} organizationAddress={organizationAddress}
          organizationWebsite={organizationWebsite} organizationEmail={organizationEmail} organizationPhone={organizationPhone} />
      )}
    </React.Fragment>
  );
};

const SatisfactionPreview: React.FC<Props> = ({ section, satisfaction }) => (
  <section className="mb-8 page-break">
    <h3 className="text-lg font-bold uppercase mb-4">{section.title}</h3>
    <div className="whitespace-pre-line text-justify leading-relaxed">
      {satisfaction || '[Descreva a visão do público sobre o projeto e os principais feedbacks]'}
    </div>
  </section>
);

const FuturePreview: React.FC<Props> = ({ section, futureActions }) => (
  <section className="mb-8 page-break">
    <h3 className="text-lg font-bold uppercase mb-4">{section.title}</h3>
    <div className="whitespace-pre-line text-justify leading-relaxed">
      {futureActions || '[Descreva as ações futuras do projeto]'}
    </div>
  </section>
);

const ExpensesPreview: React.FC<Props> = ({ section, expenses }) => (
  <section className="mb-8 page-break">
    <h3 className="text-lg font-bold uppercase mb-4">{section.title}</h3>
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

const LinksPreview: React.FC<Props> = ({ section, links }) => (
  <section className="mb-8 page-break">
    <h3 className="text-lg font-bold uppercase mb-4">{section.title}</h3>
    <ul className="space-y-3 text-sm">
      <li><strong>Listas de Presença:</strong>{' '}{links.attendance ? <a href={links.attendance} className="text-primary underline break-all">{links.attendance}</a> : '[Insira o link]'}</li>
      <li><strong>Listas de Inscrição:</strong>{' '}{links.registration ? <a href={links.registration} className="text-primary underline break-all">{links.registration}</a> : '[Insira o link]'}</li>
      <li><strong>Mídias (Fotos, Vídeos):</strong>{' '}{links.media ? <a href={links.media} className="text-primary underline break-all">{links.media}</a> : '[Insira o link]'}</li>
    </ul>
  </section>
);
