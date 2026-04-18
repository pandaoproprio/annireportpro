
INSERT INTO form_fields (form_id, type, label, description, required, options, settings, sort_order)
VALUES (
  '6bd1dc10-6339-4a6f-aa87-5b09397aef45',
  'short_text',
  'Nome social (opcional)',
  'Nome utilizado por pessoas trans e travestis no meio social, em contraste com o nome registrado. Opcional para pessoas com documentos retificados.',
  false,
  '[]'::jsonb,
  jsonb_build_object(
    'conditionGroup', jsonb_build_object(
      'logic', 'OR',
      'conditions', jsonb_build_array(
        jsonb_build_object('field_id', 'c34ca533-980b-4aa3-b4ba-5302166297fb', 'operator', 'equals', 'value', 'Sim, sou pessoa trans/transexual'),
        jsonb_build_object('field_id', 'c34ca533-980b-4aa3-b4ba-5302166297fb', 'operator', 'equals', 'value', 'Sim, sou travesti'),
        jsonb_build_object('field_id', 'c34ca533-980b-4aa3-b4ba-5302166297fb', 'operator', 'equals', 'value', 'Sim, sou não binárie')
      )
    )
  ),
  22
);
