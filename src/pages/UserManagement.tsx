import React, { useEffect, useState } from 'react';
import { useAdminUsers, AdminUser, AdminRole } from '@/hooks/useAdminUsers';
import { useAuth } from '@/hooks/useAuth';
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
import { UserPlus, Mail, Key, Pencil, Trash2, Loader2, Users, Shield, Crown, FolderOpen, FileEdit, KeyRound, BarChart3, ShieldCheck } from 'lucide-react';
import { CollaboratorProjectsDialog } from '@/components/CollaboratorProjectsDialog';
import { UserPermissionsDialog } from '@/components/UserPermissionsDialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Navigate } from 'react-router-dom';

const roleLabels: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  usuario: { label: 'Usuário', icon: <Users className="w-3 h-3" />, color: 'bg-secondary text-secondary-foreground' },
  oficineiro: { label: 'Oficineiro(a)', icon: <Users className="w-3 h-3" />, color: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' },
  coordenador: { label: 'Coordenador(a)', icon: <Users className="w-3 h-3" />, color: 'bg-teal-500/20 text-teal-700 dark:text-teal-300' },
  analista: { label: 'Analista', icon: <BarChart3 className="w-3 h-3" />, color: 'bg-purple-500/20 text-purple-700 dark:text-purple-300' },
  admin: { label: 'Admin', icon: <Shield className="w-3 h-3" />, color: 'bg-blue-500/20 text-blue-700 dark:text-blue-300' },
  super_admin: { label: 'Super Admin', icon: <Crown className="w-3 h-3" />, color: 'bg-amber-500/20 text-amber-700 dark:text-amber-300' },
};

export const UserManagement: React.FC = () => {
  const { role } = useAuth();
  const { users, isLoading, fetchUsers, createUser, updateUser, deleteUser } = useAdminUsers();
  
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
  
  // Form state
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<AdminRole>('usuario');

  useEffect(() => {
    if (role === 'SUPER_ADMIN' || role === 'ADMIN') {
      fetchUsers();
    }
  }, [role, fetchUsers]);

  const resetForm = () => {
    setEmail('');
    setName('');
    setPassword('');
    setSelectedRole('usuario');
  };

  const handleCreate = async () => {
    const result = await createUser({
      email,
      name,
      role: selectedRole,
      password: createMethod === 'direct' ? password : undefined,
      sendInvite: createMethod === 'invite'
    });
    
    if (result.success) {
      setIsCreateOpen(false);
      resetForm();
    }
  };

  const handleEdit = async () => {
    if (!editingUser) return;
    
    const result = await updateUser(editingUser.id, {
      name,
      role: selectedRole
    });
    
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
    setSelectedRole(user.role);
    setIsEditOpen(true);
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
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
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

      <Card>
        <CardHeader>
          <CardTitle>Usuários</CardTitle>
          <CardDescription>
            {users.length} usuário{users.length !== 1 ? 's' : ''} cadastrado{users.length !== 1 ? 's' : ''}
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
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead className="hidden md:table-cell">Último acesso</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
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
                    <TableCell className="hidden md:table-cell">
                      {user.lastSignIn 
                        ? format(new Date(user.lastSignIn), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                        : 'Nunca'
                      }
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
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
                ))}
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
              <Label>Papel</Label>
              <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="usuario">Usuário</SelectItem>
                  <SelectItem value="oficineiro">Oficineiro(a)</SelectItem>
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
