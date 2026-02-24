import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BookOpen, FileText, PanelBottom, Image, X, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReportVisualConfig } from '@/hooks/useReportVisualConfig';

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
            <div className="space-y-2">
              <Label>Título Principal</Label>
              <Input value={config.coverTitle} onChange={e => updateConfig({ coverTitle: e.target.value })} placeholder="Relatório Parcial de Cumprimento do Objeto" />
            </div>
            <div className="space-y-2">
              <Label>Subtítulo (opcional)</Label>
              <Input value={config.coverSubtitle} onChange={e => updateConfig({ coverSubtitle: e.target.value })} placeholder="Ex: Período de Referência, Convênio nº..." />
            </div>
            <p className="text-xs text-muted-foreground">O nome do projeto, Termo de Fomento e nome da organização são exibidos automaticamente.</p>
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
              <div className="relative">
                <img src={config.headerBannerUrl} alt="Banner do cabeçalho" className="w-full h-auto max-h-24 object-contain border rounded bg-muted" />
                <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => updateConfig({ headerBannerUrl: '' })}>
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <Input type="file" accept="image/*" onChange={onBannerUpload} />
            )}
          </div>

          {/* 3 Logos */}
          {!config.headerBannerUrl && (
            <div className="space-y-2">
              <Label>Modo B — Três Logos Separados</Label>
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col items-center gap-1">
                  {config.logo ? <img src={config.logo} className="h-12 w-12 object-contain border rounded" /> : <div className="h-12 w-12 bg-muted rounded flex items-center justify-center text-[10px] text-muted-foreground">ESQ</div>}
                  <Input type="file" accept="image/*" className="text-xs" onChange={e => onLogoUpload(e, 'primary')} />
                </div>
                <div className="flex flex-col items-center gap-1">
                  {config.logoCenter ? <img src={config.logoCenter} className="h-12 w-12 object-contain border rounded" /> : <div className="h-12 w-12 bg-muted rounded flex items-center justify-center text-[10px] text-muted-foreground">CEN</div>}
                  <Input type="file" accept="image/*" className="text-xs" onChange={e => onLogoUpload(e, 'center')} />
                </div>
                <div className="flex flex-col items-center gap-1">
                  {config.logoSecondary ? <img src={config.logoSecondary} className="h-12 w-12 object-contain border rounded" /> : <div className="h-12 w-12 bg-muted rounded flex items-center justify-center text-[10px] text-muted-foreground">DIR</div>}
                  <Input type="file" accept="image/*" className="text-xs" onChange={e => onLogoUpload(e, 'secondary')} />
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
