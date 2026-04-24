import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useAdminUsers, AdminUser, AdminRole } from '@/hooks/useAdminUsers';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { UserPlus, Mail, Key, Pencil, Trash2, Loader2, Users, Shield, Crown, FolderOpen, FileEdit, KeyRound, BarChart3, ShieldCheck, UserCheck, ShieldOff, Send, Filter, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { CollaboratorProjectsDialog } from '@/components/CollaboratorProjectsDialog';
import { UserPermissionsDialog } from '@/components/UserPermissionsDialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Navigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

const roleLabels: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  usuario: { label: 'Usuário', icon: <Users className="w-3 h-3" />, color: 'bg-secondary text-secondary-foreground' },
  oficineiro: { label: 'Oficineiro(a)', icon: <Users className="w-3 h-3" />, color: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' },
  voluntario: { label: 'Voluntário(a)', icon: <Users className="w-3 h-3" />, color: 'bg-lime-500/20 text-lime-700 dark:text-lime-300' },
  coordenador: { label: 'Coordenador(a)', icon: <Users className="w-3 h-3" />, color: 'bg-teal-500/20 text-teal-700 dark:text-teal-300' },
  analista: { label: 'Analista', icon: <BarChart3 className="w-3 h-3" />, color: 'bg-purple-500/20 text-purple-700 dark:text-purple-300' },
  admin: { label: 'Admin', icon: <Shield className="w-3 h-3" />, color: 'bg-blue-500/20 text-blue-700 dark:text-blue-300' },
  super_admin: { label: 'Super Admin', icon: <Crown className="w-3 h-3" />, color: 'bg-amber-500/20 text-amber-700 dark:text-amber-300' },
};

type LoginFilter = 'all' | 'never_logged' | 'logged';

interface ReminderRecord {
  user_id: string;
  sent_at: string;
  first_login_at: string | null;
}

export const UserManagement: React.FC = () => {
  const { role } = useAuth();
  const { toast } = useToast();
  const { users, isLoading, fetchUsers, createUser, updateUser, deleteUser, disableMfa } = useAdminUsers();
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [isProjectsOpen, setIsProjectsOpen] = useState(false);
  const [projectsUser, setProjectsUser] = useState<AdminUser | null>(null);
  const [isPermissionsOpen, setIsPermissionsOpen] = useState(false);
  const [permissionsUser, setPermissionsUser] = useState<AdminUser | null>(null);
  const [createMethod, setCreateMethod] = useState<'invite' | 'direct'>('invite');
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [resetPasswordUser, setResetPasswordUser] = useState<AdminUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  
  // Filter state
  const [loginFilter, setLoginFilter] = useState<LoginFilter>('all');
  
  // Reminder state
  const [selectedForReminder, setSelectedForReminder] = useState<Set<string>>(new Set());
  const [isSendingReminder, setIsSendingReminder] = useState(false);
  const [reminderRecords, setReminderRecords] = useState<ReminderRecord[]>([]);
  
  // Form state
  const [email, setEmail] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<AdminRole>('usuario');

  // Fetch team members to show linked member info
  const [teamMembers, setTeamMembers] = useState<Array<{ id: string; name: string; email: string | null; function_role: string }>>([]);

  // Fetch user-project links (owner + collaborator)
  const [userProjects, setUserProjects] = useState<Array<{ user_id: string; project_name: string }>>([]);

  const fetchReminders = useCallback(async () => {
    const { data } = await supabase
      .from('login_reminders')
      .select('user_id, sent_at, first_login_at')
      .order('sent_at', { ascending: false });
    if (data) setReminderRecords(data as ReminderRecord[]);
  }, []);

  useEffect(() => {
    if (role === 'SUPER_ADMIN' || role === 'ADMIN') {
      fetchUsers();
      fetchReminders();
      supabase.from('team_members').select('id, name, email, function_role').then(({ data }) => {
        if (data) setTeamMembers(data);
      });
      // Load user → project links (owner + collaborator)
      (async () => {
        const links: Array<{ user_id: string; project_name: string }> = [];
        const { data: ownerProjects } = await supabase
          .from('projects')
          .select('user_id, name')
          .is('deleted_at', null);
        ownerProjects?.forEach(p => {
          if (p.user_id) links.push({ user_id: p.user_id, project_name: p.name });
        });
        const { data: collabs } = await supabase
          .from('project_collaborators')
          .select('user_id, projects:project_id(name, deleted_at)');
        collabs?.forEach((c: any) => {
          if (c.projects && !c.projects.deleted_at) {
            links.push({ user_id: c.user_id, project_name: c.projects.name });
          }
        });
        setUserProjects(links);
      })();
    }
  }, [role, fetchUsers, fetchReminders]);

  // Map user email -> team member
  const teamMemberByEmail = useMemo(() => {
    const map = new Map<string, { name: string; function_role: string }>();
    teamMembers.forEach(tm => {
      if (tm.email) map.set(tm.email.toLowerCase(), { name: tm.name, function_role: tm.function_role });
    });
    return map;
  }, [teamMembers]);

  // Map user_id -> set of project names
  const projectsByUserId = useMemo(() => {
    const map = new Map<string, Set<string>>();
    userProjects.forEach(({ user_id, project_name }) => {
      if (!map.has(user_id)) map.set(user_id, new Set());
      map.get(user_id)!.add(project_name);
    });
    return map;
  }, [userProjects]);

  // Reminder tracking maps
  const reminderByUserId = useMemo(() => {
    const map = new Map<string, ReminderRecord>();
    reminderRecords.forEach(r => {
      // Keep the latest reminder per user
      if (!map.has(r.user_id) || new Date(r.sent_at) > new Date(map.get(r.user_id)!.sent_at)) {
        map.set(r.user_id, r);
      }
    });
    return map;
  }, [reminderRecords]);

  // Filter users
  const filteredUsers = useMemo(() => {
    if (loginFilter === 'all') return users;
    if (loginFilter === 'never_logged') return users.filter(u => !u.lastSignIn);
    return users.filter(u => !!u.lastSignIn);
  }, [users, loginFilter]);

  const neverLoggedCount = useMemo(() => users.filter(u => !u.lastSignIn).length, [users]);

  const resetForm = () => {
    setEmail('');
    setName('');
    setPassword('');
    setSelectedRole('usuario');
  };

  const handleCreate = async () => {
    const isAutoProvision = selectedRole === 'oficineiro' || selectedRole === 'voluntario';
    const result = await createUser({
      email,
      name,
      role: selectedRole,
      password: createMethod === 'direct' && !isAutoProvision ? password : undefined,
      sendInvite: createMethod === 'invite'
    });
    
    if (result.success) {
      setIsCreateOpen(false);
      resetForm();
    }
  };

  const handleEdit = async () => {
    if (!editingUser) return;
    
    const updates: { name: string; role: typeof selectedRole; email?: string } = {
      name,
      role: selectedRole
    };
    
    if (editEmail && editEmail !== editingUser.email) {
      updates.email = editEmail;
    }
    
    const result = await updateUser(editingUser.id, updates);
    
    if (result.success) {
      setIsEditOpen(false);
      setEditingUser(null);
      resetForm();
    }
  };

  const handleDelete = async (userId: string) => {
    await deleteUser(userId);
  };

  const handleResetPassword = async () => {
    if (!resetPasswordUser || !newPassword) return;
    const result = await updateUser(resetPasswordUser.id, { password: newPassword });
    if (result.success) {
      setIsResetPasswordOpen(false);
      setResetPasswordUser(null);
      setNewPassword('');
    }
  };

  const openEdit = (user: AdminUser) => {
    setEditingUser(user);
    setName(user.name);
    setEditEmail(user.email);
    setSelectedRole(user.role);
    setIsEditOpen(true);
  };

  // Reminder selection helpers
  const toggleReminderSelect = (userId: string) => {
    setSelectedForReminder(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const neverLoggedUsers = useMemo(() => users.filter(u => !u.lastSignIn), [users]);

  const selectAllNeverLogged = () => {
    setSelectedForReminder(new Set(neverLoggedUsers.map(u => u.id)));
  };

  const deselectAll = () => setSelectedForReminder(new Set());

  const handleSendReminders = async () => {
    const usersToRemind = users.filter(u => selectedForReminder.has(u.id) && !u.lastSignIn);
    if (usersToRemind.length === 0) return;

    setIsSendingReminder(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-login-reminder', {
        body: {
          action: 'send-batch',
          users: usersToRemind.map(u => ({ id: u.id, email: u.email, name: u.name })),
        },
      });

      if (error) throw error;

      const sent = data?.sent || 0;
      const total = data?.total || usersToRemind.length;

      toast({
        title: 'Lembretes enviados',
        description: `${sent} de ${total} e-mail(s) enviado(s) com sucesso. CC: juanpablorj@gmail.com e rapha.araujo.cultura@gmail.com`,
      });

      setSelectedForReminder(new Set());
      fetchReminders();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao enviar lembretes',
        description: err.message || 'Erro desconhecido',
      });
    } finally {
      setIsSendingReminder(false);
    }
  };

  const handleSendSingleReminder = async (user: AdminUser) => {
    setIsSendingReminder(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-login-reminder', {
        body: {
          userId: user.id,
          userEmail: user.email,
          userName: user.name,
        },
      });

      if (error) throw error;

      toast({
        title: 'Lembrete enviado',
        description: `E-mail de lembrete enviado para ${user.email}. CC: juanpablorj@gmail.com e rapha.araujo.cultura@gmail.com`,
      });

      fetchReminders();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao enviar lembrete',
        description: err.message || 'Erro desconhecido',
      });
    } finally {
      setIsSendingReminder(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestão de Usuários</h1>
          <p className="text-muted-foreground">Gerencie os usuários e suas permissões no sistema</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setIsCreateOpen(true); }}>
              <UserPlus className="w-4 h-4 mr-2" />
              Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Criar Novo Usuário</DialogTitle>
              <DialogDescription>
                Adicione um novo usuário ao sistema
              </DialogDescription>
            </DialogHeader>
            
            <Tabs value={createMethod} onValueChange={(v) => setCreateMethod(v as 'invite' | 'direct')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="invite" className="gap-2">
                  <Mail className="w-4 h-4" />
                  Convite
                </TabsTrigger>
                <TabsTrigger value="direct" className="gap-2">
                  <Key className="w-4 h-4" />
                  Direto
                </TabsTrigger>
              </TabsList>
              
              <div className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="usuario@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    placeholder="Nome completo"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                
                <TabsContent value="invite" className="mt-0">
                  <p className="text-sm text-muted-foreground">
                    Um e-mail de convite será enviado para o usuário definir sua senha.
                  </p>
                </TabsContent>
                
                <TabsContent value="direct" className="mt-0 space-y-2">
                  {(selectedRole === 'oficineiro' || selectedRole === 'voluntario') ? (
                    <p className="text-sm text-muted-foreground border rounded-md p-3 bg-muted/50">
                      🔑 Uma senha temporária segura será <strong>gerada automaticamente</strong> e enviada por e-mail ao usuário.
                    </p>
                  ) : (
                    <>
                      <Label htmlFor="password">Senha</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="Mínimo 6 caracteres"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </>
                  )}
                </TabsContent>
                
                <div className="space-y-2">
                  <Label>Papel</Label>
                  <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="usuario">Usuário</SelectItem>
                      <SelectItem value="oficineiro">Oficineiro(a)</SelectItem>
                      <SelectItem value="voluntario">Voluntário(a)</SelectItem>
                      <SelectItem value="coordenador">Coordenador(a)</SelectItem>
                      <SelectItem value="analista">Analista</SelectItem>
                      {role === 'SUPER_ADMIN' && <SelectItem value="admin">Admin</SelectItem>}
                      {role === 'SUPER_ADMIN' && <SelectItem value="super_admin">Super Admin</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Tabs>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreate} disabled={isLoading || !email || !name}>
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {createMethod === 'invite' ? 'Enviar Convite' : 'Criar Usuário'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter & Reminder Banner */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Status de login:</span>
            </div>
            <div className="flex gap-1.5">
              <Button
                size="sm"
                variant={loginFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setLoginFilter('all')}
                className="h-8"
              >
                Todos ({users.length})
              </Button>
              <Button
                size="sm"
                variant={loginFilter === 'never_logged' ? 'default' : 'outline'}
                onClick={() => setLoginFilter('never_logged')}
                className="h-8"
              >
                <AlertCircle className="w-3.5 h-3.5 mr-1" />
                Nunca logaram ({neverLoggedCount})
              </Button>
              <Button
                size="sm"
                variant={loginFilter === 'logged' ? 'default' : 'outline'}
                onClick={() => setLoginFilter('logged')}
                className="h-8"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                Já logaram ({users.length - neverLoggedCount})
              </Button>
            </div>

            {loginFilter === 'never_logged' && neverLoggedUsers.length > 0 && (
              <div className="flex items-center gap-2 ml-auto">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={selectedForReminder.size > 0 ? deselectAll : selectAllNeverLogged}
                  className="h-8 text-xs"
                >
                  {selectedForReminder.size > 0 ? 'Desmarcar todos' : 'Selecionar todos'}
                </Button>
                <Button
                  size="sm"
                  onClick={handleSendReminders}
                  disabled={selectedForReminder.size === 0 || isSendingReminder}
                  className="h-8 gap-1.5"
                >
                  {isSendingReminder ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Enviar lembrete ({selectedForReminder.size})
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Usuários</CardTitle>
          <CardDescription>
            {filteredUsers.length} usuário{filteredUsers.length !== 1 ? 's' : ''} 
            {loginFilter === 'never_logged' ? ' que nunca acessaram' : loginFilter === 'logged' ? ' que já acessaram' : ' cadastrado' + (filteredUsers.length !== 1 ? 's' : '')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && users.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 px-4">
            <Table>
              <TableHeader>
                <TableRow>
                  {loginFilter === 'never_logged' && <TableHead className="w-10"></TableHead>}
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead className="hidden lg:table-cell">Membro de Equipe</TableHead>
                  <TableHead className="hidden lg:table-cell">Projeto(s)</TableHead>
                  <TableHead className="hidden md:table-cell">Último acesso</TableHead>
                  {loginFilter === 'never_logged' && <TableHead className="hidden md:table-cell">Lembrete</TableHead>}
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => {
                  const reminder = reminderByUserId.get(user.id);
                  return (
                  <TableRow key={user.id}>
                    {loginFilter === 'never_logged' && (
                      <TableCell>
                        <Checkbox
                          checked={selectedForReminder.has(user.id)}
                          onCheckedChange={() => toggleReminderSelect(user.id)}
                        />
                      </TableCell>
                    )}
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {user.email}
                        {!user.emailConfirmed && (
                          <Badge variant="outline" className="text-xs">Pendente</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`gap-1 ${roleLabels[user.role].color}`}>
                        {roleLabels[user.role].icon}
                        {roleLabels[user.role].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {(() => {
                        const linked = teamMemberByEmail.get(user.email.toLowerCase());
                        if (linked) {
                          return (
                            <div className="flex items-center gap-1.5 text-sm">
                              <UserCheck className="w-3.5 h-3.5 text-green-600 dark:text-green-400 shrink-0" />
                              <span className="truncate max-w-[160px]" title={`${linked.name} — ${linked.function_role}`}>
                                {linked.name}
                              </span>
                            </div>
                          );
                        }
                        return <span className="text-muted-foreground text-xs">—</span>;
                      })()}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {user.lastSignIn 
                        ? format(new Date(user.lastSignIn), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                        : <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 dark:text-amber-400 dark:border-amber-600">Nunca</Badge>
                      }
                    </TableCell>
                    {loginFilter === 'never_logged' && (
                      <TableCell className="hidden md:table-cell">
                        {reminder ? (
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              Enviado {format(new Date(reminder.sent_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                            </div>
                            {reminder.first_login_at ? (
                              <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                                <CheckCircle2 className="w-3 h-3" />
                                Logou {format(new Date(reminder.first_login_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                              </div>
                            ) : (
                              <span className="text-xs text-amber-600 dark:text-amber-400">Aguardando login…</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Não enviado</span>
                        )}
                      </TableCell>
                    )}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!user.lastSignIn && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Enviar lembrete de acesso"
                            onClick={() => handleSendSingleReminder(user)}
                            disabled={isSendingReminder}
                          >
                            <Send className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" title="Projetos vinculados" onClick={() => { setProjectsUser(user); setIsProjectsOpen(true); }}>
                          <FolderOpen className="w-4 h-4" />
                        </Button>
                        {role === 'SUPER_ADMIN' && (
                          <Button variant="ghost" size="icon" title="Permissões" onClick={() => { setPermissionsUser(user); setIsPermissionsOpen(true); }}>
                            <ShieldCheck className="w-4 h-4" />
                          </Button>
                        )}
                         <Button variant="ghost" size="icon" title="Resetar senha" onClick={() => { setResetPasswordUser(user); setNewPassword(''); setIsResetPasswordOpen(true); }}>
                           <KeyRound className="w-4 h-4" />
                         </Button>
                         {role === 'SUPER_ADMIN' && (
                           user.mfaEnabled ? (
                             <AlertDialog>
                               <AlertDialogTrigger asChild>
                                 <Button variant="ghost" size="icon" title="MFA ativo — Clique para desabilitar" className="text-emerald-600 hover:text-emerald-700">
                                   <ShieldCheck className="w-4 h-4" />
                                 </Button>
                               </AlertDialogTrigger>
                               <AlertDialogContent>
                                 <AlertDialogHeader>
                                   <AlertDialogTitle>Desabilitar MFA?</AlertDialogTitle>
                                   <AlertDialogDescription>
                                     A autenticação multifator de <strong>{user.name}</strong> será removida. O usuário precisará configurar novamente caso necessário.
                                   </AlertDialogDescription>
                                 </AlertDialogHeader>
                                 <AlertDialogFooter>
                                   <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                   <AlertDialogAction onClick={() => disableMfa(user.id)}>
                                     Desabilitar
                                   </AlertDialogAction>
                                 </AlertDialogFooter>
                               </AlertDialogContent>
                             </AlertDialog>
                           ) : (
                             <Button variant="ghost" size="icon" title="MFA não configurado" disabled className="text-muted-foreground opacity-40">
                               <ShieldOff className="w-4 h-4" />
                             </Button>
                           )
                         )}
                        <Button variant="ghost" size="icon" onClick={() => openEdit(user)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remover usuário?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita. O usuário <strong>{user.name}</strong> será removido permanentemente.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDelete(user.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Remover
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>
              Atualize as informações de {editingUser?.email}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-email">E-mail</Label>
              <Input
                id="edit-email"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Papel</Label>
              <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="usuario">Usuário</SelectItem>
                  <SelectItem value="oficineiro">Oficineiro(a)</SelectItem>
                  <SelectItem value="voluntario">Voluntário(a)</SelectItem>
                  <SelectItem value="coordenador">Coordenador(a)</SelectItem>
                  <SelectItem value="analista">Analista</SelectItem>
                  {role === 'SUPER_ADMIN' && <SelectItem value="admin">Admin</SelectItem>}
                  {role === 'SUPER_ADMIN' && <SelectItem value="super_admin">Super Admin</SelectItem>}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEdit} disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Collaborator Projects Dialog */}
      <CollaboratorProjectsDialog
        user={projectsUser}
        open={isProjectsOpen}
        onOpenChange={setIsProjectsOpen}
      />

      {/* Permissions Dialog */}
      <UserPermissionsDialog
        user={permissionsUser}
        open={isPermissionsOpen}
        onOpenChange={setIsPermissionsOpen}
        onSave={async (userId, permissions) => updateUser(userId, { permissions })}
        isSaving={isLoading}
      />

      {/* Reset Password Dialog */}
      <Dialog open={isResetPasswordOpen} onOpenChange={setIsResetPasswordOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Resetar Senha</DialogTitle>
            <DialogDescription>
              Defina uma nova senha para <strong>{resetPasswordUser?.name}</strong> ({resetPasswordUser?.email})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nova Senha</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResetPasswordOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleResetPassword} disabled={isLoading || newPassword.length < 6}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Redefinir Senha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
