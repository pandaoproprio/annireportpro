import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { BookOpen, FileText, PanelBottom, X, Save, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReportVisualConfig, LogoConfig } from '@/hooks/useReportVisualConfig';

interface Props {
  config: ReportVisualConfig;
  updateConfig: (partial: Partial<ReportVisualConfig>) => void;
  onSave: () => void;
  onLogoUpload: (e: React.ChangeEvent<HTMLInputElement>, position?: 'primary' | 'center' | 'secondary') => void;
  onBannerUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  organizationName: string;
  organizationAddress?: string;
  organizationEmail?: string;
  organizationPhone?: string;
  organizationWebsite?: string;
  showCoverConfig?: boolean;
}

const LogoSlot: React.FC<{
  label: string;
  src: string;
  logoConfig: LogoConfig;
  onConfigChange: (c: Partial<LogoConfig>) => void;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}> = ({ label, src, logoConfig, onConfigChange, onUpload }) => (
  <div className="flex flex-col items-center gap-1 p-2 border rounded-lg bg-muted/30">
    <span className="text-[10px] font-medium text-muted-foreground uppercase">{label}</span>
    {src ? (
      <div className="relative">
        <img src={src} className="h-12 w-12 object-contain border rounded" style={{ opacity: logoConfig.visible ? 1 : 0.3 }} />
        <Button
          variant="ghost" size="icon"
          className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-background shadow"
          onClick={() => onConfigChange({ visible: !logoConfig.visible })}
          title={logoConfig.visible ? 'Ocultar' : 'Mostrar'}
        >
          {logoConfig.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
        </Button>
      </div>
    ) : (
      <div className="h-12 w-12 bg-muted rounded flex items-center justify-center text-[10px] text-muted-foreground">{label.substring(0, 3)}</div>
    )}
    <Input type="file" accept="image/*" className="text-xs" onChange={onUpload} />
    {src && (
      <div className="w-full space-y-1">
        <Label className="text-[10px]">Largura (mm): {logoConfig.widthMm}</Label>
        <Slider
          value={[logoConfig.widthMm]}
          min={5} max={60} step={1}
          onValueChange={([v]) => onConfigChange({ widthMm: v })}
        />
      </div>
    )}
  </div>
);

export const ReportVisualConfigEditor: React.FC<Props> = ({
  config, updateConfig, onSave, onLogoUpload, onBannerUpload,
  organizationName, organizationAddress, organizationEmail, organizationPhone, organizationWebsite,
  showCoverConfig = false,
}) => (
  <div className="space-y-4">
    {/* Cover Page (optional) */}
    {showCoverConfig && (
      <Card className="border-l-4 border-l-accent">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-4 border-b pb-2">
            <BookOpen className="w-5 h-5 text-accent-foreground" />
            <h3 className="text-lg font-semibold">Página de Rosto</h3>
          </div>
          <div className="space-y-4">
            {/* Title */}
            <div className="space-y-2">
              <Label>Título Principal</Label>
              <Input value={config.coverTitle} onChange={e => updateConfig({ coverTitle: e.target.value })} placeholder="Relatório Parcial de Cumprimento do Objeto" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Tamanho (pt)</Label>
                  <Input type="number" min={8} max={30} value={config.coverTitleFontSize} onChange={e => updateConfig({ coverTitleFontSize: Number(e.target.value) })} />
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <Switch checked={config.coverTitleBold} onCheckedChange={v => updateConfig({ coverTitleBold: v })} id="cover-bold" />
                  <Label htmlFor="cover-bold" className="text-xs cursor-pointer">Negrito</Label>
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <Switch checked={config.coverTitleItalic} onCheckedChange={v => updateConfig({ coverTitleItalic: v })} id="cover-italic" />
                  <Label htmlFor="cover-italic" className="text-xs cursor-pointer">Itálico</Label>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Alinhamento</Label>
                  <Select value={config.coverTitleAlignment} onValueChange={v => updateConfig({ coverTitleAlignment: v as any })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">Esquerda</SelectItem>
                      <SelectItem value="center">Centro</SelectItem>
                      <SelectItem value="right">Direita</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Subtitle */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>Subtítulo</Label>
                <Switch checked={!config.coverHideSubtitle} onCheckedChange={v => updateConfig({ coverHideSubtitle: !v })} />
              </div>
              {!config.coverHideSubtitle && (
                <>
                  <Input value={config.coverSubtitle} onChange={e => updateConfig({ coverSubtitle: e.target.value })} placeholder="Ex: Período de Referência, Convênio nº..." />
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Tamanho (pt)</Label>
                      <Input type="number" min={8} max={24} value={config.coverSubtitleFontSize} onChange={e => updateConfig({ coverSubtitleFontSize: Number(e.target.value) })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Alinhamento</Label>
                      <Select value={config.coverSubtitleAlignment} onValueChange={v => updateConfig({ coverSubtitleAlignment: v as any })}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="left">Esquerda</SelectItem>
                          <SelectItem value="center">Centro</SelectItem>
                          <SelectItem value="right">Direita</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Fomento / Org visibility */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={!config.coverHideFomento} onCheckedChange={v => updateConfig({ coverHideFomento: !v })} id="cover-fomento" />
                <Label htmlFor="cover-fomento" className="text-xs cursor-pointer">Exibir Termo de Fomento</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={!config.coverHideOrg} onCheckedChange={v => updateConfig({ coverHideOrg: !v })} id="cover-org" />
                <Label htmlFor="cover-org" className="text-xs cursor-pointer">Exibir Organização</Label>
              </div>
            </div>

            {/* Spacings */}
            <div className="space-y-3 bg-muted/30 rounded-lg p-3">
              <Label className="text-xs font-medium text-muted-foreground uppercase">Espaçamentos</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Logo ↔ Título ({config.coverSpacingLogoTitle}mm)</Label>
                  <Slider value={[config.coverSpacingLogoTitle]} min={0} max={60} step={1} onValueChange={([v]) => updateConfig({ coverSpacingLogoTitle: v })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Título ↔ Subtítulo ({config.coverSpacingTitleSubtitle}mm)</Label>
                  <Slider value={[config.coverSpacingTitleSubtitle]} min={0} max={40} step={1} onValueChange={([v]) => updateConfig({ coverSpacingTitleSubtitle: v })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Subtítulo ↔ Rodapé ({config.coverSpacingSubtitleBottom}mm)</Label>
                  <Slider value={[config.coverSpacingSubtitleBottom]} min={0} max={60} step={1} onValueChange={([v]) => updateConfig({ coverSpacingSubtitleBottom: v })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Entrelinha ({config.coverLineSpacing}x)</Label>
                  <Slider value={[config.coverLineSpacing * 10]} min={10} max={30} step={1} onValueChange={([v]) => updateConfig({ coverLineSpacing: v / 10 })} />
                </div>
              </div>
              {/* Cover logo upload */}
              <div className="space-y-2 bg-background rounded-lg p-3 border">
                <Label className="text-xs font-medium uppercase text-muted-foreground">Logo da Página de Rosto</Label>
                {config.coverLogo ? (
                  <div className="relative inline-block">
                    <img src={config.coverLogo} className="h-16 w-16 object-contain border rounded" style={{ opacity: config.coverLogoVisible ? 1 : 0.3 }} />
                    <Button
                      variant="ghost" size="icon"
                      className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-background shadow"
                      onClick={() => updateConfig({ coverLogoVisible: !config.coverLogoVisible })}
                      title={config.coverLogoVisible ? 'Ocultar' : 'Mostrar'}
                    >
                      {config.coverLogoVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    </Button>
                    <Button variant="destructive" size="icon" className="absolute -top-1 -left-1 h-5 w-5 rounded-full" onClick={() => updateConfig({ coverLogo: '' })}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <p className="text-[10px] text-muted-foreground">Se não enviar, o logo primário do cabeçalho será usado.</p>
                    <Input type="file" accept="image/*" className="text-xs" onChange={e => onLogoUpload(e, 'cover' as any)} />
                  </>
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Logo da capa — Largura ({config.coverLogoWidthMm}mm)</Label>
                <Slider value={[config.coverLogoWidthMm]} min={10} max={120} step={1} onValueChange={([v]) => updateConfig({ coverLogoWidthMm: v })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Logo da capa — Dist. do topo ({config.coverLogoTopMm}mm)</Label>
                <Slider value={[config.coverLogoTopMm]} min={5} max={100} step={1} onValueChange={([v]) => updateConfig({ coverLogoTopMm: v })} />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={config.coverLogoCenterV} onCheckedChange={v => updateConfig({ coverLogoCenterV: v })} id="cover-centerv" />
                <Label htmlFor="cover-centerv" className="text-xs cursor-pointer">Centralizar logo verticalmente na capa</Label>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">O nome do projeto é exibido automaticamente.</p>
          </div>
        </CardContent>
      </Card>
    )}

    {/* Header */}
    <Card className="border-l-4 border-l-primary">
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 mb-4 border-b pb-2">
          <FileText className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Cabeçalho</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Envie uma imagem de banner para ocupar toda a largura do cabeçalho, ou use 3 logos separados.
        </p>
        <div className="space-y-4">
          {/* Banner */}
          <div className="space-y-2">
            <Label>Modo A — Imagem de Banner (largura total)</Label>
            {config.headerBannerUrl ? (
              <div className="space-y-3">
                <div className="relative">
                  <img
                    src={config.headerBannerUrl}
                    alt="Banner do cabeçalho"
                    className="w-full h-auto border rounded bg-muted"
                    style={{
                      maxHeight: `${config.headerBannerHeightMm * 3}px`,
                      objectFit: config.headerBannerFit,
                      opacity: config.headerBannerVisible ? 1 : 0.3,
                    }}
                  />
                  <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => updateConfig({ headerBannerUrl: '' })}>
                    <X className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost" size="icon"
                    className="absolute top-1 right-9 h-6 w-6 bg-background shadow rounded-full"
                    onClick={() => updateConfig({ headerBannerVisible: !config.headerBannerVisible })}
                    title={config.headerBannerVisible ? 'Ocultar' : 'Mostrar'}
                  >
                    {config.headerBannerVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-muted/30 rounded-lg p-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Altura do banner ({config.headerBannerHeightMm}mm)</Label>
                    <Slider value={[config.headerBannerHeightMm]} min={10} max={60} step={1} onValueChange={([v]) => updateConfig({ headerBannerHeightMm: v })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Ajuste da imagem</Label>
                    <Select value={config.headerBannerFit} onValueChange={v => updateConfig({ headerBannerFit: v as any })}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="contain">Conter (sem corte)</SelectItem>
                        <SelectItem value="cover">Cobrir (pode cortar)</SelectItem>
                        <SelectItem value="fill">Esticar (preencher)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ) : (
              <Input type="file" accept="image/*" onChange={onBannerUpload} />
            )}
          </div>

          {/* 3 Logos */}
          {!config.headerBannerUrl && (
            <div className="space-y-3">
              <Label>Modo B — Três Logos Separados</Label>
              <div className="grid grid-cols-3 gap-3">
                <LogoSlot
                  label="Esquerda"
                  src={config.logo}
                  logoConfig={config.logoConfig}
                  onConfigChange={c => updateConfig({ logoConfig: { ...config.logoConfig, ...c } })}
                  onUpload={e => onLogoUpload(e, 'primary')}
                />
                <LogoSlot
                  label="Centro"
                  src={config.logoCenter}
                  logoConfig={config.logoCenterConfig}
                  onConfigChange={c => updateConfig({ logoCenterConfig: { ...config.logoCenterConfig, ...c } })}
                  onUpload={e => onLogoUpload(e, 'center')}
                />
                <LogoSlot
                  label="Direita"
                  src={config.logoSecondary}
                  logoConfig={config.logoSecondaryConfig}
                  onConfigChange={c => updateConfig({ logoSecondaryConfig: { ...config.logoSecondaryConfig, ...c } })}
                  onUpload={e => onLogoUpload(e, 'secondary')}
                />
              </div>

              {/* Header layout controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-muted/30 rounded-lg p-3">
                <div className="space-y-1">
                  <Label className="text-xs">Distribuição dos logos</Label>
                  <Select value={config.headerLogoAlignment} onValueChange={v => updateConfig({ headerLogoAlignment: v as any })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="space-between">Distribuído (extremidades)</SelectItem>
                      <SelectItem value="space-around">Distribuído (uniforme)</SelectItem>
                      <SelectItem value="center">Centralizado</SelectItem>
                      <SelectItem value="left">Esquerda</SelectItem>
                      <SelectItem value="right">Direita</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Espaço entre logos ({config.headerLogoGap}mm)</Label>
                  <Slider value={[config.headerLogoGap]} min={0} max={40} step={1} onValueChange={([v]) => updateConfig({ headerLogoGap: v })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Dist. do topo ({config.headerTopPadding}mm)</Label>
                  <Slider value={[config.headerTopPadding]} min={2} max={20} step={1} onValueChange={([v]) => updateConfig({ headerTopPadding: v })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Altura total cabeçalho ({config.headerHeight}mm)</Label>
                  <Slider value={[config.headerHeight]} min={10} max={50} step={1} onValueChange={([v]) => updateConfig({ headerHeight: v })} />
                </div>
              </div>
            </div>
          )}

          {/* Text fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Texto Esquerda (opcional)</Label>
              <Input value={config.headerLeftText} onChange={e => updateConfig({ headerLeftText: e.target.value })} placeholder="Ex: Nome da Instituição" />
            </div>
            <div className="space-y-2">
              <Label>Texto Direita (opcional)</Label>
              <Input value={config.headerRightText} onChange={e => updateConfig({ headerRightText: e.target.value })} placeholder="Ex: Nº do Convênio" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    {/* Footer */}
    <Card className="border-l-4 border-l-muted-foreground">
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 mb-4 border-b pb-2">
          <PanelBottom className="w-5 h-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Rodapé</h3>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Texto Personalizado do Rodapé</Label>
            <Textarea value={config.footerText} onChange={e => updateConfig({ footerText: e.target.value })} placeholder="Texto adicional para o rodapé (opcional)" rows={2} />
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch checked={config.footerShowAddress} onCheckedChange={v => updateConfig({ footerShowAddress: v })} id="vc-footer-address" />
              <Label htmlFor="vc-footer-address" className="text-sm cursor-pointer">Exibir endereço</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={config.footerShowContact} onCheckedChange={v => updateConfig({ footerShowContact: v })} id="vc-footer-contact" />
              <Label htmlFor="vc-footer-contact" className="text-sm cursor-pointer">Exibir contato</Label>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Alinhamento do Rodapé</Label>
            <Select value={config.footerAlignment} onValueChange={(v) => updateConfig({ footerAlignment: v as 'left' | 'center' | 'right' })}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Esquerda</SelectItem>
                <SelectItem value="center">Centralizado</SelectItem>
                <SelectItem value="right">Direita</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* Preview */}
          <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1" style={{ textAlign: config.footerAlignment }}>
            <p className="font-semibold">Pré-visualização do rodapé:</p>
            <p className="font-medium">{organizationName}</p>
            {config.footerShowAddress && organizationAddress && <p>{organizationAddress}</p>}
            {config.footerShowContact && (
              <p>
                {organizationWebsite && <span>{organizationWebsite}</span>}
                {organizationEmail && <span> | {organizationEmail}</span>}
                {organizationPhone && <span> | {organizationPhone}</span>}
              </p>
            )}
            {config.footerText && <p className="italic mt-1">{config.footerText}</p>}
          </div>
        </div>
      </CardContent>
    </Card>

    {/* Save button */}
    <div className="flex justify-end">
      <Button onClick={onSave} variant="outline" size="sm" className="gap-1">
        <Save className="w-4 h-4" /> Salvar Configuração Visual
      </Button>
    </div>
  </div>
);
