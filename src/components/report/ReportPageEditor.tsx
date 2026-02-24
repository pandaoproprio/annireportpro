import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BookOpen, FileText, PanelBottom, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  coverTitle: string;
  setCoverTitle: (v: string) => void;
  coverSubtitle: string;
  setCoverSubtitle: (v: string) => void;
  headerLeftText: string;
  setHeaderLeftText: (v: string) => void;
  headerRightText: string;
  setHeaderRightText: (v: string) => void;
  headerBannerUrl: string;
  onHeaderBannerUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onHeaderBannerRemove: () => void;
  footerText: string;
  setFooterText: (v: string) => void;
  footerShowAddress: boolean;
  setFooterShowAddress: (v: boolean) => void;
  footerShowContact: boolean;
  setFooterShowContact: (v: boolean) => void;
  footerAlignment: 'left' | 'center' | 'right';
  setFooterAlignment: (v: 'left' | 'center' | 'right') => void;
  organizationName: string;
  organizationAddress?: string;
  organizationEmail?: string;
  organizationPhone?: string;
  organizationWebsite?: string;
}

export const ReportPageEditor: React.FC<Props> = ({
  coverTitle, setCoverTitle,
  coverSubtitle, setCoverSubtitle,
  headerLeftText, setHeaderLeftText,
  headerRightText, setHeaderRightText,
  headerBannerUrl, onHeaderBannerUpload, onHeaderBannerRemove,
  footerText, setFooterText,
  footerShowAddress, setFooterShowAddress,
  footerShowContact, setFooterShowContact,
  footerAlignment, setFooterAlignment,
  organizationName, organizationAddress, organizationEmail, organizationPhone, organizationWebsite,
}) => (
  <div className="space-y-4">
    {/* Cover Page */}
    <Card className="border-l-4 border-l-accent">
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 mb-4 border-b pb-2">
          <BookOpen className="w-5 h-5 text-accent-foreground" />
          <h3 className="text-lg font-semibold">Página de Rosto</h3>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Título Principal</Label>
            <Input
              value={coverTitle}
              onChange={e => setCoverTitle(e.target.value)}
              placeholder="Relatório Parcial de Cumprimento do Objeto"
            />
          </div>
          <div className="space-y-2">
            <Label>Subtítulo (opcional)</Label>
            <Input
              value={coverSubtitle}
              onChange={e => setCoverSubtitle(e.target.value)}
              placeholder="Ex: Período de Referência, Convênio nº..."
            />
          </div>
          <p className="text-xs text-muted-foreground">
            O nome do projeto, Termo de Fomento e nome da organização são exibidos automaticamente.
          </p>
        </div>
      </CardContent>
    </Card>

    {/* Header */}
    <Card className="border-l-4 border-l-primary">
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 mb-4 border-b pb-2">
          <FileText className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Cabeçalho</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Envie uma imagem de banner para ocupar toda a largura do cabeçalho, ou use texto + logos.
        </p>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Imagem de Banner (largura total)</Label>
            {headerBannerUrl ? (
              <div className="relative">
                <img src={headerBannerUrl} alt="Banner do cabeçalho" className="w-full h-auto max-h-24 object-contain border rounded bg-muted" />
                <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={onHeaderBannerRemove}>
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <div>
                <Input type="file" accept="image/*" onChange={onHeaderBannerUpload} />
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Texto Esquerda (opcional)</Label>
              <Input
                value={headerLeftText}
                onChange={e => setHeaderLeftText(e.target.value)}
                placeholder="Ex: Nome da Instituição"
              />
            </div>
            <div className="space-y-2">
              <Label>Texto Direita (opcional)</Label>
              <Input
                value={headerRightText}
                onChange={e => setHeaderRightText(e.target.value)}
                placeholder="Ex: Nº do Convênio"
              />
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
            <Textarea
              value={footerText}
              onChange={e => setFooterText(e.target.value)}
              placeholder="Texto adicional para o rodapé (opcional)"
              rows={2}
            />
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch checked={footerShowAddress} onCheckedChange={setFooterShowAddress} id="footer-address" />
              <Label htmlFor="footer-address" className="text-sm cursor-pointer">Exibir endereço</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={footerShowContact} onCheckedChange={setFooterShowContact} id="footer-contact" />
              <Label htmlFor="footer-contact" className="text-sm cursor-pointer">Exibir contato</Label>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Alinhamento do Rodapé</Label>
            <Select value={footerAlignment} onValueChange={(v) => setFooterAlignment(v as 'left' | 'center' | 'right')}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Esquerda</SelectItem>
                <SelectItem value="center">Centralizado</SelectItem>
                <SelectItem value="right">Direita</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1" style={{ textAlign: footerAlignment }}>
            <p className="font-semibold">Pré-visualização do rodapé:</p>
            <p className="font-medium">{organizationName}</p>
            {footerShowAddress && organizationAddress && <p>{organizationAddress}</p>}
            {footerShowContact && (
              <p>
                {organizationWebsite && <span>{organizationWebsite}</span>}
                {organizationEmail && <span> | {organizationEmail}</span>}
                {organizationPhone && <span> | {organizationPhone}</span>}
              </p>
            )}
            {footerText && <p className="italic mt-1">{footerText}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
);
