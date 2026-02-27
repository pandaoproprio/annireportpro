

# Indicadores visuais de atividades do Diário de Bordo no Relatório

## Situação atual

Algumas seções do relatório ja mostram atividades vinculadas (Metas, Outras Ações, Comunicação), mas de forma inconsistente. As seções Resumo, Satisfação, Ações Futuras e seções personalizadas nao mostram nenhuma indicação de dados do Diario.

## O que será feito

Adicionar um componente `ActivityIndicatorBadge` reutilizavel que sera exibido no cabeçalho de cada seção do relatório, mostrando quantas atividades do Diário de Bordo alimentam aquela seção.

### Comportamento por seção

| Seção | Fonte de atividades | Indicador |
|---|---|---|
| Objeto | Nenhuma (texto manual) | Sem indicador |
| Resumo | Todas as atividades | Badge com total |
| Metas | Atividades por meta (goalId) | Badge por meta |
| Outras Ações | Tipo: Outros/Administrativo/Ocorrência | Badge com contagem |
| Comunicação | Tipo: Comunicação | Badge com contagem |
| Satisfação | Nenhuma diretamente | Sem indicador |
| Ações Futuras | Nenhuma diretamente | Sem indicador |
| Despesas | Nenhuma diretamente | Sem indicador |
| Links | Nenhuma diretamente | Sem indicador |

### Design visual

- Badge colorido (verde quando ha atividades, cinza quando nao ha) no cabeçalho da seção
- Icone de caderno (BookOpen) + numero de atividades
- Tooltip ou texto explicativo: "X atividades do Diário de Bordo"
- Manter os paineis expandiveis existentes nas seções de Metas, Outras Ações e Comunicação

## Detalhes técnicos

1. **Criar componente `ActivityCountBadge`** em `src/components/report/ActivityCountBadge.tsx`
   - Props: `count: number`, `label?: string`
   - Renderiza um badge com icone BookOpen + contagem
   - Verde quando count > 0, cinza quando count === 0

2. **Atualizar `SectionHeader`** em `ReportEditSection.tsx`
   - Receber prop `activityCount?: number`
   - Exibir o badge ao lado do titulo da seção

3. **Calcular contagens no `ReportEditSection`**
   - Resumo: `activities.length`
   - Metas: ja existente via `getActivitiesByGoal`
   - Comunicação: `getCommunicationActivities().length`
   - Outras Ações: `getOtherActivities().length`

4. **Atualizar `SectionContent` wrapper** para passar a contagem correta baseada na `section.key`

