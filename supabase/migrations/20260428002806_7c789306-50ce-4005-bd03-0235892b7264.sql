
DO $$
DECLARE
  _form uuid := '6bd1dc10-6339-4a6f-aa87-5b09397aef45';
  _hours_field uuid := 'a3000000-0000-0000-0000-000000000028';
  _schedule_field uuid := 'a3000000-0000-0000-0000-000000000031';
  _holiday_field uuid := 'a3000000-0000-0000-0000-000000000032';
  _voluntariado_field uuid := '5c7de9d3-b456-4cc9-8b55-3b5dbace114f';
BEGIN
  UPDATE form_fields
    SET sort_order = sort_order + 2
    WHERE form_id = _form AND sort_order >= 32;

  UPDATE form_fields
    SET options = to_jsonb(ARRAY[
      '⚡ Até 2h/semana — Contribuições pontuais e rápidas',
      '🕐 De 2h a 4h/semana — Pequenas colaborações regulares',
      '🕓 De 4h a 6h/semana — Engajamento moderado',
      '🕗 De 6h a 8h/semana — Dedicação consistente',
      '🕙 De 8h a 12h/semana — Participação intensa',
      '🕛 De 12h a 20h/semana — Quase meio período',
      '💼 Mais de 20h/semana — Dedicação próxima ao integral',
      '🔄 Variável / sob demanda — Sem compromisso fixo semanal'
    ]),
    settings = jsonb_set(COALESCE(settings, '{}'::jsonb), '{allowOther}', 'true'::jsonb, true),
    updated_at = now()
    WHERE id = _hours_field;

  INSERT INTO form_fields (id, form_id, type, label, description, required, options, settings, sort_order)
  VALUES (
    _schedule_field, _form, 'multi_select',
    'Qual é o seu melhor horário para contribuir?',
    'Pode selecionar mais de uma opção.',
    true,
    to_jsonb(ARRAY[
      '🌅 Manhã (até 12h)',
      '☀️ Tarde (12h às 18h)',
      '🌙 Noite (após 18h)',
      '📅 Fins de semana',
      '🎉 Feriados — Disponível para atividades em datas comemorativas',
      '📅🎉 Fins de semana e feriados',
      '🔄 Horário variável / sob demanda'
    ]),
    jsonb_build_object(
      'allowOther', true,
      'condition', jsonb_build_object(
        'field_id', _voluntariado_field::text,
        'operator', 'equals',
        'value', 'Sim, quero somar com minha força de trabalho voluntária.'
      )
    ),
    32
  );

  INSERT INTO form_fields (id, form_id, type, label, description, required, options, settings, sort_order)
  VALUES (
    _holiday_field, _form, 'multi_select',
    'Em quais tipos de feriado você estaria disponível?',
    'Selecione todas as opções aplicáveis.',
    false,
    to_jsonb(ARRAY[
      '🇧🇷 Feriados nacionais',
      '🏙️ Feriados municipais / estaduais',
      '⛪ Datas religiosas (ex: Corpus Christi, Nossa Senhora)',
      '🥁 Datas culturais (ex: Carnaval, Festas Juninas)',
      '📋 Qualquer feriado, conforme a necessidade'
    ]),
    jsonb_build_object(
      'conditionGroup', jsonb_build_object(
        'logic', 'OR',
        'action', 'show',
        'conditions', jsonb_build_array(
          jsonb_build_object('field_id', _schedule_field::text, 'operator', 'equals', 'value', '🎉 Feriados — Disponível para atividades em datas comemorativas'),
          jsonb_build_object('field_id', _schedule_field::text, 'operator', 'equals', 'value', '📅🎉 Fins de semana e feriados')
        )
      )
    ),
    33
  );
END $$;
