

# Plano de Correcao: Gaps de RLS e Permissoes

## Resumo dos Problemas

O sistema esta em nivel de maturidade 6.5/10. As policies RLS foram corrigidas para PERMISSIVE, mas restam 3 problemas criticos que impedem o papel admin de funcionar corretamente:

1. Permissoes RBAC do Raphael (admin) estao incompletas no banco
2. Tabela `activities` nao tem policies de INSERT/UPDATE para admins
3. Tabela `profiles` nao tem policy SELECT para admins verem outros usuarios

## Etapa 1 — Corrigir permissoes do Raphael no banco

Executar SQL para adicionar as permissoes faltantes ao usuario admin, alinhando com o que `populate_default_permissions` define para o role admin:
- `user_management`, `user_management_create`, `user_management_edit`, `user_management_delete`
- `settings_edit`
- `system_logs`
- `project_delete`

## Etapa 2 — Adicionar policies RLS para admin em activities

Criar 2 novas policies PERMISSIVE em `activities`:
- "Admins can insert activities": INSERT com `has_role(auth.uid(), 'admin')` OR `has_role(auth.uid(), 'super_admin')`
- "Admins can update all activities": UPDATE com a mesma logica

Isso permite que admins criem e editem atividades em qualquer projeto.

## Etapa 3 — Adicionar policy SELECT em profiles para admin

Criar policy PERMISSIVE:
- "Admins can view all profiles": SELECT com `has_role(auth.uid(), 'admin')` OR `has_role(auth.uid(), 'super_admin')`

Isso permite que admins vejam perfis de todos os usuarios no frontend (necessario para gestao de usuarios e exibicao de nomes).

## Etapa 4 — Corrigir warning do Tiptap (menor)

No componente `rich-text-editor.tsx`, remover a extensao `Underline` duplicada do StarterKit ou da importacao avulsa.

## Detalhes Tecnicos

### Migration SQL (Etapas 1-3)

```sql
-- Etapa 1: Permissoes faltantes do Raphael
INSERT INTO public.user_permissions (user_id, permission)
SELECT '1f296ff9-78c3-481b-b28d-f631f1866e7f', p.perm
FROM (VALUES 
  ('user_management'), ('user_management_create'), ('user_management_edit'), ('user_management_delete'),
  ('settings_edit'), ('system_logs'), ('project_delete')
) AS p(perm)
WHERE NOT EXISTS (
  SELECT 1 FROM user_permissions 
  WHERE user_id = '1f296ff9-78c3-481b-b28d-f631f1866e7f' AND permission = p.perm::app_permission
);

-- Etapa 2: Admin activities policies
CREATE POLICY "Admins can insert activities"
ON public.activities FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Admins can update all activities"
ON public.activities FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
);

-- Etapa 3: Admin profiles SELECT
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
);
```

### Arquivo a editar (Etapa 4)
- `src/components/ui/rich-text-editor.tsx`: Remover extensao Underline duplicada

## Resultado Esperado

Apos estas correcoes:
- Raphael tera acesso completo de admin: Gestao de Usuarios, Logs, Configuracoes
- Admin podera criar/editar atividades em qualquer projeto
- Admin podera ver perfis de todos os usuarios
- Warning do console sera eliminado
- Nivel de maturidade sobe para ~7/10

