import React from 'react';
import { ReportSection } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowUp, ArrowDown, Eye, EyeOff, Trash2, Plus } from 'lucide-react';

interface Props {
  sections: ReportSection[];
  moveSection: (index: number, direction: 'up' | 'down') => void;
  toggleVisibility: (index: number) => void;
  updateSectionTitle: (index: number, title: string) => void;
  removeSection: (index: number) => void;
  addCustomSection: () => void;
}

export const ReportStructureEditor: React.FC<Props> = ({
  sections, moveSection, toggleVisibility, updateSectionTitle, removeSection, addCustomSection,
}) => (
  <Card className="border-l-4 border-l-sidebar">
    <CardContent className="pt-6">
      <div className="flex items-center gap-2 mb-6 border-b pb-4">
        <span className="bg-sidebar text-sidebar-primary w-8 h-8 rounded-full flex items-center justify-center font-bold">⚙</span>
        <div>
          <h3 className="text-lg font-bold text-foreground">Estrutura do Relatório</h3>
          <p className="text-sm text-muted-foreground">Organize e renomeie as seções.</p>
        </div>
      </div>

      <div className="space-y-2">
        {sections.map((section, idx) => (
          <div key={section.id} className={`flex items-center gap-2 p-3 rounded border transition-all ${section.isVisible ? 'bg-card border-border' : 'bg-muted/50 border-muted opacity-60'}`}>
            <div className="flex flex-col gap-1 text-muted-foreground">
              <button onClick={() => moveSection(idx, 'up')} disabled={idx === 0} className="hover:text-primary disabled:opacity-20"><ArrowUp size={16} /></button>
              <button onClick={() => moveSection(idx, 'down')} disabled={idx === sections.length - 1} className="hover:text-primary disabled:opacity-20"><ArrowDown size={16} /></button>
            </div>
            <div className="flex-1">
              <Input
                value={section.title}
                onChange={(e) => updateSectionTitle(idx, e.target.value)}
                className={`font-semibold ${!section.isVisible && 'text-muted-foreground line-through'}`}
                placeholder="Título da Seção"
              />
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => toggleVisibility(idx)} className="p-2 text-muted-foreground hover:text-primary" title="Mostrar/Ocultar">
                {section.isVisible ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
              {section.type === 'custom' && (
                <button onClick={() => removeSection(idx)} className="p-2 text-destructive/60 hover:text-destructive" title="Remover">
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          </div>
        ))}
        <Button variant="outline" onClick={addCustomSection} className="w-full mt-4 border-dashed border-2">
          <Plus className="w-4 h-4 mr-2" /> Adicionar Seção Personalizada
        </Button>
      </div>
    </CardContent>
  </Card>
);
