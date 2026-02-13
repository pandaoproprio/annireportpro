import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  logo: string;
  logoSecondary: string;
  onLogoUpload: (e: React.ChangeEvent<HTMLInputElement>, isSecondary?: boolean) => void;
}

export const ReportLogoEditor: React.FC<Props> = ({ logo, logoSecondary, onLogoUpload }) => (
  <Card className="border-l-4 border-l-primary">
    <CardContent className="pt-6">
      <div className="flex items-center gap-2 mb-4 border-b pb-2">
        <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">C</span>
        <h3 className="text-lg font-semibold">Capa e Logos</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            {logo ? <img src={logo} className="h-16 w-16 object-contain border rounded" /> : <div className="h-16 w-16 bg-muted rounded flex items-center justify-center text-xs">LOGO</div>}
            <div className="flex-1">
              <Label>Logo Principal (Esquerda)</Label>
              <Input type="file" accept="image/*" onChange={e => onLogoUpload(e, false)} />
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            {logoSecondary ? <img src={logoSecondary} className="h-16 w-16 object-contain border rounded" /> : <div className="h-16 w-16 bg-muted rounded flex items-center justify-center text-xs">LOGO</div>}
            <div className="flex-1">
              <Label>Logo Secundário (Direita)</Label>
              <Input type="file" accept="image/*" onChange={e => onLogoUpload(e, true)} />
            </div>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);
