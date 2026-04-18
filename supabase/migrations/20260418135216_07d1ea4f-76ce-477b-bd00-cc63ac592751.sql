
-- Atualizar perguntas existentes do formulário "Cadastro de Voluntários"

-- 1) Orientação Sexual: novas opções com descrições explicativas
UPDATE form_fields
SET 
  label = 'Qual é sua orientação sexual?',
  description = 'Termo relativo às relações afetivo-sexuais.',
  options = '["Lésbica (pessoa de identidade de gênero feminina que apenas se relaciona afetiva e/ou sexualmente com outras pessoas de identidade de gênero feminina)", "Gay (pessoa de identidade de gênero masculina que apenas se relaciona afetiva e/ou sexualmente com outras pessoas de identidade de gênero masculina)", "Bissexual (pessoa que se relaciona afetiva e/ou sexualmente com pessoas independentemente do gênero)", "Heterossexual (pessoa que se relaciona afetiva e/ou sexualmente apenas com pessoas do gênero oposto)", "Prefiro não declarar"]'::jsonb,
  settings = settings || '{"allowOther": true, "otherLabel": "Outra"}'::jsonb,
  updated_at = now()
WHERE id = '2c7fbfab-5a44-4fd9-9b3e-e1676b896c0e';

-- 2) Identidade de Gênero: simplificar para Feminina/Masculina/Não binárie + Outro
UPDATE form_fields
SET 
  label = 'Qual é seu gênero / identidade de gênero?',
  description = 'Termo relativo à identidade da pessoa.',
  options = '["Feminina", "Masculina", "Não binárie"]'::jsonb,
  settings = settings || '{"allowOther": true, "otherLabel": "Outro"}'::jsonb,
  updated_at = now()
WHERE id = 'b896e6ac-6564-4a74-b226-d5f1acef10d1';

-- 3) Nova pergunta: Pessoa intersexo (após Identidade de Gênero, sort_order 19.5 → 20 com shift)
-- Para evitar conflito, vou reorganizar usando valores intermediários

-- Shift de tudo que vem depois de Identidade de Gênero (sort_order >= 20) em +3
UPDATE form_fields
SET sort_order = sort_order + 3
WHERE form_id = '6bd1dc10-6339-4a6f-aa87-5b09397aef45'
  AND sort_order >= 20;

-- Inserir: Pessoa intersexo
INSERT INTO form_fields (form_id, type, label, description, required, options, settings, sort_order)
VALUES (
  '6bd1dc10-6339-4a6f-aa87-5b09397aef45',
  'single_select',
  'Você é pessoa intersexo?',
  'Pessoa cujo corpo varia do padrão definido pela medicina como corpo masculino ou feminino, no que se refere às suas características sexuais congênitas.',
  true,
  '["Sim", "Não", "Prefiro não declarar"]'::jsonb,
  '{}'::jsonb,
  20
);

-- Inserir: Pessoa trans ou travesti
INSERT INTO form_fields (id, form_id, type, label, description, required, options, settings, sort_order)
VALUES (
  gen_random_uuid(),
  '6bd1dc10-6339-4a6f-aa87-5b09397aef45',
  'single_select',
  'Você é pessoa trans ou travesti?',
  '',
  true,
  '["Não", "Sim, sou pessoa trans/transexual", "Sim, sou travesti", "Sim, sou não binárie"]'::jsonb,
  '{"allowOther": true, "otherLabel": "Outra"}'::jsonb,
  21
);
