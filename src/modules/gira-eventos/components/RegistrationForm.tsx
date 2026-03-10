import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

interface RegistrationFormProps {
  onSubmit: (data: { name: string; email: string; phone: string; document: string }) => void;
  isLoading?: boolean;
  maxReached?: boolean;
}

export const RegistrationForm: React.FC<RegistrationFormProps> = ({ onSubmit, isLoading, maxReached }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [document, setDocument] = useState('');
  const [lgpdConsent, setLgpdConsent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !lgpdConsent) return;
    onSubmit({ name: name.trim(), email: email.trim(), phone: phone.trim(), document: document.trim() });
  };

  if (maxReached) {
    return (
      <div className="text-center p-6 bg-muted rounded-lg">
        <p className="text-muted-foreground font-medium">As vagas para este evento foram preenchidas.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="reg-name">Nome completo *</Label>
        <Input id="reg-name" value={name} onChange={e => setName(e.target.value)} required placeholder="Seu nome" />
      </div>
      <div>
        <Label htmlFor="reg-email">E-mail</Label>
        <Input id="reg-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" />
      </div>
      <div>
        <Label htmlFor="reg-phone">Telefone</Label>
        <Input id="reg-phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(00) 00000-0000" />
      </div>
      <div>
        <Label htmlFor="reg-doc">CPF / Documento</Label>
        <Input id="reg-doc" value={document} onChange={e => setDocument(e.target.value)} placeholder="000.000.000-00" />
      </div>
      <div className="flex items-start gap-2">
        <Checkbox id="lgpd" checked={lgpdConsent} onCheckedChange={v => setLgpdConsent(!!v)} />
        <Label htmlFor="lgpd" className="text-xs text-muted-foreground leading-tight">
          Concordo com o tratamento dos meus dados pessoais para fins de inscrição neste evento, conforme a LGPD.
        </Label>
      </div>
      <Button type="submit" className="w-full" disabled={isLoading || !lgpdConsent || !name.trim()}>
        {isLoading ? 'Enviando...' : 'Confirmar Inscrição'}
      </Button>
    </form>
  );
};
