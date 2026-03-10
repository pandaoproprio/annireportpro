import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProjectData } from '@/contexts/ProjectContext';
import { useProjectBudget, BUDGET_CATEGORY_LABELS, BudgetLine, Expense, BudgetLineForm, ExpenseForm } from '@/hooks/useProjectBudget';
import { BudgetLineDialog } from '@/components/budget/BudgetLineDialog';
import { ExpenseDialog } from '@/components/budget/ExpenseDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PageTransition } from '@/components/ui/page-transition';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Edit, Trash2, DollarSign, TrendingUp, TrendingDown, AlertTriangle, PiggyBank, Receipt } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format } from 'date-fns';

const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const CHART_COLORS = [
  'hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))',
  'hsl(var(--chart-4))', 'hsl(var(--chart-5))', 'hsl(var(--accent))',
  'hsl(var(--muted-foreground))', 'hsl(var(--destructive))',
];

const BudgetDashboard: React.FC = () => {
  const { user } = useAuth();
  const { activeProject: project } = useProjectData();
  const {
    budgetLines, expenses, isLoading,
    createBudgetLine, updateBudgetLine, deleteBudgetLine,
    createExpense, updateExpense, deleteExpense,
    totalPlanned, totalExecuted, totalBalance, executionRate,
    categorySummaries,
  } = useProjectBudget(project?.id);

  const [blDialogOpen, setBlDialogOpen] = useState(false);
  const [editingBl, setEditingBl] = useState<BudgetLine | null>(null);
  const [expDialogOpen, setExpDialogOpen] = useState(false);
  const [editingExp, setEditingExp] = useState<Expense | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'bl' | 'exp'; id: string } | null>(null);

  if (!user) return <Navigate to="/login" replace />;
  if (!project) return (
    <PageTransition>
      <div className="p-6 text-center text-muted-foreground">
        <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-40" />
        <p>Selecione um projeto para gerenciar o orçamento.</p>
      </div>
    </PageTransition>
  );

  const barData = categorySummaries.map(c => ({
    name: c.label,
    Planejado: c.planned,
    Executado: c.executed,
  }));

  const pieData = categorySummaries.filter(c => c.executed > 0).map(c => ({
    name: c.label,
    value: c.executed,
  }));

  const handleBlSubmit = async (data: BudgetLineForm) => {
    if (editingBl) return updateBudgetLine(editingBl.id, data);
    return createBudgetLine(data);
  };

  const handleExpSubmit = async (data: ExpenseForm) => {
    if (editingExp) return updateExpense(editingExp.id, data);
    return createExpense(data);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'bl') await deleteBudgetLine(deleteTarget.id);
    else await deleteExpense(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <PageTransition>
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <DollarSign className="w-6 h-6 text-primary" />
              Custos Consolidados
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{project.name}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setEditingBl(null); setBlDialogOpen(true); }} className="gap-2">
              <PiggyBank className="w-4 h-4" /> Linha Orçamentária
            </Button>
            <Button onClick={() => { setEditingExp(null); setExpDialogOpen(true); }} className="gap-2">
              <Receipt className="w-4 h-4" /> Nova Despesa
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}</div>
            <Skeleton className="h-64" />
          </div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <PiggyBank className="w-8 h-8 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">Orçamento Total</p>
                      <p className="text-xl font-bold">{fmt(totalPlanned)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Receipt className="w-8 h-8 text-chart-2" />
                    <div>
                      <p className="text-xs text-muted-foreground">Total Executado</p>
                      <p className="text-xl font-bold">{fmt(totalExecuted)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className={totalBalance < 0 ? 'border-destructive/30' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    {totalBalance >= 0 ? <TrendingUp className="w-8 h-8 text-green-600" /> : <TrendingDown className="w-8 h-8 text-destructive" />}
                    <div>
                      <p className="text-xs text-muted-foreground">Saldo</p>
                      <p className={`text-xl font-bold ${totalBalance < 0 ? 'text-destructive' : 'text-green-600'}`}>{fmt(totalBalance)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Taxa de Execução</p>
                    <p className="text-xl font-bold mb-2">{executionRate.toFixed(1)}%</p>
                    <Progress value={Math.min(executionRate, 100)} className="h-2" />
                    {executionRate > 90 && <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Orçamento quase esgotado</p>}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            {categorySummaries.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-lg">Orçado × Executado por Categoria</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={barData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={60} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                        <Tooltip formatter={(v: number) => fmt(v)} />
                        <Legend />
                        <Bar dataKey="Planejado" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
                        <Bar dataKey="Executado" fill="hsl(var(--chart-2))" radius={[4,4,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                {pieData.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-lg">Distribuição de Gastos</CardTitle></CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}>
                            {pieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                          </Pie>
                          <Tooltip formatter={(v: number) => fmt(v)} />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Category breakdown */}
            {categorySummaries.length > 0 && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-lg">Detalhamento por Categoria</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {categorySummaries.map(c => (
                      <div key={c.category} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{c.label}</span>
                          <span className={c.balance < 0 ? 'text-destructive font-medium' : 'text-muted-foreground'}>
                            {fmt(c.executed)} / {fmt(c.planned)} ({c.percentage.toFixed(0)}%)
                          </span>
                        </div>
                        <Progress value={Math.min(c.percentage, 100)} className={`h-2 ${c.percentage > 100 ? '[&>div]:bg-destructive' : ''}`} />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Tabs defaultValue="budgets" className="w-full">
              <TabsList>
                <TabsTrigger value="budgets">Linhas Orçamentárias ({budgetLines.length})</TabsTrigger>
                <TabsTrigger value="expenses">Despesas ({expenses.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="budgets" className="space-y-3 mt-4">
                {budgetLines.length === 0 ? (
                  <Card><CardContent className="py-8 text-center text-muted-foreground">
                    <PiggyBank className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p>Nenhuma linha orçamentária cadastrada.</p>
                  </CardContent></Card>
                ) : budgetLines.map(bl => (
                  <Card key={bl.id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="p-4 flex justify-between items-center">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline">{BUDGET_CATEGORY_LABELS[bl.category]}</Badge>
                          <span className="font-medium">{bl.description || 'Sem descrição'}</span>
                        </div>
                        <p className="text-lg font-bold text-primary">{fmt(Number(bl.planned_amount))}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingBl(bl); setBlDialogOpen(true); }}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteTarget({ type: 'bl', id: bl.id })}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="expenses" className="space-y-3 mt-4">
                {expenses.length === 0 ? (
                  <Card><CardContent className="py-8 text-center text-muted-foreground">
                    <Receipt className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p>Nenhuma despesa registrada.</p>
                  </CardContent></Card>
                ) : expenses.map(exp => (
                  <Card key={exp.id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="p-4 flex justify-between items-center">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline">{BUDGET_CATEGORY_LABELS[exp.category]}</Badge>
                          <span className="font-medium">{exp.description}</span>
                        </div>
                        <div className="flex gap-3 text-xs text-muted-foreground">
                          <span className="font-bold text-base text-foreground">{fmt(Number(exp.amount))}</span>
                          <span>{format(new Date(exp.expense_date), 'dd/MM/yyyy')}</span>
                          {exp.notes && <span className="italic">{exp.notes}</span>}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingExp(exp); setExpDialogOpen(true); }}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteTarget({ type: 'exp', id: exp.id })}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
            </Tabs>
          </>
        )}

        <BudgetLineDialog
          open={blDialogOpen}
          onOpenChange={o => { setBlDialogOpen(o); if (!o) setEditingBl(null); }}
          onSubmit={handleBlSubmit}
          initialData={editingBl ? { category: editingBl.category, description: editingBl.description, planned_amount: String(editingBl.planned_amount) } : undefined}
          isEdit={!!editingBl}
        />

        <ExpenseDialog
          open={expDialogOpen}
          onOpenChange={o => { setExpDialogOpen(o); if (!o) setEditingExp(null); }}
          onSubmit={handleExpSubmit}
          budgetLines={budgetLines}
          initialData={editingExp ? {
            category: editingExp.category, description: editingExp.description,
            amount: String(editingExp.amount), expense_date: editingExp.expense_date,
            notes: editingExp.notes, budget_line_id: editingExp.budget_line_id || '',
          } : undefined}
          isEdit={!!editingExp}
        />

        <ConfirmDialog
          open={!!deleteTarget}
          onOpenChange={o => { if (!o) setDeleteTarget(null); }}
          title={deleteTarget?.type === 'bl' ? 'Excluir Linha Orçamentária' : 'Excluir Despesa'}
          description="Tem certeza? Esta ação não pode ser desfeita."
          onConfirm={handleDelete}
        />
      </div>
    </PageTransition>
  );
};

export default BudgetDashboard;
