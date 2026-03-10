# Relatório de Regressão — GIRA Forms

**Data:** 2026-03-10  
**Status:** Confirmada regressão de acesso/percepção no módulo GIRA Forms

## Resumo executivo
A regressão principal identificada não é a remoção física do módulo GIRA Forms do projeto, e sim uma **inconsistência entre navegação visível e controle de acesso da rota**. O link **GIRA Forms** permanece sempre visível na sidebar, mas as rotas internas `/forms` e `/forms/:id` continuam protegidas por `PermissionGuard` com a permissão `forms_view`. Quando o usuário logado não possui essa permissão, o sistema redireciona para `/`, o que dá a percepção de que o módulo “sumiu” ou foi removido.

Além disso, houve evidência de regressão de processo: mudanças anteriores afirmaram implementação/estabilidade do módulo sem validação fim a fim do fluxo real de acesso.

---

## Sintoma reportado
- “Toda hora você some com o GIRA Forms”
- Percepção de regressão recorrente após alterações em outras áreas do sistema
- Acesso visual ao menu, mas comportamento inconsistente ao tentar usar o módulo

---

## Causa raiz principal
### 1) Inconsistência entre sidebar e permissão de rota
**Evidência:** `src/routes/AppRoutes.tsx`

- O link da sidebar é sempre renderizado:
  - `SidebarLink to="/forms" ... label="GIRA Forms"`
- Mas a rota é protegida por permissão:
  - `PermissionGuard permission={'forms_view' as any}`

### Impacto
Se o usuário não tiver `forms_view` em `permissions`, o clique no item da sidebar leva a um redirecionamento para `/`, produzindo exatamente a sensação de que o módulo desapareceu ou foi revertido.

---

## Causas contribuintes
### 2) Contrato funcional contraditório já conhecido no projeto
**Memória arquitetural relevante:** o link do GIRA Forms na sidebar **deve permanecer visível para todos os usuários autenticados**, e o controle granular deve acontecer **internamente** no módulo.

Hoje o projeto está com este contrato parcialmente quebrado:
- **Sidebar:** visível para todos
- **Rotas principais `/forms` e `/forms/:id`:** bloqueadas por `PermissionGuard`

Isso cria uma UX inconsistente e induz leitura de regressão.

### 3) Falta de validação fim a fim após alterações
As mudanças anteriores no histórico recente misturaram:
- afirmação de implementação da duplicação de formulários
- correção de bug em GIRA Eventos
- ausência de validação do fluxo real de acesso ao GIRA Forms

Resultado: o sistema pode até conter parte do código do módulo, mas continuar “sumindo” do ponto de vista do usuário final por falha de integração/permissão/rota.

### 4) Acoplamento de percepção entre módulos
Mesmo sem alteração direta nos arquivos de GIRA Forms em todas as iterações, mudanças em roteamento, permissões e navegação lateral afetam a disponibilidade percebida do módulo. Isso explica a sensação de regressão constante.

---

## Evidências técnicas coletadas

### Arquivo: `src/routes/AppRoutes.tsx`
**Constatações**
- `FormsListPage`, `FormBuilderPage` e `PublicFormPage` continuam importados.
- A rota pública `/f/:id` existe.
- As rotas autenticadas do módulo existem:
  - `/forms`
  - `/forms/:id`
- Ambas estão protegidas por `PermissionGuard permission={'forms_view' as any}`.

### Arquivo: `src/hooks/usePermissions.tsx`
**Constatações**
- A permissão `forms_view` existe no tipo `AppPermission`.
- O método `hasPermission` depende da lista `permissions` carregada do usuário.
- Se o usuário não for `SUPER_ADMIN` e não tiver `forms_view`, a rota é bloqueada.

### Arquivo: `src/hooks/useAuth.tsx`
**Constatações**
- As permissões são carregadas da tabela `user_permissions`.
- Portanto, qualquer falha de concessão/sincronização de permissões impacta diretamente o acesso ao GIRA Forms.

### Arquivo: `src/modules/gira-forms/FormsListPage.tsx`
**Constatações**
- O código atual ainda contém a ação de duplicação (`duplicateForm`).
- Isso confirma que o módulo não foi apagado do código-base neste momento.

---

## Diagnóstico final
O motivo mais provável de você perceber que o GIRA Forms “some” repetidamente é:

1. **O menu continua visível** para todos os usuários autenticados;
2. **As rotas do módulo continuam protegidas** por `forms_view`;
3. Quando a permissão não está presente, o sistema **redireciona silenciosamente** para a home;
4. Isso aparenta regressão/remoção do módulo, mesmo com o código ainda presente.

Em outras palavras: a regressão principal é **de integração entre navegação e autorização**, não de ausência física do GIRA Forms no repositório.

---

## Severidade
**Alta (UX + confiança do sistema)**

Motivos:
- Gera sensação de perda de funcionalidade
- Faz parecer que entregas foram desfeitas
- Dificulta validar se features do módulo realmente existem
- Aumenta risco de retrabalho e falso diagnóstico

---

## Recomendações objetivas
1. **Alinhar o contrato do módulo**:
   - ou remover o `PermissionGuard` das rotas principais do GIRA Forms;
   - ou esconder o link da sidebar para usuários sem `forms_view`.

2. **Parar de tratar visibilidade e acesso como regras separadas sem feedback visual**.

3. **Adicionar fallback explícito de permissão negada** no lugar de redirecionamento silencioso.

4. **Validar fim a fim após cada alteração**:
   - sidebar
   - clique no item
   - carregamento de `/forms`
   - abertura de `/forms/:id`
   - fluxo de duplicação

5. **Restringir futuras mudanças dos módulos GIRA Forms e GIRA Eventos aos seus próprios diretórios**, evitando regressões indiretas via navegação/permissões sem checagem funcional.

---

## Conclusão
A regressão existe e a causa mais forte encontrada é a **incompatibilidade entre a regra de visibilidade da sidebar e a proteção por permissão das rotas do GIRA Forms**, agravada por ausência de validação fim a fim nas iterações anteriores.
