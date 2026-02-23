import React from 'react';
import { ReportSection } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Trash2, Upload, FileText } from 'lucide-react';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { JustificationSectionKey, AttachmentFile } from '@/hooks/useJustificationReportState';

interface Props {
  section: ReportSection;
  index: number;
  sectionContents: Record<JustificationSectionKey, string>;
  placeholders: Record<string, string>;
  attachmentFiles: AttachmentFile[];
  updateSectionContent: (key: JustificationSectionKey, value: string) => void;
  updateSectionTitle: (index: number, title: string) => void;
  updateCustomContent: (index: number, content: string) => void;
  removeSection: (index: number) => void;
  handleDocumentUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removeAttachmentFile: (index: number) => void;
}

export const JustificationEditSection: React.FC<Props> = ({
  section, index, sectionContents, placeholders,
  attachmentFiles,
  updateSectionContent, updateSectionTitle, updateCustomContent, removeSection,
  handleDocumentUpload, removeAttachmentFile,
}) => {
  if (!section.isVisible) return null;

  const isAttachmentsSection = section.key === 'attachmentsSection';

  return (
    <Card className="mb-6 border-l-4 border-l-primary/30">
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 mb-4 border-b pb-2">
          <span className="bg-muted text-muted-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
            {index + 1}
          </span>
          {section.type === 'custom' ? (
            <Input
              value={section.title}
              onChange={(e) => updateSectionTitle(index, e.target.value)}
              className="font-semibold text-lg flex-1"
              placeholder="Título da Seção"
            />
          ) : (
            <h3 className="text-lg font-semibold flex-1">{section.title}</h3>
          )}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded hidden sm:inline-block">
              {section.type === 'custom' ? 'Personalizada' : 'Padrão'}
            </span>
            {section.type === 'custom' && (
              <button onClick={() => removeSection(index)} className="text-destructive/60 hover:text-destructive p-1">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {section.type === 'custom' ? (
          <div className="space-y-2">
            <Label>Conteúdo</Label>
            <RichTextEditor
              value={section.content || ''}
              onChange={(val) => updateCustomContent(index, val)}
              placeholder="Escreva o conteúdo desta seção..."
            />
          </div>
        ) : (
          <RichTextEditor
            value={sectionContents[section.key as JustificationSectionKey] || ''}
            onChange={(val) => updateSectionContent(section.key as JustificationSectionKey, val)}
            placeholder={placeholders[section.key] || 'Preencha esta seção...'}
          />
        )}

        {/* Upload de documentos na seção de Anexos */}
        {isAttachmentsSection && (
          <div className="mt-4 space-y-3 border-t pt-4">
            <Label className="text-sm font-semibold">Documentos Anexados</Label>
            <p className="text-xs text-muted-foreground">
              Envie documentos comprobatórios (PDF, DOC, XLS, imagens, etc.)
            </p>

            {attachmentFiles.length > 0 && (
              <div className="space-y-2">
                {attachmentFiles.map((file, fileIdx) => (
                  <div key={fileIdx} className="flex items-center gap-2 p-2.5 border rounded-md bg-muted/50">
                    <FileText className="w-4 h-4 text-primary shrink-0" />
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline truncate flex-1"
                      title={file.url}
                    >
                      {file.name || 'Documento enviado'}
                    </a>
                    <button
                      onClick={() => removeAttachmentFile(fileIdx)}
                      className="text-destructive/60 hover:text-destructive shrink-0"
                      title="Remover"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2">
              <Label
                htmlFor="upload-attachment"
                className="cursor-pointer inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 border border-dashed border-primary/30 rounded-md px-3 py-1.5 hover:bg-primary/5 transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                Enviar documento
              </Label>
              <input
                id="upload-attachment"
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.zip"
                className="hidden"
                onChange={handleDocumentUpload}
              />
              <span className="text-xs text-muted-foreground">PDF, DOC, XLS, imagens...</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
