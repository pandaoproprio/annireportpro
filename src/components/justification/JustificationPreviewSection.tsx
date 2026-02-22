import React from 'react';
import { ReportSection } from '@/types';
import { JustificationSectionKey } from '@/hooks/useJustificationReportState';

interface Props {
  section: ReportSection;
  index: number;
  sectionContents: Record<JustificationSectionKey, string>;
}

export const JustificationPreviewSection: React.FC<Props> = ({ section, index, sectionContents }) => {
  if (!section.isVisible) return null;

  const content = section.type === 'custom'
    ? section.content || ''
    : sectionContents[section.key as JustificationSectionKey] || '';

  const isEmpty = !content || content.replace(/<[^>]*>/g, '').trim() === '';

  return (
    <section className="mb-8 page-break">
      <h3 className="text-lg font-bold uppercase mb-4">
        {index + 1}. {section.title}
      </h3>
      {isEmpty ? (
        <p className="text-muted-foreground italic">[Seção não preenchida]</p>
      ) : (
        <div
          className="prose prose-sm max-w-none text-justify leading-relaxed [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      )}
    </section>
  );
};
