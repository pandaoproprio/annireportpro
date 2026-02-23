import React from 'react';
import { ReportSection } from '@/types';
import { JustificationSectionKey, AttachmentFile } from '@/hooks/useJustificationReportState';
import { FileText } from 'lucide-react';

interface Props {
  section: ReportSection;
  index: number;
  sectionContents: Record<JustificationSectionKey, string>;
  attachmentFiles?: AttachmentFile[];
  sectionPhotos?: Record<string, string[]>;
}

export const JustificationPreviewSection: React.FC<Props> = ({ section, index, sectionContents, attachmentFiles, sectionPhotos }) => {
  if (!section.isVisible) return null;

  const content = section.type === 'custom'
    ? section.content || ''
    : sectionContents[section.key as JustificationSectionKey] || '';

  const isEmpty = !content || content.replace(/<[^>]*>/g, '').trim() === '';
  const isAttachmentsSection = section.key === 'attachmentsSection';
  const hasFiles = isAttachmentsSection && attachmentFiles && attachmentFiles.length > 0;

  const sectionKey = section.type === 'custom' ? section.id : section.key;
  const photos = sectionPhotos?.[sectionKey] || [];

  return (
    <section className="mb-8 page-break">
      <h3 className="text-lg font-bold uppercase mb-4">
        {index + 1}. {section.title}
      </h3>
      {isEmpty && !hasFiles && photos.length === 0 ? (
        <p className="text-muted-foreground italic">[Seção não preenchida]</p>
      ) : (
        <>
          {!isEmpty && (
            <div
              className="prose prose-sm max-w-none text-justify leading-relaxed [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          )}
          {photos.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-3">
              {photos.map((photo, pIdx) => (
                <div key={pIdx} className="text-center">
                  <img
                    src={photo}
                    alt={`Foto ${pIdx + 1}`}
                    className="w-full h-auto max-h-56 object-contain rounded border"
                  />
                  <p className="text-xs text-muted-foreground italic mt-1">Foto {pIdx + 1}</p>
                </div>
              ))}
            </div>
          )}
          {hasFiles && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-semibold mb-2">Documentos anexados:</p>
              <ul className="list-none space-y-1.5">
                {attachmentFiles!.map((file, fileIdx) => (
                  <li key={fileIdx} className="flex items-center gap-2 text-sm">
                    <FileText className="w-4 h-4 text-primary shrink-0" />
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {file.name || 'Documento'}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  );
};
