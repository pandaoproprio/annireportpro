import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  logo: string;
  logoCenter: string;
  logoSecondary: string;
  onLogoUpload: (e: React.ChangeEvent<HTMLInputElement>, position?: 'primary' | 'center' | 'secondary') => void;
}

export const ReportLogoEditor: React.FC<Props> = ({ logo, logoCenter, logoSecondary, onLogoUpload }) => (
  <Card className="border-l-4 border-l-primary">
    <CardContent className="pt-6">
      <div className="flex items-center gap-2 mb-4 border-b pb-2">
        <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">C</span>
        <h3 className="text-lg font-semibold">Logos do Cabeçalho</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Envie até 3 logos individuais que serão exibidos lado a lado no cabeçalho (alternativa ao banner).
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <div className="flex flex-col items-center gap-2">
            {logo ? <img src={logo} className="h-14 w-14 object-contain border rounded" /> : <div className="h-14 w-14 bg-muted rounded flex items-center justify-center text-[10px] text-muted-foreground">LOGO</div>}
            <div className="w-full">
              <Label className="text-xs">Esquerda</Label>
              <Input type="file" accept="image/*" className="text-xs" onChange={e => onLogoUpload(e, 'primary')} />
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex flex-col items-center gap-2">
            {logoCenter ? <img src={logoCenter} className="h-14 w-14 object-contain border rounded" /> : <div className="h-14 w-14 bg-muted rounded flex items-center justify-center text-[10px] text-muted-foreground">LOGO</div>}
            <div className="w-full">
              <Label className="text-xs">Centro</Label>
              <Input type="file" accept="image/*" className="text-xs" onChange={e => onLogoUpload(e, 'center')} />
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex flex-col items-center gap-2">
            {logoSecondary ? <img src={logoSecondary} className="h-14 w-14 object-contain border rounded" /> : <div className="h-14 w-14 bg-muted rounded flex items-center justify-center text-[10px] text-muted-foreground">LOGO</div>}
            <div className="w-full">
              <Label className="text-xs">Direita</Label>
              <Input type="file" accept="image/*" className="text-xs" onChange={e => onLogoUpload(e, 'secondary')} />
            </div>
          </div>
        </div>
      </div>
      {/* Preview */}
      {(logo || logoCenter || logoSecondary) && (
        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <p className="text-xs text-muted-foreground mb-2 font-semibold">Pré-visualização:</p>
          <div className="flex items-center justify-between">
            <div className="flex-1 flex justify-start">
              {logo ? <img src={logo} className="h-10 object-contain" /> : <div className="w-10" />}
            </div>
            <div className="flex-1 flex justify-center">
              {logoCenter ? <img src={logoCenter} className="h-10 object-contain" /> : <div className="w-10" />}
            </div>
            <div className="flex-1 flex justify-end">
              {logoSecondary ? <img src={logoSecondary} className="h-10 object-contain" /> : <div className="w-10" />}
            </div>
          </div>
        </div>
      )}
    </CardContent>
  </Card>
);
