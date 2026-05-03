## Diagnóstico

### Bug 1 — "META 1: META 1"
- Render: `src/components/report/ReportEditSection.tsx:662` → `META {idx + 1}: {goal.title}`.
- Banco (`projects.goals` jsonb) confirma a causa: alguns projetos têm `title` salvo literalmente como `"META 1"`, `"META 2"`... (ex.: JPA Afrocultural, Didáticas Urbanas de Matrizes do Samba II). Outros projetos (ex.: Ubuntu Carioca) têm `title` com o objetivo descritivo correto e funcionam normalmente.
- Conclusão: o template está correto; o problema é o **dado** salvo. Precisa de fallback no render + correção pontual dos títulos no banco.

### Bug 2 — Painel de registros do Diário de Bordo não aparece por meta
- Componente já existe: `ActivitiesPanel` em `ReportEditSection.tsx:666`, alimentado por `getActivitiesByGoal(goal.id)` (`src/hooks/useReportState.tsx:326`), que filtra `activities.filter(a => a.goalId === goalId)`.
- `ActivitiesPanel` retorna `null` quando a lista está vazia (linha 533).
- Banco: a maioria dos registros tem `goal_id = NULL`. Dos 29 registros do projeto, apenas 2 estão vinculados a meta. Por isso o painel não aparece — não há vínculo, não há registros para listar.
- O campo `goal_id` (text) **existe** em `activities` e o Activity Manager já tem seletor de meta (`ActivityManager.tsx:472`), mas usuários não estão preenchendo.

### Resumo das causas
1. Título duplicado = dado ruim em `projects.goals[].title`.
2. Painel ausente = registros sem `goal_id` no banco; nenhuma UI para vincular registros existentes a uma meta a partir do Gerador de Relatório.

---

## Correções

### 1. Bug 1 — render à prova de duplicação
Em `ReportEditSection.tsx:662` (e também no badge da linha 663 e em `ReportPreviewSection.tsx` GoalsPreview):
- Detectar quando `goal.title` já começa com `META` (regex `/^\s*META\s*\d+/i`) e, nesse caso, exibir só `goal.title`. Caso contrário manter `META {idx+1}: {goal.title}`.
- Mesma normalização aplicada em `src/lib/docxExport.ts` (linha ~615) para o export.

Migração de dados pontual (insert/update via tool de dados) para os projetos identificados: substituir `title` `"META N"` pelo texto da `description` correspondente, preservando o restante. Será feita só onde `title ~ /^META\s*\d+$/`, usando `description` como novo título.

### 2. Bug 2 — Painel de registros por meta + vínculo

**2a. Tornar o painel sempre visível por meta (mesmo vazio)**
- Em `ActivitiesPanel`: remover o `return null` quando `onInsert` está presente; renderizar estado vazio com mensagem "Nenhum registro vinculado a esta meta" e botão **"Vincular registros existentes"**.

**2b. Diálogo "Vincular registros à meta"**
- Novo componente `LinkActivitiesToGoalDialog.tsx` aberto pelo botão acima. Lista todos os `activities` do projeto **sem** `goalId` (ou vinculados a outra meta), com checkbox, data, descrição resumida, participantes. Salva via novo helper `linkActivitiesToGoal(goalId, activityIds[])` em `useActivities.tsx` que faz `UPDATE activities SET goal_id = $1 WHERE id = ANY($2)` respeitando RLS atual (autor, admin, coord, super_admin).
- Após salvar, refresh do contexto de atividades — `getActivitiesByGoal` passa a retornar e o painel exibe normalmente, com checkboxes "Selecionar tudo" e "Inserir selecionados" que já existem.

**2c. Vínculo no momento do registro**
- Já existe seletor de meta em `ActivityManager.tsx`. Adicionar **destaque visual** ("Recomendado") e tornar o campo obrigatório quando o projeto tem metas — para evitar acúmulo futuro de registros sem meta.

**2d. "Sugerir com IA" por meta usa registros reais**
- O `AiTextToolbar` já recebe `activities={goalActs}` e `goalTitle/goalAudience`. Garantir que a edge function `generate-narrative` use exclusivamente `activities` recebido (filtrado por meta) e cite datas/descrições reais.
- Se `goalActs.length === 0`: a IA deve retornar mensagem orientando a vincular registros (sem inventar conteúdo) — alterar prompt da função.

**2e. Os 29 registros visíveis na imagem**
- Não fazemos auto-classificação por palavras-chave (sem regra de negócio explícita). O fluxo correto é: usuário/admin/coord usa o diálogo "Vincular registros existentes" em cada meta para distribuir os registros. Cada registro fica em apenas uma meta (campo único `goal_id`).

---

## Arquivos a alterar

- `src/components/report/ReportEditSection.tsx` — fallback de título; painel sempre visível; botão/dialog de vínculo.
- `src/components/report/ReportPreviewSection.tsx` — fallback de título no preview.
- `src/lib/docxExport.ts` — fallback de título no export DOCX.
- `src/hooks/useActivities.tsx` — função `linkActivitiesToGoal`.
- `src/components/activity/LinkActivitiesToGoalDialog.tsx` — novo.
- `src/pages/ActivityManager.tsx` — destacar/forçar meta no formulário.
- `supabase/functions/generate-narrative/index.ts` — prompt usar somente atividades passadas, não inventar.
- Operação de dados pontual: normalizar `projects.goals[].title` "META N" → usar `description`.

## Garantias
- Nada além do título e do painel por meta é alterado no Gerador de Relatório.
- Render usa fallback para o caso de o dado ainda estar duplicado em outros projetos.
- Vínculo só por ação explícita do usuário; nenhum registro é classificado automaticamente.
