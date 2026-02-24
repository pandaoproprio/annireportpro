import React from 'react';
import { DocumentBlock, TextBlock, ImageBlock, SpacerBlock, TableBlock, LayoutConfig, HeaderFooterConfig } from '@/types/document';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Props {
  activeBlock: DocumentBlock | null;
  onUpdateBlock: (updates: Partial<DocumentBlock>) => void;
  layout: LayoutConfig;
  onUpdateLayout: (updates: Partial<LayoutConfig>) => void;
  globalHeader: HeaderFooterConfig;
  onUpdateGlobalHeader: (updates: Partial<HeaderFooterConfig>) => void;
  globalFooter: HeaderFooterConfig;
  onUpdateGlobalFooter: (updates: Partial<HeaderFooterConfig>) => void;
}

export const WysiwygPropertiesPanel: React.FC<Props> = ({
  activeBlock, onUpdateBlock, layout, onUpdateLayout,
  globalHeader, onUpdateGlobalHeader, globalFooter, onUpdateGlobalFooter,
}) => {
  return (
    <div className="w-64 border-l bg-background overflow-y-auto h-full">
      <Tabs defaultValue="block" className="w-full">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="block" className="text-xs">Bloco</TabsTrigger>
          <TabsTrigger value="layout" className="text-xs">Layout</TabsTrigger>
          <TabsTrigger value="hf" className="text-xs">H/F</TabsTrigger>
        </TabsList>

        {/* Block */}
        <TabsContent value="block" className="p-3 space-y-3">
          {activeBlock ? (
            <>
              <div className="text-xs font-medium uppercase text-muted-foreground">
                {activeBlock.type === 'text' ? 'Texto' : activeBlock.type === 'image' ? 'Imagem' : activeBlock.type === 'table' ? 'Tabela' : 'Espaçador'}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Largura (%)</Label>
                <Slider value={[activeBlock.width]} onValueChange={([v]) => onUpdateBlock({ width: v })} min={20} max={100} step={5} />
                <span className="text-xs text-muted-foreground">{activeBlock.width}%</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Margem sup.</Label>
                  <Input type="number" value={activeBlock.marginTop} onChange={(e) => onUpdateBlock({ marginTop: Number(e.target.value) })} className="h-7 text-xs" />
                </div>
                <div>
                  <Label className="text-xs">Margem inf.</Label>
                  <Input type="number" value={activeBlock.marginBottom} onChange={(e) => onUpdateBlock({ marginBottom: Number(e.target.value) })} className="h-7 text-xs" />
                </div>
              </div>

              <div>
                <Label className="text-xs">Alinhamento</Label>
                <Select value={activeBlock.alignment} onValueChange={(v) => onUpdateBlock({ alignment: v as DocumentBlock['alignment'] })}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Esquerda</SelectItem>
                    <SelectItem value="center">Centro</SelectItem>
                    <SelectItem value="right">Direita</SelectItem>
                    <SelectItem value="justify">Justificado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {activeBlock.type === 'text' && (
                <>
                  <Separator />
                  <div>
                    <Label className="text-xs">Tamanho fonte (pt)</Label>
                    <Input type="number" value={(activeBlock as TextBlock).fontSize} onChange={(e) => onUpdateBlock({ fontSize: Number(e.target.value) } as Partial<TextBlock>)} className="h-7 text-xs" min={6} max={72} />
                  </div>
                  <div>
                    <Label className="text-xs">Família</Label>
                    <Select value={(activeBlock as TextBlock).fontFamily} onValueChange={(v) => onUpdateBlock({ fontFamily: v } as Partial<TextBlock>)}>
                      <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                        <SelectItem value="Arial">Arial</SelectItem>
                        <SelectItem value="Helvetica">Helvetica</SelectItem>
                        <SelectItem value="Courier New">Courier New</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Entrelinha</Label>
                    <Slider value={[(activeBlock as TextBlock).lineHeight * 10]} onValueChange={([v]) => onUpdateBlock({ lineHeight: v / 10 } as Partial<TextBlock>)} min={10} max={30} step={1} />
                    <span className="text-xs text-muted-foreground">{(activeBlock as TextBlock).lineHeight}×</span>
                  </div>
                </>
              )}

              {activeBlock.type === 'image' && (
                <>
                  <Separator />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Largura (mm)</Label>
                      <Input type="number" value={(activeBlock as ImageBlock).displayWidth} onChange={(e) => {
                        const w = Number(e.target.value);
                        const img = activeBlock as ImageBlock;
                        const h = img.lockAspectRatio && img.originalWidth > 0 ? w * (img.originalHeight / img.originalWidth) : img.displayHeight;
                        onUpdateBlock({ displayWidth: w, displayHeight: Math.round(h) } as Partial<ImageBlock>);
                      }} className="h-7 text-xs" />
                    </div>
                    <div>
                      <Label className="text-xs">Altura (mm)</Label>
                      <Input type="number" value={(activeBlock as ImageBlock).displayHeight} onChange={(e) => onUpdateBlock({ displayHeight: Number(e.target.value) } as Partial<ImageBlock>)} className="h-7 text-xs" disabled={(activeBlock as ImageBlock).lockAspectRatio} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={(activeBlock as ImageBlock).lockAspectRatio} onCheckedChange={(v) => onUpdateBlock({ lockAspectRatio: v } as Partial<ImageBlock>)} />
                    <Label className="text-xs">Proporção</Label>
                  </div>
                  <div>
                    <Label className="text-xs">Legenda</Label>
                    <Input value={(activeBlock as ImageBlock).caption} onChange={(e) => onUpdateBlock({ caption: e.target.value } as Partial<ImageBlock>)} className="h-7 text-xs" />
                  </div>
                </>
              )}

              {activeBlock.type === 'spacer' && (
                <>
                  <Separator />
                  <div>
                    <Label className="text-xs">Altura (mm)</Label>
                    <Slider value={[(activeBlock as SpacerBlock).height]} onValueChange={([v]) => onUpdateBlock({ height: v } as Partial<SpacerBlock>)} min={2} max={100} step={1} />
                    <span className="text-xs text-muted-foreground">{(activeBlock as SpacerBlock).height}mm</span>
                  </div>
                </>
              )}

              {activeBlock.type === 'table' && (
                <>
                  <Separator />
                  <div className="flex items-center gap-2">
                    <Switch checked={(activeBlock as TableBlock).headerRow} onCheckedChange={(v) => onUpdateBlock({ headerRow: v } as Partial<TableBlock>)} />
                    <Label className="text-xs">Cabeçalho</Label>
                  </div>
                </>
              )}
            </>
          ) : (
            <p className="text-xs text-muted-foreground py-4 text-center">Clique num bloco no canvas para editá-lo</p>
          )}
        </TabsContent>

        {/* Layout */}
        <TabsContent value="layout" className="p-3 space-y-3">
          <div className="text-xs font-medium uppercase text-muted-foreground">Margens (mm)</div>
          <div className="grid grid-cols-2 gap-2">
            {(['marginTop', 'marginBottom', 'marginLeft', 'marginRight'] as const).map(key => (
              <div key={key}>
                <Label className="text-xs">{key === 'marginTop' ? 'Sup.' : key === 'marginBottom' ? 'Inf.' : key === 'marginLeft' ? 'Esq.' : 'Dir.'}</Label>
                <Input type="number" value={layout[key]} onChange={(e) => onUpdateLayout({ [key]: Number(e.target.value) })} className="h-7 text-xs" min={5} max={60} />
              </div>
            ))}
          </div>
          <Separator />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">H→Cont.</Label>
              <Input type="number" value={layout.headerSpacing} onChange={(e) => onUpdateLayout({ headerSpacing: Number(e.target.value) })} className="h-7 text-xs" min={0} max={40} />
            </div>
            <div>
              <Label className="text-xs">Cont.→F</Label>
              <Input type="number" value={layout.footerSpacing} onChange={(e) => onUpdateLayout({ footerSpacing: Number(e.target.value) })} className="h-7 text-xs" min={0} max={40} />
            </div>
          </div>
        </TabsContent>

        {/* H/F config */}
        <TabsContent value="hf" className="p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase text-muted-foreground">Cabeçalho</span>
            <Switch checked={globalHeader.enabled} onCheckedChange={(v) => onUpdateGlobalHeader({ enabled: v })} />
          </div>
          {globalHeader.enabled && (
            <div className="space-y-2">
              <div>
                <Label className="text-xs">Altura (mm)</Label>
                <Input type="number" value={globalHeader.height} onChange={(e) => onUpdateGlobalHeader({ height: Number(e.target.value) })} className="h-7 text-xs" min={5} max={60} />
              </div>
              <div>
                <Label className="text-xs">Tamanho fonte</Label>
                <Input type="number" value={globalHeader.fontSize} onChange={(e) => onUpdateGlobalHeader({ fontSize: Number(e.target.value) })} className="h-7 text-xs" min={6} max={24} />
              </div>
              <div>
                <Label className="text-xs">Alinhamento</Label>
                <Select value={globalHeader.alignment} onValueChange={(v) => onUpdateGlobalHeader({ alignment: v as 'left' | 'center' | 'right' })}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Esquerda</SelectItem>
                    <SelectItem value="center">Centro</SelectItem>
                    <SelectItem value="right">Direita</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase text-muted-foreground">Rodapé</span>
            <Switch checked={globalFooter.enabled} onCheckedChange={(v) => onUpdateGlobalFooter({ enabled: v })} />
          </div>
          {globalFooter.enabled && (
            <div className="space-y-2">
              <div>
                <Label className="text-xs">Altura (mm)</Label>
                <Input type="number" value={globalFooter.height} onChange={(e) => onUpdateGlobalFooter({ height: Number(e.target.value) })} className="h-7 text-xs" min={5} max={60} />
              </div>
              <div>
                <Label className="text-xs">Tamanho fonte</Label>
                <Input type="number" value={globalFooter.fontSize} onChange={(e) => onUpdateGlobalFooter({ fontSize: Number(e.target.value) })} className="h-7 text-xs" min={6} max={24} />
              </div>
              <div>
                <Label className="text-xs">Alinhamento</Label>
                <Select value={globalFooter.alignment} onValueChange={(v) => onUpdateGlobalFooter({ alignment: v as 'left' | 'center' | 'right' })}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Esquerda</SelectItem>
                    <SelectItem value="center">Centro</SelectItem>
                    <SelectItem value="right">Direita</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
