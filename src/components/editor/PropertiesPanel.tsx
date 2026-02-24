import React, { useRef, useCallback } from 'react';
import { DocumentBlock, TextBlock, ImageBlock, SpacerBlock, TableBlock } from '@/types/document';
import { LayoutConfig, HeaderFooterConfig } from '@/types/document';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { HeaderFooterRichEditor } from './HeaderFooterRichEditor';
import { Upload, Loader2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

const ImageUploadField: React.FC<{
  imageUrl?: string;
  onUpload: (url: string, w: number, h: number) => void;
  onRemove: () => void;
  label: string;
}> = ({ imageUrl, onUpload, onRemove, label }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `editor/hf/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from('document-images').upload(path, file, { contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from('document-images').getPublicUrl(path);
      const img = new Image();
      img.onload = () => { onUpload(data.publicUrl, img.naturalWidth, img.naturalHeight); setUploading(false); };
      img.onerror = () => { onUpload(data.publicUrl, 200, 60); setUploading(false); };
      img.src = data.publicUrl;
    } catch {
      toast.error('Erro ao enviar imagem');
      setUploading(false);
    }
  }, [onUpload]);

  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); e.target.value = ''; }} />
      {uploading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Enviando...</div>
      ) : imageUrl ? (
        <div className="flex items-center gap-2">
          <img src={imageUrl} alt="" className="h-8 rounded border object-contain" />
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onRemove}><X className="h-3 w-3" /></Button>
        </div>
      ) : (
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1 w-full" onClick={() => inputRef.current?.click()}>
          <Upload className="h-3 w-3" /> Enviar imagem
        </Button>
      )}
    </div>
  );
};

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  activeBlock, onUpdateBlock, layout, onUpdateLayout,
  globalHeader, onUpdateGlobalHeader, globalFooter, onUpdateGlobalFooter,
}) => {
  return (
    <div className="w-72 border-l bg-background overflow-y-auto h-full">
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

              <div className="space-y-2">
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
                  <div className="space-y-2">
                    <Label className="text-xs">Tamanho fonte (pt)</Label>
                    <Input type="number" value={(activeBlock as TextBlock).fontSize} onChange={(e) => onUpdateBlock({ fontSize: Number(e.target.value) } as Partial<TextBlock>)} className="h-7 text-xs" min={6} max={72} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Família da fonte</Label>
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
                  <div className="space-y-2">
                    <Label className="text-xs">Entrelinha</Label>
                    <Slider value={[(activeBlock as TextBlock).lineHeight * 10]} onValueChange={([v]) => onUpdateBlock({ lineHeight: v / 10 } as Partial<TextBlock>)} min={10} max={30} step={1} />
                    <span className="text-xs text-muted-foreground">{(activeBlock as TextBlock).lineHeight}×</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Switch checked={(activeBlock as TextBlock).bold} onCheckedChange={(v) => onUpdateBlock({ bold: v } as Partial<TextBlock>)} />
                      <Label className="text-xs font-bold">B</Label>
                    </div>
                    <div className="flex items-center gap-1">
                      <Switch checked={(activeBlock as TextBlock).italic} onCheckedChange={(v) => onUpdateBlock({ italic: v } as Partial<TextBlock>)} />
                      <Label className="text-xs italic">I</Label>
                    </div>
                    <div className="flex items-center gap-1">
                      <Switch checked={(activeBlock as TextBlock).underline} onCheckedChange={(v) => onUpdateBlock({ underline: v } as Partial<TextBlock>)} />
                      <Label className="text-xs underline">U</Label>
                    </div>
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
                    <Label className="text-xs">Manter proporção</Label>
                  </div>
                  <div>
                    <Label className="text-xs">Legenda</Label>
                    <Input value={(activeBlock as ImageBlock).caption} onChange={(e) => onUpdateBlock({ caption: e.target.value } as Partial<ImageBlock>)} className="h-7 text-xs" placeholder="Legenda da imagem" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Borda (px)</Label>
                      <Input type="number" value={(activeBlock as ImageBlock).borderWidth} onChange={(e) => onUpdateBlock({ borderWidth: Number(e.target.value) } as Partial<ImageBlock>)} className="h-7 text-xs" min={0} max={10} />
                    </div>
                    <div>
                      <Label className="text-xs">Cor borda</Label>
                      <Input type="color" value={(activeBlock as ImageBlock).borderColor} onChange={(e) => onUpdateBlock({ borderColor: e.target.value } as Partial<ImageBlock>)} className="h-7 text-xs p-0.5" />
                    </div>
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
                    <Label className="text-xs">Linha de cabeçalho</Label>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Borda (px)</Label>
                      <Input type="number" value={(activeBlock as TableBlock).borderWidth} onChange={(e) => onUpdateBlock({ borderWidth: Number(e.target.value) } as Partial<TableBlock>)} className="h-7 text-xs" min={0} max={5} />
                    </div>
                    <div>
                      <Label className="text-xs">Cor borda</Label>
                      <Input type="color" value={(activeBlock as TableBlock).borderColor} onChange={(e) => onUpdateBlock({ borderColor: e.target.value } as Partial<TableBlock>)} className="h-7 text-xs p-0.5" />
                    </div>
                  </div>
                </>
              )}
            </>
          ) : (
            <p className="text-xs text-muted-foreground py-4 text-center">Selecione um bloco para editar suas propriedades</p>
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
                <Input type="number" value={layout[key]} onChange={(e) => onUpdateLayout({ [key]: Number(e.target.value) })} className="h-7 text-xs" min={5} max={60} />
              </div>
            ))}
          </div>
          <Separator />
          <div className="text-xs font-medium uppercase text-muted-foreground">Espaçamentos (mm)</div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Header → Conteúdo</Label>
              <Input type="number" value={layout.headerSpacing} onChange={(e) => onUpdateLayout({ headerSpacing: Number(e.target.value) })} className="h-7 text-xs" min={0} max={40} />
            </div>
            <div>
              <Label className="text-xs">Conteúdo → Footer</Label>
              <Input type="number" value={layout.footerSpacing} onChange={(e) => onUpdateLayout({ footerSpacing: Number(e.target.value) })} className="h-7 text-xs" min={0} max={40} />
            </div>
          </div>
        </TabsContent>

        {/* ── Header / Footer ── */}
        <TabsContent value="hf" className="p-3 space-y-4">
          {/* Header */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase text-muted-foreground">Cabeçalho Global</span>
              <Switch checked={globalHeader.enabled} onCheckedChange={(v) => onUpdateGlobalHeader({ enabled: v })} />
            </div>
            {globalHeader.enabled && (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Altura (mm)</Label>
                  <Input type="number" value={globalHeader.height} onChange={(e) => onUpdateGlobalHeader({ height: Number(e.target.value) })} className="h-7 text-xs" min={5} max={60} />
                </div>
                <div>
                  <Label className="text-xs">Alinhamento</Label>
                  <Select value={globalHeader.alignment} onValueChange={(v) => onUpdateGlobalHeader({ alignment: v as HeaderFooterConfig['alignment'] })}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">Esquerda</SelectItem>
                      <SelectItem value="center">Centro</SelectItem>
                      <SelectItem value="right">Direita</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Tamanho fonte</Label>
                  <Input type="number" value={globalHeader.fontSize} onChange={(e) => onUpdateGlobalHeader({ fontSize: Number(e.target.value) })} className="h-7 text-xs" min={6} max={24} />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Conteúdo</Label>
                  <HeaderFooterRichEditor content={globalHeader.content} onChange={(html) => onUpdateGlobalHeader({ content: html })} placeholder="Texto do cabeçalho..." />
                </div>
                <ImageUploadField
                  imageUrl={globalHeader.imageUrl}
                  onUpload={(url, w, h) => onUpdateGlobalHeader({ imageUrl: url, imageWidth: w, imageHeight: h })}
                  onRemove={() => onUpdateGlobalHeader({ imageUrl: undefined, imageWidth: undefined, imageHeight: undefined })}
                  label="Imagem do cabeçalho"
                />
              </div>
            )}
          </div>

          <Separator />

          {/* Footer */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase text-muted-foreground">Rodapé Global</span>
              <Switch checked={globalFooter.enabled} onCheckedChange={(v) => onUpdateGlobalFooter({ enabled: v })} />
            </div>
            {globalFooter.enabled && (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Altura (mm)</Label>
                  <Input type="number" value={globalFooter.height} onChange={(e) => onUpdateGlobalFooter({ height: Number(e.target.value) })} className="h-7 text-xs" min={5} max={60} />
                </div>
                <div>
                  <Label className="text-xs">Alinhamento</Label>
                  <Select value={globalFooter.alignment} onValueChange={(v) => onUpdateGlobalFooter({ alignment: v as HeaderFooterConfig['alignment'] })}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">Esquerda</SelectItem>
                      <SelectItem value="center">Centro</SelectItem>
                      <SelectItem value="right">Direita</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Tamanho fonte</Label>
                  <Input type="number" value={globalFooter.fontSize} onChange={(e) => onUpdateGlobalFooter({ fontSize: Number(e.target.value) })} className="h-7 text-xs" min={6} max={24} />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Conteúdo</Label>
                  <HeaderFooterRichEditor content={globalFooter.content} onChange={(html) => onUpdateGlobalFooter({ content: html })} placeholder="Texto do rodapé..." />
                </div>
                <ImageUploadField
                  imageUrl={globalFooter.imageUrl}
                  onUpload={(url, w, h) => onUpdateGlobalFooter({ imageUrl: url, imageWidth: w, imageHeight: h })}
                  onRemove={() => onUpdateGlobalFooter({ imageUrl: undefined, imageWidth: undefined, imageHeight: undefined })}
                  label="Imagem do rodapé"
                />
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
