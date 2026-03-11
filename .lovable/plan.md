

# Relatório de Auditoria Completa de Regressão de Código

## Estado Atual: SEM REGRESSÃO ATIVA no código

Após auditoria completa dos arquivos, rotas, sidebar, permissões e banco de dados, o diagnóstico é:

---

## ETAPA 1 — Funcionalidades Existentes (Nenhuma Desapareceu)

Todos os módulos estão presentes e funcionais no código:

| Módulo | Arquivo Principal | Importação no Router | Rota | Sidebar |
|--------|------------------|---------------------|------|---------|
| GIRA Forms | `src/modules/gira-forms/FormsListPage.tsx` (254 linhas) | Linha 60-62 | `/forms`, `/forms/:id` (linhas 320-321) | Linha 198 |
| GIRA Eventos | `src/modules/gira-eventos/EventsListPage.tsx` (112 linhas) | Linha 63-65 | `/eventos`, `/eventos/:id` (linhas 322-323) | Linha 199 |
| Rota pública Forms | `src/modules/gira-forms/PublicFormPage.tsx` | Linha 62 | `/f/:id` (linha 363) | N/A |
| Rota pública Eventos | `src/modules/gira-eventos/PublicEventPage.tsx` | Linha 65 | `/e/:id` (linha 364) | N/A |

---

## ETAPA 2 — Análise dos Módulos GIRA Forms e GIRA Eventos

### Código-fonte
- **Todos os arquivos existem** nos diretórios `src/modules/gira-forms/` e `src/modules/gira-eventos/`
- Componentes, hooks, tipos e templates estão intactos
- A função `duplicateForm` está presente no `FormsListPage.tsx` (linha 24)

### Sidebar
- **Arquivo:** `src/routes/AppRoutes.tsx`
- **Linha 198:** `{hasPermission('forms_view') && <SidebarLink to="/forms" .../>}`
- **Linha 199:** `{hasPermission('events_view' as any) && <SidebarLink to="/eventos" .../>}`
- Links condicionais por permissão — visíveis apenas para quem tem `forms_view` / `events_view`

### Rotas
- **Linhas 320-323:** Rotas protegidas por `PermissionGuard` com `forms_view` e `events_view`

### Permissões (usePermissions.tsx)
- **Linha 84:** `if (role === 'SUPER_ADMIN' || role === 'ADMIN') return true;`
- Bypass automático para ADMIN e SUPER_ADMIN — **está correto**

---

## ETAPA 3 — Ponto Exato de Possíveis Regressões Anteriores (Histórico)

A causa-raiz das regressões repetidas **não é código atual**, mas sim o **padrão de edição** que ocorreu em iterações anteriores:

### Regressão Tipo 1: Remoção/adição indevida de PermissionGuard
```
Arquivo: src/routes/AppRoutes.tsx
Linhas: 198-199 (sidebar), 320-323 (rotas)
Padrão: A cada edição no AppRoutes.tsx, o PermissionGuard era adicionado ou removido,
        ou o `as any` cast era esquecido, causando bloqueio silencioso.
```

### Regressão Tipo 2: Cast `as any` necessário para `events_view`
```
Arquivo: src/routes/AppRoutes.tsx
Linhas: 199, 322, 323
Problema: O tipo `events_view` precisa de `as any` porque o tipo AppPermission
          no usePermissions.tsx já inclui 'events_view', mas o PermissionGuard
          aceita AppPermission. O cast indica fragilidade de tipagem.
```

### Regressão Tipo 3: Redirecionamento silencioso
```
Arquivo: src/components/PermissionGuard.tsx
Linhas: 15-17
Comportamento: Quando a permissão falha, redireciona para "/" sem mensagem.
               Usuário não sabe por que o módulo "desapareceu".
```

---

## ETAPA 4 — Causa Raiz das Regressões Recorrentes

### Causa Principal: Arquivo monolítico `AppRoutes.tsx` (398 linhas)
- Sidebar, Layout, e Rotas estão **todos no mesmo arquivo**
- Qualquer edição em qualquer parte do sistema que toque este arquivo pode inadvertidamente alterar a sidebar ou as rotas dos módulos
- Este é o arquivo mais editado do projeto e o mais propenso a regressões

### Causa Secundária: Ausência de feedback visual
- `PermissionGuard` redireciona silenciosamente (linha 15-17 de `PermissionGuard.tsx`)
- Não há mensagem "Você não tem permissão para acessar este módulo"
- Usuário interpreta como "módulo sumiu"

### Causa Terciária: Dependência de dados de permissão
- O `useAuth` carrega permissões da tabela `user_permissions` (linhas 78-85 de `useAuth.tsx`)
- Se a query falhar silenciosamente ou demorar, `permissions` fica `[]` e os módulos não aparecem na sidebar
- O bypass ADMIN/SUPER_ADMIN (linha 84 de `usePermissions.tsx`) mitiga isso, mas depende do `role` também carregar corretamente

---

## ETAPA 5 — Contagem de Regressões

| # | Tipo | Severidade | Status Atual |
|---|------|-----------|-------------|
| 1 | Remoção/adição cíclica de PermissionGuard no AppRoutes.tsx | Alta | **Corrigido** (presente e funcional) |
| 2 | Bypass ADMIN/SUPER_ADMIN ausente no hasPermission | Alta | **Corrigido** (linha 84) |
| 3 | Redirecionamento silencioso sem feedback | Média | **Ativo** (não corrigido) |
| 4 | Cast `as any` em `events_view` indicando fragilidade | Baixa | **Ativo** (funcional mas frágil) |

**Regressões passadas corrigidas:** 2
**Riscos ativos que podem causar futuras regressões:** 2

---

## ETAPA 6 — Componentes Críticos

| Componente | Arquivo | Risco |
|-----------|---------|-------|
| Sidebar + Layout + Rotas | `src/routes/AppRoutes.tsx` | **ALTO** — monolítico, 398 linhas, qualquer edição pode causar regressão |
| PermissionGuard | `src/components/PermissionGuard.tsx` | **MÉDIO** — redirecionamento silencioso |
| usePermissions | `src/hooks/usePermissions.tsx` | **BAIXO** — bypass ADMIN/SUPER_ADMIN funcional |
| useAuth | `src/hooks/useAuth.tsx` | **BAIXO** — carregamento de permissões funcional |

---

## ETAPA 7 — Relatório Final

### Estado atual do banco de dados
- **Juan Pablo (super_admin):** possui `forms_view`, `events_view` + bypass automático ✓
- **Raphael Araújo (admin):** possui `forms_view`, `events_view` + bypass automático ✓
- **Thaís Magalhães (analista):** possui `forms_view` mas NÃO `events_view`
- **Marcos Junior (analista):** possui `forms_view` mas NÃO `events_view`

### Conclusão
**Não há regressão ativa no código neste momento.** Os módulos GIRA Forms e GIRA Eventos estão corretamente implementados. A percepção de "sumiço" se deve a:

1. O usuário estar na tela de login (não autenticado) — os módulos só aparecem após login
2. Histórico de edições cíclicas no `AppRoutes.tsx` que adicionavam/removiam guards
3. Redirecionamento silencioso do `PermissionGuard` sem mensagem de erro

### Riscos para futuras regressões
1. **AppRoutes.tsx monolítico** — deveria ser dividido em arquivos separados (sidebar, layout, rotas)
2. **PermissionGuard silencioso** — deveria exibir mensagem "Sem permissão" ao invés de redirecionar
3. **Cast `as any`** nos tipos de `events_view` — indica que a tipagem precisa de alinhamento

