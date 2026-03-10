

# Plano: Evolução GIRA Forms + Novo Módulo GIRA Eventos

## Regra de Segurança contra Regressão

- **ZERO alterações** em qualquer arquivo fora de `src/modules/gira-forms/`, `src/modules/gira-eventos/`, e as linhas específicas de rotas/sidebar em `AppRoutes.tsx`.
- Apenas **adições** em `AppRoutes.tsx` (nova rota e link no sidebar). Nenhum código existente será removido ou modificado.

---

## 1. GIRA Eventos — Novo Módulo

### 1.1 Banco de dados (migração)

```sql
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid REFERENCES public.projects(id),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '',
  event_date timestamptz NOT NULL,
  event_end_date timestamptz,
  category text NOT NULL DEFAULT 'geral',
  status text NOT NULL DEFAULT 'ativo',
  max_participants integer,
  cover_image_url text,
  settings jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.event_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  document text,
  status text NOT NULL DEFAULT 'confirmado',
  registered_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid
);

-- RLS para events e event_registrations
-- Owners/admins gerenciam; anon pode ver eventos ativos; anon pode se inscrever
```

### 1.2 Estrutura de arquivos

```text
src/modules/gira-eventos/
├── EventsListPage.tsx        — listagem com filtros e criação
├── EventDetailPage.tsx       — detalhe, edição, gestão participantes
├── PublicEventPage.tsx       — página pública de inscrição
├── types.ts                  — tipos e constantes
├── hooks/
│   ├── useEvents.ts          — CRUD eventos
│   └── useEventRegistrations.ts — inscrições
└── components/
    ├── EventCard.tsx
    ├── EventForm.tsx
    ├── RegistrationForm.tsx
    ├── RegistrationsList.tsx
    └── EventCalendar.tsx
```

### 1.3 Rotas (adições em AppRoutes.tsx)

- `/eventos` — lista de eventos (dentro do Layout, protegido)
- `/eventos/:id` — detalhe/edição do evento
- `/e/:id` — página pública de inscrição (fora do Layout, como `/f/:id`)
- Novo link no sidebar: "GIRA Eventos" com ícone `CalendarDays`

### 1.4 Funcionalidades

- Cadastro de eventos com título, descrição, local, data/hora, categoria, imagem de capa
- Agenda visual (calendário mensal)
- Página pública de inscrição (sem login, similar ao formulário público)
- Lista de participantes com exportação CSV
- Status do evento (ativo, encerrado, cancelado)
- Vinculação opcional a projeto

---

## 2. GIRA Forms — Melhorias Independentes

Melhorias incrementais no módulo existente, sem tocar em nenhum outro módulo:

- **Evolução do design editor**: mais opções de personalização (fontes, cores de seção, espaçamentos)
- **Dashboard de respostas aprimorado**: mais tipos de gráfico, filtros cruzados
- **Duplicação de formulários**: botão para clonar um formulário existente
- **Imagem de capa e logotipo**: upload direto no editor de design com preview em tempo real

Todos esses itens ficam contidos em `src/modules/gira-forms/`.

---

## 3. Ordem de Implementação

1. Migração SQL (tabelas `events` + `event_registrations` + RLS)
2. Tipos e hooks do GIRA Eventos
3. Páginas e componentes do GIRA Eventos
4. Rotas e sidebar (adições mínimas em `AppRoutes.tsx`)
5. Melhorias no GIRA Forms (incrementais)

---

## Detalhes Técnicos

- Permissões: reutilizar o sistema existente. Novos eventos visíveis para quem tem `dashboard` ou nova permissão `events_view`.
- Storage: reutilizar bucket existente ou criar `event-images` para capas.
- Padrão de código: mesmo padrão do GIRA Forms (hooks com react-query, lazy loading, tipos separados).

