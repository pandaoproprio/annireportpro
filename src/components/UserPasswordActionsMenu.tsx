import React, { useState } from 'react';
import { AdminUser, useAdminUsers, ResetLinkResult } from '@/hooks/useAdminUsers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { KeyRound, Eye, EyeOff, Copy, Check, MessageCircle, MailWarning, Link2, Loader2 } from 'lucide-react';

interface Props {
  user: AdminUser;
}

export const UserPasswordActionsMenu: React.FC<Props> = ({ user }) => {
  const { toast } = useToast();
  const { setTempPassword, forceChangePassword, generateResetLink, isLoading } = useAdminUsers();

  const [openManual, setOpenManual] = useState(false);
  const [openLink, setOpenLink] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [linkResult, setLinkResult] = useState<ResetLinkResult | null>(null);
  const [skipEmail, setSkipEmail] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleManualReset = async () => {
    if (newPassword.length < 8) return;
    const r = await setTempPassword(user.id, newPassword);
    if (r.success) {
      setOpenManual(false);
      setNewPassword('');
      setShowPassword(false);
    }
  };

  const handleForceChange = async () => {
    await forceChangePassword({ userId: user.id });
  };

  const handleGenerateLink = async () => {
    setLinkResult(null);
    const r = await generateResetLink({ userId: user.id, sendEmail: !skipEmail });
    const first = r.results?.[0];
    if (first?.resetUrl) {
      setLinkResult(first);
    } else if (first?.error) {
      toast({ variant: 'destructive', title: 'Erro', description: first.error });
    }
  };

  const handleCopy = async () => {
    if (!linkResult?.resetUrl) return;
    await navigator.clipboard.writeText(linkResult.resetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openWhatsApp = () => {
    if (!linkResult?.resetUrl) return;
    const message = `Olá! Segue o link para redefinir sua senha de acesso ao GIRA ERP. O link expira em 24 horas: ${linkResult.resetUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const openLinkDialog = () => {
    setLinkResult(null);
    setSkipEmail(false);
    setCopied(false);
    setOpenLink(true);
  };

  const passwordValid =
    newPassword.length >= 10 &&
    /[A-Z]/.test(newPassword) &&
    /[a-z]/.test(newPassword) &&
    /[0-9]/.test(newPassword) &&
    /[^A-Za-z0-9]/.test(newPassword);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" title="Ações de senha">
            <KeyRound className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 bg-popover">
          <DropdownMenuLabel>Gerenciamento de senha</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => { setNewPassword(''); setShowPassword(false); setOpenManual(true); }}>
            <KeyRound className="w-4 h-4 mr-2" />
            Resetar senha manualmente
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleForceChange}>
            <MailWarning className="w-4 h-4 mr-2" />
            Solicitar troca no próximo acesso
          </DropdownMenuItem>
          <DropdownMenuItem onClick={openLinkDialog}>
            <Link2 className="w-4 h-4 mr-2" />
            Enviar link de reset por e-mail
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Reset manual */}
      <Dialog open={openManual} onOpenChange={setOpenManual}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Resetar senha manualmente</DialogTitle>
            <DialogDescription>
              Defina uma nova senha temporária para <strong>{user.name}</strong> ({user.email}).
              No próximo login, o usuário será obrigado a trocá-la.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="manual-password">Nova senha temporária</Label>
              <div className="relative">
                <Input
                  id="manual-password"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 10 caracteres"
                  autoComplete="new-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <ul className="text-xs text-muted-foreground space-y-0.5 mt-1">
                <li className={newPassword.length >= 10 ? 'text-green-600' : ''}>• Mínimo 10 caracteres</li>
                <li className={/[A-Z]/.test(newPassword) ? 'text-green-600' : ''}>• Pelo menos uma maiúscula</li>
                <li className={/[a-z]/.test(newPassword) ? 'text-green-600' : ''}>• Pelo menos uma minúscula</li>
                <li className={/[0-9]/.test(newPassword) ? 'text-green-600' : ''}>• Pelo menos um número</li>
                <li className={/[^A-Za-z0-9]/.test(newPassword) ? 'text-green-600' : ''}>• Pelo menos um símbolo</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenManual(false)}>Cancelar</Button>
            <Button onClick={handleManualReset} disabled={!passwordValid || isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar senha temporária
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Gerar link */}
      <Dialog open={openLink} onOpenChange={setOpenLink}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Link de redefinição de senha</DialogTitle>
            <DialogDescription>
              Gere um link válido por 24 horas para <strong>{user.name}</strong> ({user.email}).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {!linkResult && (
              <>
                <div className="flex items-start gap-2 rounded-md border p-3 bg-muted/30">
                  <Checkbox
                    id="skip-email"
                    checked={skipEmail}
                    onCheckedChange={(v) => setSkipEmail(v === true)}
                    className="mt-0.5"
                  />
                  <Label htmlFor="skip-email" className="text-sm cursor-pointer leading-tight">
                    Apenas copiar o link — não enviar e-mail
                    <span className="block text-xs text-muted-foreground mt-0.5">
                      Útil quando você prefere compartilhar manualmente (ex.: WhatsApp).
                    </span>
                  </Label>
                </div>
                <Button onClick={handleGenerateLink} disabled={isLoading} className="w-full">
                  {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Gerar link {skipEmail ? '(sem e-mail)' : '(e enviar e-mail)'}
                </Button>
              </>
            )}

            {linkResult?.resetUrl && (
              <div className="space-y-3">
                {linkResult.emailSent && (
                  <div className="rounded-md bg-emerald-500/10 border border-emerald-500/30 p-2 text-xs text-emerald-700 dark:text-emerald-300">
                    ✓ E-mail enviado para {linkResult.email}
                  </div>
                )}
                {!linkResult.emailSent && !skipEmail && (
                  <div className="rounded-md bg-amber-500/10 border border-amber-500/30 p-2 text-xs text-amber-700 dark:text-amber-300">
                    O envio do e-mail falhou ou está pendente. Você ainda pode compartilhar o link manualmente abaixo.
                  </div>
                )}
                <div className="space-y-2">
                  <Label className="text-xs">Link gerado (válido por 24 horas)</Label>
                  <div className="flex gap-2">
                    <Input value={linkResult.resetUrl} readOnly className="text-xs font-mono" />
                    <Button variant="outline" size="icon" onClick={handleCopy} title="Copiar link">
                      {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button variant="outline" onClick={handleCopy} className="flex-1">
                    {copied ? <Check className="w-4 h-4 mr-2 text-emerald-600" /> : <Copy className="w-4 h-4 mr-2" />}
                    {copied ? 'Copiado!' : 'Copiar link'}
                  </Button>
                  <Button onClick={openWhatsApp} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Compartilhar via WhatsApp
                  </Button>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenLink(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
