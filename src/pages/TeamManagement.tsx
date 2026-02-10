import React, { useEffect, useState } from 'react';
import { useTeamMembers, TeamMember } from '@/hooks/useTeamMembers';
import { useAppData } from '@/contexts/AppDataContext';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, Pencil, Trash2, Loader2, Users, Link2, Unlink, FolderPlus, FolderMinus } from 'lucide-react';

export const TeamManagement: React.FC = () => {
  const { role } = useAuth();
  const { projects, activeProjectId } = useAppData();
  const {
    members, projectMembers, isLoading,
    fetchMembers, fetchProjectMembers,
    createMember, updateMember, deleteMember,
    assignToProject, removeFromProject
  } = useTeamMembers();

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

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  useEffect(() => {
    if (activeProjectId) {
      fetchProjectMembers(activeProjectId);
    }
  }, [activeProjectId, fetchProjectMembers]);

  const resetForm = () => {
    setName(''); setDocument(''); setFunctionRole(''); setEmail(''); setPhone(''); setCreateProjectId(activeProjectId || '');
  };

  const handleCreate = async () => {
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

  const projectMembersList = members.filter(m => isMemberInProject(m.id));
  const availableForProject = members.filter(m => !isMemberInProject(m.id));

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
          <Input value={document} onChange={e => setDocument(e.target.value)} placeholder="Documento" />
        </div>
        <div className="space-y-2">
          <Label>E-mail</Label>
          <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@exemplo.com" />
        </div>
        <div className="space-y-2">
          <Label>Telefone</Label>
          <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(00) 00000-0000" />
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
              <CardTitle>Membros Cadastrados</CardTitle>
              <CardDescription>{members.length} membro{members.length !== 1 ? 's' : ''} no total</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading && members.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : members.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhum membro cadastrado</p>
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
                    {members.map(m => (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">{m.name}</TableCell>
                        <TableCell><Badge variant="secondary">{m.function_role}</Badge></TableCell>
                        <TableCell className="text-sm text-muted-foreground">{m.document || '—'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {m.email && <div>{m.email}</div>}
                          {m.phone && <div>{m.phone}</div>}
                          {!m.email && !m.phone && '—'}
                        </TableCell>
                        <TableCell>
                          {isMemberInProject(m.id) ? (
                            <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 gap-1">
                              <Link2 className="w-3 h-3" /> Projeto ativo
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
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
                            <Button variant="ghost" size="icon" onClick={() => openEdit(m)}>
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
                        <TableCell><Badge variant="secondary">{m.function_role}</Badge></TableCell>
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
    </div>
  );
};
