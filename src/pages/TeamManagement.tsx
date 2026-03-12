import React, { useState, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useTeamMembers, TeamMember } from '@/hooks/useTeamMembers';
import { maskPhone, maskCpfCnpj } from '@/lib/masks';
import { useAppData } from '@/contexts/AppDataContext';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const ROLE_COLORS: Record<string, string> = {};
const PROJECT_COLORS: Record<string, string> = {};
const COLOR_PALETTE = [
  'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800',
  'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800',
  'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-800',
  'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800',
  'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-800',
  'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/40 dark:text-cyan-300 dark:border-cyan-800',
  'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-300 dark:border-indigo-800',
  'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-800',
  'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-900/40 dark:text-teal-300 dark:border-teal-800',
  'bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-900/40 dark:text-pink-300 dark:border-pink-800',
];
let colorIndex = 0;
let projectColorIndex = 0;

function getRoleColor(role: string): string {
  const key = role.toLowerCase().trim();
  if (!ROLE_COLORS[key]) {
    ROLE_COLORS[key] = COLOR_PALETTE[colorIndex % COLOR_PALETTE.length];
    colorIndex++;
  }
  return ROLE_COLORS[key];
}

function getProjectColor(projectId: string): string {
  if (!PROJECT_COLORS[projectId]) {
    PROJECT_COLORS[projectId] = COLOR_PALETTE[projectColorIndex % COLOR_PALETTE.length];
    projectColorIndex++;
  }
  return PROJECT_COLORS[projectId];
}

const RoleBadge: React.FC<{ role: string }> = ({ role }) => (
  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getRoleColor(role)}`}>
    {role}
  </span>
);
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, Pencil, Trash2, Loader2, Users, Link2, Unlink, FolderPlus, FolderMinus, KeyRound, ShieldCheck } from 'lucide-react';
import { UserPermissionsDialog } from '@/components/UserPermissionsDialog';
import { useAdminUsers, AdminUser } from '@/hooks/useAdminUsers';
import { useAuth } from '@/hooks/useAuth';

const normalizeRoleValue = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

export const TeamManagement: React.FC = () => {
  const { toast } = useToast();
  const { role } = useAuth();
  const { hasPermission, isSuperAdmin } = usePermissions();
  const { projects, activeProjectId } = useAppData();
  const { users, fetchUsers, updateUser, isLoading: isAdminLoading } = useAdminUsers();
  const {
    members, projectMembers, allAssignments, isLoading,
    createMember, updateMember, deleteMember,
    assignToProject, removeFromProject, createAccessForMember
  } = useTeamMembers(activeProjectId);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [activeTab, setActiveTab] = useState('all');

  // Form state
  const [name, setName] = useState('');
  const [document, setDocument] = useState('');
  const [functionRole, setFunctionRole] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedProjectForAssign, setSelectedProjectForAssign] = useState('');
  const [createProjectId, setCreateProjectId] = useState(activeProjectId || '');
  const [isAccessOpen, setIsAccessOpen] = useState(false);
  const [accessMember, setAccessMember] = useState<TeamMember | null>(null);
  const [accessPassword, setAccessPassword] = useState('');
  const [isPermissionsOpen, setIsPermissionsOpen] = useState(false);
  const [permissionsUser, setPermissionsUser] = useState<AdminUser | null>(null);
  const [filterProjectId, setFilterProjectId] = useState<string>('all');

  const accessRoleNormalized = normalizeRoleValue(accessMember?.function_role || '');
  const accessIsAutoProvision = accessRoleNormalized.includes('oficineiro') || accessRoleNormalized.includes('voluntar');

  // Fetch admin users for RBAC management
  React.useEffect(() => {
    if (isSuperAdmin) {
      fetchUsers();
    }
  }, [isSuperAdmin, fetchUsers]);

  // Data is now auto-fetched by TanStack Query via the hook

  const resetForm = () => {
    setName(''); setDocument(''); setFunctionRole(''); setEmail(''); setPhone(''); setCreateProjectId(activeProjectId || '');
  };

  const handleCreate = async () => {
    const normalizedRole = normalizeRoleValue(functionRole);
    const shouldAutoProvision = normalizedRole.includes('oficineiro') || normalizedRole.includes('voluntar');

    const result = await createMember({
      name,
      document: document || undefined,
      function_role: functionRole,
      email: email || undefined,
      phone: phone || undefined
    });

    if (result.success && result.data && createProjectId) {
      await assignToProject(result.data.id, createProjectId);
    }

    if (result.success && result.data && shouldAutoProvision) {
      if (result.data.email) {
        await createAccessForMember(result.data);
      } else {
        toast({
          variant: 'destructive',
          title: 'E-mail obrigatório para provisionar acesso',
          description: 'Cadastre um e-mail no membro para gerar senha temporária e enviar credenciais automaticamente.',
        });
      }
    }

    if (result.success) { setIsCreateOpen(false); resetForm(); }
  };

  const handleEdit = async () => {
    if (!editingMember) return;
    const result = await updateMember(editingMember.id, {
      name, document: document || null, function_role: functionRole,
      email: email || null, phone: phone || null
    });
    if (result.success) { setIsEditOpen(false); setEditingMember(null); resetForm(); }
  };

  const openEdit = (m: TeamMember) => {
    setEditingMember(m);
    setName(m.name);
    setDocument(m.document || '');
    setFunctionRole(m.function_role);
    setEmail(m.email || '');
    setPhone(m.phone || '');
    setIsEditOpen(true);
  };

  const isMemberInProject = (memberId: string) =>
    projectMembers.some(pm => pm.team_member_id === memberId);

  const getMemberProjects = (memberId: string) =>
    allAssignments.filter(a => a.team_member_id === memberId);

  const projectMembersList = members.filter(m => isMemberInProject(m.id));
  const availableForProject = members.filter(m => !isMemberInProject(m.id));

  const filteredMembers = useMemo(() => {
    if (filterProjectId === 'all') return members;
    if (filterProjectId === 'none') return members.filter(m => getMemberProjects(m.id).length === 0);
    return members.filter(m => allAssignments.some(a => a.team_member_id === m.id && a.project_id === filterProjectId));
  }, [members, allAssignments, filterProjectId]);

  const renderMemberForm = (onSubmit: () => void, submitLabel: string, showProjectSelect?: boolean) => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Nome *</Label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nome completo" />
        </div>
        <div className="space-y-2">
          <Label>Função/Cargo *</Label>
          <Input value={functionRole} onChange={e => setFunctionRole(e.target.value)} placeholder="Ex: Coordenador" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>CPF/CNPJ</Label>
          <Input value={document} onChange={e => setDocument(maskCpfCnpj(e.target.value))} placeholder="000.000.000-00" />
        </div>
        <div className="space-y-2">
          <Label>E-mail</Label>
          <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@exemplo.com" />
        </div>
        <div className="space-y-2">
          <Label>Telefone</Label>
          <Input value={phone} onChange={e => setPhone(maskPhone(e.target.value))} placeholder="(00) 00000-0000" />
        </div>
      </div>
      {showProjectSelect && projects.length > 0 && (
        <div className="space-y-2">
          <Label>Vincular ao Projeto</Label>
          <Select value={createProjectId} onValueChange={setCreateProjectId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um projeto (opcional)" />
            </SelectTrigger>
            <SelectContent>
              {projects.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <DialogFooter>
        <Button variant="outline" onClick={() => { setIsCreateOpen(false); setIsEditOpen(false); }}>
          Cancelar
        </Button>
        <Button onClick={onSubmit} disabled={isLoading || !name || !functionRole}>
          {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {submitLabel}
        </Button>
      </DialogFooter>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestão de Equipes</h1>
          <p className="text-muted-foreground">Gerencie os membros da equipe e suas vinculações a projetos</p>
        </div>
        {hasPermission('team_management_create') && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setIsCreateOpen(true); }}>
                <UserPlus className="w-4 h-4 mr-2" />
                Novo Membro
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Adicionar Membro</DialogTitle>
                <DialogDescription>Cadastre um novo membro de equipe</DialogDescription>
              </DialogHeader>
              {renderMemberForm(handleCreate, "Adicionar", true)}
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">Todos os Membros ({members.length})</TabsTrigger>
          <TabsTrigger value="project" disabled={!activeProjectId}>
            Projeto Ativo ({projectMembersList.length})
          </TabsTrigger>
        </TabsList>

        {/* All Members Tab */}
        <TabsContent value="all">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle>Membros Cadastrados</CardTitle>
                  <CardDescription>{filteredMembers.length} de {members.length} membro{members.length !== 1 ? 's' : ''}</CardDescription>
                </div>
                <Select value={filterProjectId} onValueChange={setFilterProjectId}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Filtrar por projeto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os projetos</SelectItem>
                    <SelectItem value="none">Sem projeto vinculado</SelectItem>
                    {projects.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading && members.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredMembers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  {filterProjectId !== 'all' ? 'Nenhum membro encontrado para este filtro' : 'Nenhum membro cadastrado'}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Função</TableHead>
                      <TableHead>Documento</TableHead>
                      <TableHead>Contato</TableHead>
                      <TableHead>Projetos</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMembers.map(m => (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">{m.name}</TableCell>
                        <TableCell><RoleBadge role={m.function_role} /></TableCell>
                        <TableCell className="text-sm text-muted-foreground">{m.document || '—'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {m.email && <div>{m.email}</div>}
                          {m.phone && <div>{m.phone}</div>}
                          {!m.email && !m.phone && '—'}
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const memberProjects = getMemberProjects(m.id);
                            if (memberProjects.length === 0) return <span className="text-xs text-muted-foreground">—</span>;
                            return (
                              <div className="flex flex-wrap gap-1">
                                {memberProjects.map(mp => (
                                  <Badge key={mp.project_id} className={`text-xs border ${getProjectColor(mp.project_id)}`}>
                                    {mp.project_name}
                                  </Badge>
                                ))}
                              </div>
                            );
                          })()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {activeProjectId && !isMemberInProject(m.id) && (
                              <Button variant="ghost" size="icon" title="Vincular ao projeto ativo"
                                onClick={() => assignToProject(m.id, activeProjectId)} disabled={isLoading}>
                                <FolderPlus className="w-4 h-4 text-emerald-600" />
                              </Button>
                            )}
                            {activeProjectId && isMemberInProject(m.id) && (
                              <Button variant="ghost" size="icon" title="Desvincular do projeto ativo"
                                onClick={() => removeFromProject(m.id, activeProjectId)} disabled={isLoading}>
                                <FolderMinus className="w-4 h-4 text-amber-600" />
                              </Button>
                            )}
                            {!m.user_id && m.email && isSuperAdmin && (
                              <Button variant="ghost" size="icon" title="Criar acesso ao Diário de Bordo"
                                onClick={() => { setAccessMember(m); setAccessPassword(''); setIsAccessOpen(true); }}>
                                <KeyRound className="w-4 h-4 text-primary" />
                              </Button>
                            )}
                            {m.user_id && isSuperAdmin && (
                              <Button variant="ghost" size="icon" title="Permissões RBAC"
                                onClick={() => {
                                  const adminUser = users.find(u => u.id === m.user_id);
                                  if (adminUser) {
                                    setPermissionsUser(adminUser);
                                    setIsPermissionsOpen(true);
                                  } else {
                                    toast({
                                      variant: 'destructive',
                                      title: 'Usuário não encontrado',
                                      description: `${m.name} não foi localizado na lista de usuários do sistema. Verifique se a conta está ativa.`,
                                    });
                                  }
                                }}>
                                <ShieldCheck className="w-4 h-4 text-primary" />
                              </Button>
                            )}
                            {hasPermission('team_management_edit') && (
                              <Button variant="ghost" size="icon" onClick={() => openEdit(m)}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                            )}
                            {hasPermission('team_management_delete') && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Remover membro?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      <strong>{m.name}</strong> será removido permanentemente de todos os projetos.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deleteMember(m.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                      Remover
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Project Members Tab */}
        <TabsContent value="project">
          <Card>
            <CardHeader>
              <CardTitle>Equipe do Projeto</CardTitle>
              <CardDescription>
                {projectMembersList.length} membro{projectMembersList.length !== 1 ? 's' : ''} vinculado{projectMembersList.length !== 1 ? 's' : ''} ao projeto ativo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add member to project */}
              {availableForProject.length > 0 && (
                <div className="flex gap-2 p-3 rounded-lg border bg-muted/30">
                  <Select value={selectedProjectForAssign} onValueChange={setSelectedProjectForAssign}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Selecione um membro para vincular" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableForProject.map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.name} — {m.function_role}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button disabled={!selectedProjectForAssign || isLoading}
                    onClick={async () => {
                      if (activeProjectId) {
                        const r = await assignToProject(selectedProjectForAssign, activeProjectId);
                        if (r.success) setSelectedProjectForAssign('');
                      }
                    }}>
                    <FolderPlus className="w-4 h-4 mr-2" /> Vincular
                  </Button>
                </div>
              )}

              {projectMembersList.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhum membro vinculado a este projeto</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Função</TableHead>
                      <TableHead>Documento</TableHead>
                      <TableHead>Contato</TableHead>
                      <TableHead>Acesso Diário</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projectMembersList.map(m => (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">{m.name}</TableCell>
                        <TableCell><RoleBadge role={m.function_role} /></TableCell>
                        <TableCell className="text-sm text-muted-foreground">{m.document || '—'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {m.email && <div>{m.email}</div>}
                          {m.phone && <div>{m.phone}</div>}
                          {!m.email && !m.phone && '—'}
                        </TableCell>
                        <TableCell>
                          {m.user_id ? (
                            <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 gap-1">
                              <Link2 className="w-3 h-3" /> Ativo
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1">
                              <Unlink className="w-3 h-3" /> Sem conta
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" title="Desvincular do projeto"
                            onClick={() => activeProjectId && removeFromProject(m.id, activeProjectId)} disabled={isLoading}>
                            <FolderMinus className="w-4 h-4 text-amber-600" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Membro</DialogTitle>
            <DialogDescription>Atualize as informações de {editingMember?.name}</DialogDescription>
          </DialogHeader>
          {renderMemberForm(handleEdit, "Salvar")}
        </DialogContent>
      </Dialog>

      {/* Access Creation Dialog */}
      <Dialog open={isAccessOpen} onOpenChange={setIsAccessOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Criar Acesso ao Diário de Bordo</DialogTitle>
            <DialogDescription>
              {accessIsAutoProvision ? (
                <>
                  O acesso de <strong>{accessMember?.name}</strong> será provisionado automaticamente com senha temporária segura, enviada para <strong>{accessMember?.email}</strong>.
                </>
              ) : (
                <>
                  Defina uma senha para <strong>{accessMember?.name}</strong> acessar o Diário de Bordo com o e-mail <strong>{accessMember?.email}</strong>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>E-mail (login)</Label>
              <Input value={accessMember?.email || ''} disabled className="bg-muted" />
            </div>
            {!accessIsAutoProvision && (
              <div className="space-y-2">
                <Label>Senha temporária *</Label>
                <Input
                  type="password"
                  value={accessPassword}
                  onChange={e => setAccessPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
            )}
            {accessIsAutoProvision && (
              <p className="text-sm text-muted-foreground border rounded-md p-3 bg-muted/50">
                🔑 Para este perfil, a senha temporária é gerada automaticamente e enviada por e-mail.
              </p>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAccessOpen(false)}>Cancelar</Button>
              <Button
                disabled={isLoading || (!accessIsAutoProvision && accessPassword.length < 6)}
                onClick={async () => {
                  if (!accessMember) return;
                  const result = await createAccessForMember(accessMember, accessIsAutoProvision ? undefined : accessPassword);
                  if (result.success) { setIsAccessOpen(false); setAccessMember(null); setAccessPassword(''); }
                }}
              >
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <KeyRound className="w-4 h-4 mr-2" />
                Criar Acesso
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Permissions RBAC Dialog */}
      <UserPermissionsDialog
        user={permissionsUser}
        open={isPermissionsOpen}
        onOpenChange={setIsPermissionsOpen}
        onSave={async (userId, permissions) => updateUser(userId, { permissions })}
        isSaving={isAdminLoading}
      />
    </div>
  );
};
