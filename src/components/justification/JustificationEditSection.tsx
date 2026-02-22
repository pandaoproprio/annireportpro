import React from 'react';
import { ReportSection } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Trash2 } from 'lucide-react';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { JustificationSectionKey } from '@/hooks/useJustificationReportState';

interface Props {
  section: ReportSection;
  index: number;
  sectionContents: Record<JustificationSectionKey, string>;
  placeholders: Record<string, string>;
  updateSectionContent: (key: JustificationSectionKey, value: string) => void;
  updateSectionTitle: (index: number, title: string) => void;
  updateCustomContent: (index: number, content: string) => void;
  removeSection: (index: number) => void;
}

export const JustificationEditSection: React.FC<Props> = ({
  section, index, sectionContents, placeholders,
  updateSectionContent, updateSectionTitle, updateCustomContent, removeSection,
}) => {
  if (!section.isVisible) return null;

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
      </CardContent>
    </Card>
  );
};
