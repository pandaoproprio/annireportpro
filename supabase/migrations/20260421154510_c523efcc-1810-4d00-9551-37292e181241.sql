-- Rebuild Nossa Gente - Cadastro de Voluntariado form (30 fields, 5 sections)
-- Form ID: 6bd1dc10-6339-4a6f-aa87-5b09397aef45

-- 1) Delete existing section_header fields (recreate them with deterministic IDs)
DELETE FROM form_fields
WHERE form_id = '6bd1dc10-6339-4a6f-aa87-5b09397aef45'
  AND type = 'section_header';

-- ============================================================
-- PASSO 1 · IDENTIFICAÇÃO PESSOAL
-- ============================================================

INSERT INTO form_fields (id, form_id, type, label, description, required, options, settings, sort_order)
VALUES ('a1000000-0000-0000-0000-000000000001', '6bd1dc10-6339-4a6f-aa87-5b09397aef45', 'section_header',
        'PASSO 1 · IDENTIFICAÇÃO PESSOAL', '', false, '[]'::jsonb, '{}'::jsonb, 0);

UPDATE form_fields SET sort_order = 1, label = 'Nome completo', required = true,
  type = 'short_text', options = '[]'::jsonb, settings = '{}'::jsonb, description = ''
WHERE id = 'd479014b-6da8-4ea9-8bf9-cdda9ec38ada';

UPDATE form_fields SET sort_order = 2, label = 'Identidade étnico-racial', required = true,
  type = 'single_select',
  options = '["Amarela", "Branca", "Indígena", "Preta", "Parda", "Prefiro não informar"]'::jsonb,
  settings = '{}'::jsonb, description = ''
WHERE id = 'ff93a7c6-e9c3-4c2a-baf0-d5564a183685';

UPDATE form_fields SET sort_order = 3, label = 'CPF', required = false,
  type = 'cpf_cnpj', options = '[]'::jsonb, settings = '{}'::jsonb, description = ''
WHERE id = 'f5d5a462-322e-41cf-97fe-d10e8199ed40';

UPDATE form_fields SET sort_order = 4, label = 'Telefone / WhatsApp', required = true,
  type = 'phone', options = '[]'::jsonb, settings = '{}'::jsonb, description = ''
WHERE id = '117dd795-1961-4bfe-a6bf-beeb721bb528';

UPDATE form_fields SET sort_order = 5, label = 'E-mail', required = true,
  type = 'email', options = '[]'::jsonb, settings = '{}'::jsonb, description = ''
WHERE id = '2459fdb6-393e-499d-ba2a-654865b135f3';

UPDATE form_fields SET sort_order = 6, label = 'CEP', required = true,
  type = 'cep', options = '[]'::jsonb, settings = '{}'::jsonb, description = ''
WHERE id = '51c2fb65-fb6c-45fc-932d-8a3791120a1c';

UPDATE form_fields SET sort_order = 7, label = 'Número', required = true,
  type = 'short_text', options = '[]'::jsonb, settings = '{}'::jsonb, description = ''
WHERE id = '132c05a3-11fe-430f-bb37-e0b92f03d8ae';

UPDATE form_fields SET sort_order = 8, label = 'Rua', required = true,
  type = 'short_text', options = '[]'::jsonb, settings = '{}'::jsonb, description = ''
WHERE id = '61021ebe-6369-480b-8f7a-537e1b8a8a86';

UPDATE form_fields SET sort_order = 9, label = 'Bairro', required = true,
  type = 'short_text', options = '[]'::jsonb, settings = '{}'::jsonb, description = ''
WHERE id = '72bb88b7-ed68-4dd2-92d9-742fb49b4c32';

UPDATE form_fields SET sort_order = 10, label = 'Município de residência', required = true,
  type = 'short_text', options = '[]'::jsonb, settings = '{}'::jsonb, description = ''
WHERE id = 'b338f538-7ccd-4c15-87f2-2e344c51c8e7';

UPDATE form_fields SET sort_order = 11, label = 'Complemento', required = false,
  type = 'short_text', options = '[]'::jsonb,
  settings = '{"placeholder": "Apt, bloco, sala..."}'::jsonb, description = ''
WHERE id = 'd4a3ff1e-78cb-4a64-ab20-05067880a799';

-- ============================================================
-- PASSO 2 · PERFIL E OCUPAÇÃO
-- ============================================================

INSERT INTO form_fields (id, form_id, type, label, description, required, options, settings, sort_order)
VALUES ('a2000000-0000-0000-0000-000000000002', '6bd1dc10-6339-4a6f-aa87-5b09397aef45', 'section_header',
        'PASSO 2 · PERFIL E OCUPAÇÃO', '', false, '[]'::jsonb, '{}'::jsonb, 12);

UPDATE form_fields SET sort_order = 13, label = 'Profissão / Ocupação', required = true,
  type = 'single_select',
  options = '["Estudante", "Autônomo(a)", "Professor(a)", "Profissional liberal", "Pesquisador(a)", "Produtor(a) cultural", "Servidor(a) público(a)", "Empresário(a) / Empreendedor(a)", "Desempregado(a) / Em busca de oportunidade", "Aposentado(a) / Pensionista", "Outros"]'::jsonb,
  settings = '{}'::jsonb, description = ''
WHERE id = 'b0a1b846-2251-46b5-be36-955209595cf2';

INSERT INTO form_fields (id, form_id, type, label, description, required, options, settings, sort_order)
VALUES ('a3000000-0000-0000-0000-000000000013', '6bd1dc10-6339-4a6f-aa87-5b09397aef45',
        'short_text', 'Qual profissão/ocupação?', '', false, '[]'::jsonb,
        '{"condition": {"field_id": "b0a1b846-2251-46b5-be36-955209595cf2", "operator": "equals", "value": "Outros"}}'::jsonb, 14);

INSERT INTO form_fields (id, form_id, type, label, description, required, options, settings, sort_order)
VALUES ('a3000000-0000-0000-0000-000000000014', '6bd1dc10-6339-4a6f-aa87-5b09397aef45',
        'single_select', 'Como você nos encontrou?', '', false,
        '["Instagram", "Indicação pelo WhatsApp", "Indicação de amigo(a)", "Em um evento presencial", "Outros"]'::jsonb,
        '{}'::jsonb, 15);

INSERT INTO form_fields (id, form_id, type, label, description, required, options, settings, sort_order)
VALUES ('a3000000-0000-0000-0000-000000000015', '6bd1dc10-6339-4a6f-aa87-5b09397aef45',
        'short_text', 'Conte como nos encontrou', '', false, '[]'::jsonb,
        '{"condition": {"field_id": "a3000000-0000-0000-0000-000000000014", "operator": "equals", "value": "Outros"}}'::jsonb, 16);

-- ============================================================
-- PASSO 3 · IDENTIDADE DE GÊNERO E ORIENTAÇÃO
-- ============================================================

INSERT INTO form_fields (id, form_id, type, label, description, required, options, settings, sort_order)
VALUES ('a2000000-0000-0000-0000-000000000003', '6bd1dc10-6339-4a6f-aa87-5b09397aef45', 'section_header',
        'PASSO 3 · IDENTIDADE DE GÊNERO E ORIENTAÇÃO', '', false, '[]'::jsonb, '{}'::jsonb, 17);

INSERT INTO form_fields (id, form_id, type, label, description, required, options, settings, sort_order)
VALUES ('a3000000-0000-0000-0000-000000000016', '6bd1dc10-6339-4a6f-aa87-5b09397aef45',
        'single_select', 'Identidade de gênero', 'Como você se identifica?', true,
        '["Mulher cisgênero", "Homem cisgênero", "Mulher transgênero / transexual", "Homem transgênero / transexual", "Não binário(a)", "Outra identidade", "Prefiro não declarar"]'::jsonb,
        '{}'::jsonb, 18);

UPDATE form_fields SET sort_order = 19, label = 'Nome social', required = false,
  type = 'short_text', options = '[]'::jsonb,
  description = 'Nome utilizado por pessoas trans e travestis no meio social.',
  settings = '{"conditionGroup": {"logic": "OR", "conditions": [
    {"field_id": "a3000000-0000-0000-0000-000000000016", "operator": "equals", "value": "Mulher transgênero / transexual"},
    {"field_id": "a3000000-0000-0000-0000-000000000016", "operator": "equals", "value": "Homem transgênero / transexual"},
    {"field_id": "a3000000-0000-0000-0000-000000000016", "operator": "equals", "value": "Não binário(a)"},
    {"field_id": "a3000000-0000-0000-0000-000000000016", "operator": "equals", "value": "Outra identidade"}
  ]}}'::jsonb
WHERE id = '05fbb399-73ac-409a-9f93-938c1fbbf190';

UPDATE form_fields SET sort_order = 20, label = 'Orientação sexual', required = true,
  type = 'single_select',
  options = '["Lésbica", "Gay", "Bissexual", "Heterossexual", "Prefiro não declarar"]'::jsonb,
  description = 'Refere-se às relações afetivo-sexuais.',
  settings = '{}'::jsonb
WHERE id = '2c7fbfab-5a44-4fd9-9b3e-e1676b896c0e';

-- ============================================================
-- PASSO 4 · VOLUNTARIADO
-- ============================================================

INSERT INTO form_fields (id, form_id, type, label, description, required, options, settings, sort_order)
VALUES ('a2000000-0000-0000-0000-000000000004', '6bd1dc10-6339-4a6f-aa87-5b09397aef45', 'section_header',
        'PASSO 4 · VOLUNTARIADO',
        'Mapeamento para fortalecer nossas ações através da doação de tempo, talento ou recursos.',
        false, '[]'::jsonb, '{}'::jsonb, 21);

UPDATE form_fields SET sort_order = 22, label = 'Deseja colaborar voluntariamente?', required = true,
  type = 'single_select',
  options = '["Sim, quero somar com meus talentos ou recursos.", "No momento não posso, mas quero continuar acompanhando."]'::jsonb,
  settings = '{}'::jsonb, description = ''
WHERE id = '5c7de9d3-b456-4cc9-8b55-3b5dbace114f';

UPDATE form_fields SET sort_order = 23, label = 'Talentos e habilidades que pode oferecer', required = true,
  type = 'multi_select',
  options = '["Comunicação e Design — Criação de artes, vídeos ou textos", "Fotografia e Registro — Registro fotográfico de encontros e ações", "Redes Sociais — Instagram, TikTok e mobilização digital", "Eventos e Cultura — Organização, produção, som ou iluminação", "Gastronomia / Alimentação — Cozinhar ou planejar cardápio para a galera", "Educação e Formação — Aulas, palestras ou oficinas", "Por enquanto não tenho um talento específico, mas quero ajudar!"]'::jsonb,
  description = 'Marque todas as opções que se aplicam.',
  settings = '{"condition": {"field_id": "5c7de9d3-b456-4cc9-8b55-3b5dbace114f", "operator": "equals", "value": "Sim, quero somar com meus talentos ou recursos."}, "allowOther": true, "exclusiveOption": "Por enquanto não tenho um talento específico, mas quero ajudar!"}'::jsonb
WHERE id = '1cc30deb-dcb0-4bd6-8dde-279792c857b0';

UPDATE form_fields SET sort_order = 24, label = 'Outros talentos', required = false,
  type = 'short_text', options = '[]'::jsonb, description = '',
  settings = '{"conditionGroup": {"logic": "AND", "conditions": [
    {"field_id": "5c7de9d3-b456-4cc9-8b55-3b5dbace114f", "operator": "equals", "value": "Sim, quero somar com meus talentos ou recursos."},
    {"field_id": "1cc30deb-dcb0-4bd6-8dde-279792c857b0", "operator": "contains", "value": "__other__"}
  ]}}'::jsonb
WHERE id = 'e18556aa-090a-40d1-8351-84e78cab1219';

UPDATE form_fields SET sort_order = 25, label = 'O que pode oferecer logisticamente?', required = true,
  type = 'multi_select',
  options = '["Transporte — Carro/moto para deslocamentos ou entregas", "Espaço físico — Local para reuniões ou atividades", "Doação de Materiais — Limpeza, escritório ou papelaria", "Fortalecimento Financeiro — Contribuição para lanche ou café dos encontros", "Quero ajudar, mas precisaria de apoio para participar"]'::jsonb,
  description = 'Marque todas as opções que se aplicam.',
  settings = '{"condition": {"field_id": "5c7de9d3-b456-4cc9-8b55-3b5dbace114f", "operator": "equals", "value": "Sim, quero somar com meus talentos ou recursos."}, "allowOther": true, "exclusiveOption": "Quero ajudar, mas precisaria de apoio para participar"}'::jsonb
WHERE id = '738f4c66-7f60-4e9f-a207-a9c08b62c25d';

UPDATE form_fields SET sort_order = 26, label = 'Outros apoios', required = false,
  type = 'short_text', options = '[]'::jsonb, description = '',
  settings = '{"conditionGroup": {"logic": "AND", "conditions": [
    {"field_id": "5c7de9d3-b456-4cc9-8b55-3b5dbace114f", "operator": "equals", "value": "Sim, quero somar com meus talentos ou recursos."},
    {"field_id": "738f4c66-7f60-4e9f-a207-a9c08b62c25d", "operator": "contains", "value": "__other__"}
  ]}}'::jsonb
WHERE id = '1c99b994-71f0-4a57-ac3a-c6e283e78de6';

INSERT INTO form_fields (id, form_id, type, label, description, required, options, settings, sort_order)
VALUES ('a3000000-0000-0000-0000-000000000024', '6bd1dc10-6339-4a6f-aa87-5b09397aef45',
        'multi_select', 'Que tipo de apoio precisaria receber?', '', false,
        '["Transporte / passagem", "Materiais para a atividade", "Alimentação durante os encontros", "Equipamentos (câmera, computador, ferramentas)", "Apoio financeiro pontual", "Outros"]'::jsonb,
        '{"conditionGroup": {"logic": "AND", "conditions": [
          {"field_id": "5c7de9d3-b456-4cc9-8b55-3b5dbace114f", "operator": "equals", "value": "Sim, quero somar com meus talentos ou recursos."},
          {"field_id": "738f4c66-7f60-4e9f-a207-a9c08b62c25d", "operator": "contains", "value": "Quero ajudar, mas precisaria de apoio para participar"}
        ]}}'::jsonb, 27);

INSERT INTO form_fields (id, form_id, type, label, description, required, options, settings, sort_order)
VALUES ('a3000000-0000-0000-0000-000000000025', '6bd1dc10-6339-4a6f-aa87-5b09397aef45',
        'short_text', 'Outros apoios necessários', '', false, '[]'::jsonb,
        '{"conditionGroup": {"logic": "OR", "conditions": [
          {"field_id": "738f4c66-7f60-4e9f-a207-a9c08b62c25d", "operator": "contains", "value": "Quero ajudar, mas precisaria de apoio para participar"},
          {"field_id": "a3000000-0000-0000-0000-000000000024", "operator": "contains", "value": "Outros"}
        ]}}'::jsonb, 28);

INSERT INTO form_fields (id, form_id, type, label, description, required, options, settings, sort_order)
VALUES ('a3000000-0000-0000-0000-000000000026', '6bd1dc10-6339-4a6f-aa87-5b09397aef45',
        'single_select', 'Precisará de recursos externos?', '', true,
        '["Sim", "Não"]'::jsonb,
        '{"condition": {"field_id": "5c7de9d3-b456-4cc9-8b55-3b5dbace114f", "operator": "equals", "value": "Sim, quero somar com meus talentos ou recursos."}}'::jsonb, 29);

INSERT INTO form_fields (id, form_id, type, label, description, required, options, settings, sort_order)
VALUES ('a3000000-0000-0000-0000-000000000027', '6bd1dc10-6339-4a6f-aa87-5b09397aef45',
        'multi_select', 'Quais tipos de recursos externos?', '', false,
        '["Recursos financeiros", "Materiais de consumo", "Equipamentos", "Espaço / infraestrutura"]'::jsonb,
        '{"condition": {"field_id": "a3000000-0000-0000-0000-000000000026", "operator": "equals", "value": "Sim"}}'::jsonb, 30);

INSERT INTO form_fields (id, form_id, type, label, description, required, options, settings, sort_order)
VALUES ('a3000000-0000-0000-0000-000000000028', '6bd1dc10-6339-4a6f-aa87-5b09397aef45',
        'single_select', 'Quantas horas pode se dedicar por semana?', '', true,
        '["Até 3 horas semanais (1h × 3 dias por semana)", "Até 4 horas semanais (1h × 4 dias por semana)", "Até 7 horas semanais (1h por dia, todos os dias)", "Mais de 7 horas semanais", "Disponibilidade variável / sob demanda"]'::jsonb,
        '{"condition": {"field_id": "5c7de9d3-b456-4cc9-8b55-3b5dbace114f", "operator": "equals", "value": "Sim, quero somar com meus talentos ou recursos."}}'::jsonb, 31);

-- ============================================================
-- PASSO 5 · PREFERÊNCIA DE CONTATO E NEWSLETTER
-- ============================================================

INSERT INTO form_fields (id, form_id, type, label, description, required, options, settings, sort_order)
VALUES ('a2000000-0000-0000-0000-000000000005', '6bd1dc10-6339-4a6f-aa87-5b09397aef45', 'section_header',
        'PASSO 5 · PREFERÊNCIA DE CONTATO E NEWSLETTER', '', false, '[]'::jsonb, '{}'::jsonb, 32);

UPDATE form_fields SET sort_order = 33, label = 'Como prefere que entrem em contato?', required = true,
  type = 'single_select',
  options = '["Pode me chamar pelo WhatsApp ou ligar!", "Prefiro que entrem em contato por e-mail.", "Agora não — só preenchi para deixar registrado."]'::jsonb,
  settings = '{}'::jsonb, description = ''
WHERE id = 'baaabbcd-a22f-4cb8-9374-4acd420f7252';

INSERT INTO form_fields (id, form_id, type, label, description, required, options, settings, sort_order)
VALUES ('a3000000-0000-0000-0000-000000000030', '6bd1dc10-6339-4a6f-aa87-5b09397aef45',
        'single_select', 'Deseja assinar a newsletter?', 'Prometemos não encher sua caixa de entrada.', false,
        '["Sim, quero receber novidades, convites e informações por e-mail.", "Não, prefiro não receber e-mails."]'::jsonb,
        '{}'::jsonb, 34);