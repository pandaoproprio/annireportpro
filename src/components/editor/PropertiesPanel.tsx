import React from 'react';
import { DocumentBlock, TextBlock, ImageBlock, SpacerBlock, TableBlock } from '@/types/document';
import { LayoutConfig, HeaderFooterConfig } from '@/types/document';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface PropertiesPanelProps {
  activeBlock: DocumentBlock | null;
  onUpdateBlock: (updates: Partial<DocumentBlock>) => void;
  layout: LayoutConfig;
  onUpdateLayout: (updates: Partial<LayoutConfig>) => void;
  globalHeader: HeaderFooterConfig;
  onUpdateGlobalHeader: (updates: Partial<HeaderFooterConfig>) => void;
  globalFooter: HeaderFooterConfig;
  onUpdateGlobalFooter: (updates: Partial<HeaderFooterConfig>) => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
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

        {/* ── Block Properties ── */}
        <TabsContent value="block" className="p-3 space-y-4">
          {activeBlock ? (
            <>
              <div className="text-xs font-medium uppercase text-muted-foreground">
                {activeBlock.type === 'text' && 'Bloco de Texto'}
                {activeBlock.type === 'image' && 'Bloco de Imagem'}
                {activeBlock.type === 'table' && 'Bloco de Tabela'}
                {activeBlock.type === 'spacer' && 'Espaçador'}
              </div>

              {/* Common props */}
              <div className="space-y-2">
                <Label className="text-xs">Largura (%)</Label>
                <Slider
                  value={[activeBlock.width]}
                  onValueChange={([v]) => onUpdateBlock({ width: v })}
                  min={20} max={100} step={5}
                />
                <span className="text-xs text-muted-foreground">{activeBlock.width}%</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Margem sup.</Label>
                  <Input
                    type="number"
                    value={activeBlock.marginTop}
                    onChange={(e) => onUpdateBlock({ marginTop: Number(e.target.value) })}
                    className="h-7 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">Margem inf.</Label>
                  <Input
                    type="number"
                    value={activeBlock.marginBottom}
                    onChange={(e) => onUpdateBlock({ marginBottom: Number(e.target.value) })}
                    className="h-7 text-xs"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs">Alinhamento</Label>
                <Select
                  value={activeBlock.alignment}
                  onValueChange={(v) => onUpdateBlock({ alignment: v as DocumentBlock['alignment'] })}
                >
                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Esquerda</SelectItem>
                    <SelectItem value="center">Centro</SelectItem>
                    <SelectItem value="right">Direita</SelectItem>
                    <SelectItem value="justify">Justificado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Text-specific */}
              {activeBlock.type === 'text' && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <Label className="text-xs">Tamanho fonte (pt)</Label>
                    <Input
                      type="number"
                      value={(activeBlock as TextBlock).fontSize}
                      onChange={(e) => onUpdateBlock({ fontSize: Number(e.target.value) } as Partial<TextBlock>)}
                      className="h-7 text-xs"
                      min={6} max={72}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Entrelinha</Label>
                    <Slider
                      value={[(activeBlock as TextBlock).lineHeight * 10]}
                      onValueChange={([v]) => onUpdateBlock({ lineHeight: v / 10 } as Partial<TextBlock>)}
                      min={10} max={30} step={1}
                    />
                    <span className="text-xs text-muted-foreground">{(activeBlock as TextBlock).lineHeight}×</span>
                  </div>
                </>
              )}

              {/* Image-specific */}
              {activeBlock.type === 'image' && (
                <>
                  <Separator />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Largura (mm)</Label>
                      <Input
                        type="number"
                        value={(activeBlock as ImageBlock).displayWidth}
                        onChange={(e) => {
                          const w = Number(e.target.value);
                          const img = activeBlock as ImageBlock;
                          const h = img.lockAspectRatio && img.originalWidth > 0
                            ? w * (img.originalHeight / img.originalWidth)
                            : img.displayHeight;
                          onUpdateBlock({ displayWidth: w, displayHeight: h } as Partial<ImageBlock>);
                        }}
                        className="h-7 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Altura (mm)</Label>
                      <Input
                        type="number"
                        value={(activeBlock as ImageBlock).displayHeight}
                        onChange={(e) => onUpdateBlock({ displayHeight: Number(e.target.value) } as Partial<ImageBlock>)}
                        className="h-7 text-xs"
                        disabled={(activeBlock as ImageBlock).lockAspectRatio}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={(activeBlock as ImageBlock).lockAspectRatio}
                      onCheckedChange={(v) => onUpdateBlock({ lockAspectRatio: v } as Partial<ImageBlock>)}
                    />
                    <Label className="text-xs">Manter proporção</Label>
                  </div>
                  <div>
                    <Label className="text-xs">Legenda</Label>
                    <Input
                      value={(activeBlock as ImageBlock).caption}
                      onChange={(e) => onUpdateBlock({ caption: e.target.value } as Partial<ImageBlock>)}
                      className="h-7 text-xs"
                      placeholder="Legenda da imagem"
                    />
                  </div>
                </>
              )}

              {/* Spacer-specific */}
              {activeBlock.type === 'spacer' && (
                <>
                  <Separator />
                  <div>
                    <Label className="text-xs">Altura (mm)</Label>
                    <Slider
                      value={[(activeBlock as SpacerBlock).height]}
                      onValueChange={([v]) => onUpdateBlock({ height: v } as Partial<SpacerBlock>)}
                      min={2} max={100} step={1}
                    />
                    <span className="text-xs text-muted-foreground">{(activeBlock as SpacerBlock).height}mm</span>
                  </div>
                </>
              )}
            </>
          ) : (
            <p className="text-xs text-muted-foreground py-4 text-center">
              Selecione um bloco para editar suas propriedades
            </p>
          )}
        </TabsContent>

        {/* ── Layout Properties ── */}
        <TabsContent value="layout" className="p-3 space-y-4">
          <div className="text-xs font-medium uppercase text-muted-foreground">Margens (mm)</div>
          <div className="grid grid-cols-2 gap-2">
            {(['marginTop', 'marginBottom', 'marginLeft', 'marginRight'] as const).map(key => (
              <div key={key}>
                <Label className="text-xs">
                  {key === 'marginTop' ? 'Superior' : key === 'marginBottom' ? 'Inferior' : key === 'marginLeft' ? 'Esquerda' : 'Direita'}
                </Label>
                <Input
                  type="number"
                  value={layout[key]}
                  onChange={(e) => onUpdateLayout({ [key]: Number(e.target.value) })}
                  className="h-7 text-xs"
                  min={5} max={60}
                />
              </div>
            ))}
          </div>
          <Separator />
          <div className="text-xs font-medium uppercase text-muted-foreground">Espaçamentos (mm)</div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Header → Conteúdo</Label>
              <Input
                type="number"
                value={layout.headerSpacing}
                onChange={(e) => onUpdateLayout({ headerSpacing: Number(e.target.value) })}
                className="h-7 text-xs"
                min={0} max={40}
              />
            </div>
            <div>
              <Label className="text-xs">Conteúdo → Footer</Label>
              <Input
                type="number"
                value={layout.footerSpacing}
                onChange={(e) => onUpdateLayout({ footerSpacing: Number(e.target.value) })}
                className="h-7 text-xs"
                min={0} max={40}
              />
            </div>
          </div>
        </TabsContent>

        {/* ── Header / Footer ── */}
        <TabsContent value="hf" className="p-3 space-y-4">
          {/* Header */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase text-muted-foreground">Cabeçalho Global</span>
              <Switch
                checked={globalHeader.enabled}
                onCheckedChange={(v) => onUpdateGlobalHeader({ enabled: v })}
              />
            </div>
            {globalHeader.enabled && (
              <div className="space-y-2">
                <div>
                  <Label className="text-xs">Altura (mm)</Label>
                  <Input
                    type="number"
                    value={globalHeader.height}
                    onChange={(e) => onUpdateGlobalHeader({ height: Number(e.target.value) })}
                    className="h-7 text-xs"
                    min={5} max={60}
                  />
                </div>
                <div>
                  <Label className="text-xs">Alinhamento</Label>
                  <Select
                    value={globalHeader.alignment}
                    onValueChange={(v) => onUpdateGlobalHeader({ alignment: v as HeaderFooterConfig['alignment'] })}
                  >
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
          </div>

          <Separator />

          {/* Footer */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase text-muted-foreground">Rodapé Global</span>
              <Switch
                checked={globalFooter.enabled}
                onCheckedChange={(v) => onUpdateGlobalFooter({ enabled: v })}
              />
            </div>
            {globalFooter.enabled && (
              <div className="space-y-2">
                <div>
                  <Label className="text-xs">Altura (mm)</Label>
                  <Input
                    type="number"
                    value={globalFooter.height}
                    onChange={(e) => onUpdateGlobalFooter({ height: Number(e.target.value) })}
                    className="h-7 text-xs"
                    min={5} max={60}
                  />
                </div>
                <div>
                  <Label className="text-xs">Alinhamento</Label>
                  <Select
                    value={globalFooter.alignment}
                    onValueChange={(v) => onUpdateGlobalFooter({ alignment: v as HeaderFooterConfig['alignment'] })}
                  >
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
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
