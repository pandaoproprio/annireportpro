import React, { useEffect, useState } from 'react';
import { useAdminUsers, AdminUser } from '@/hooks/useAdminUsers';
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
import { UserPlus, Mail, Key, Pencil, Trash2, Loader2, Users, Shield, Crown } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Navigate } from 'react-router-dom';

const roleLabels: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  user: { label: 'Usuário', icon: <Users className="w-3 h-3" />, color: 'bg-secondary text-secondary-foreground' },
  admin: { label: 'Admin', icon: <Shield className="w-3 h-3" />, color: 'bg-blue-500/20 text-blue-700 dark:text-blue-300' },
  super_admin: { label: 'Super Admin', icon: <Crown className="w-3 h-3" />, color: 'bg-amber-500/20 text-amber-700 dark:text-amber-300' },
};

export const UserManagement: React.FC = () => {
  const { role } = useAuth();
  const { users, isLoading, fetchUsers, createUser, updateUser, deleteUser } = useAdminUsers();
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [createMethod, setCreateMethod] = useState<'invite' | 'direct'>('invite');
  
  // Form state
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<'user' | 'admin' | 'super_admin'>('user');

  useEffect(() => {
    if (role === 'SUPER_ADMIN') {
      fetchUsers();
    }
  }, [role, fetchUsers]);

  // Only Super Admin can access
  if (role !== 'SUPER_ADMIN') {
    return <Navigate to="/" replace />;
  }

  const resetForm = () => {
    setEmail('');
    setName('');
    setPassword('');
    setSelectedRole('user');
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
                      <SelectItem value="user">Usuário</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="super_admin">Super Admin</SelectItem>
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead>Último acesso</TableHead>
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
                    <TableCell>
                      {user.lastSignIn 
                        ? format(new Date(user.lastSignIn), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                        : 'Nunca'
                      }
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
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
                  <SelectItem value="user">Usuário</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
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
    </div>
  );
};
