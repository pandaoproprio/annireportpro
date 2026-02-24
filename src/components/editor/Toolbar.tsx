import React from 'react';
import {
  Type, Image, Table2, Minus, Plus, FileDown, FileText,
  Undo2, Redo2, Save,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  createDefaultTextBlock,
  createDefaultImageBlock,
  createDefaultSpacerBlock,
  DocumentBlock,
  TableBlock,
} from '@/types/document';

interface ToolbarProps {
  onAddBlock: (block: DocumentBlock) => void;
  onAddPage: () => void;
  onExportPdf: () => void;
  onExportDocx: () => void;
  isDirty: boolean;
  isSaving: boolean;
  title: string;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  onAddBlock, onAddPage, onExportPdf, onExportDocx,
  isDirty, isSaving, title,
}) => {
  const addText = () => onAddBlock(createDefaultTextBlock(crypto.randomUUID()));
  const addImage = () => onAddBlock(createDefaultImageBlock(crypto.randomUUID()));
  const addSpacer = () => onAddBlock(createDefaultSpacerBlock(crypto.randomUUID()));
  const addTable = () => {
    const block: TableBlock = {
      id: crypto.randomUUID(),
      type: 'table',
      marginTop: 4,
      marginBottom: 4,
      padding: 0,
      alignment: 'left',
      width: 100,
      rows: 3,
      cols: 3,
      data: Array.from({ length: 3 }, () => Array.from({ length: 3 }, () => '')),
      colWidths: [33.3, 33.3, 33.4],
      headerRow: true,
      borderColor: '#000000',
      borderWidth: 1,
    };
    onAddBlock(block);
  };

  return (
    <div className="flex items-center gap-1 px-4 py-2 border-b bg-background sticky top-0 z-20">
      {/* Title + save status */}
      <div className="flex items-center gap-2 mr-4">
        <h2 className="text-sm font-semibold truncate max-w-[200px]">{title}</h2>
        {isSaving && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Save className="h-3 w-3 animate-pulse" /> Salvando...
          </span>
        )}
        {isDirty && !isSaving && (
          <span className="text-xs text-muted-foreground">• Não salvo</span>
        )}
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Block insertion */}
      <div className="flex items-center gap-0.5 mx-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={addText}>
              <Type className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Texto</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={addImage}>
              <Image className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Imagem</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={addTable}>
              <Table2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Tabela</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={addSpacer}>
              <Minus className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Espaçador</TooltipContent>
        </Tooltip>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Page */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={onAddPage}>
            <Plus className="h-3 w-3" /> Página
          </Button>
        </TooltipTrigger>
        <TooltipContent>Adicionar página</TooltipContent>
      </Tooltip>

      <div className="flex-1" />

      {/* Export */}
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={onExportPdf}>
          <FileDown className="h-3 w-3" /> PDF
        </Button>
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={onExportDocx}>
          <FileText className="h-3 w-3" /> DOCX
        </Button>
      </div>
    </div>
  );
};
