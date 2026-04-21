UPDATE public.form_fields
SET settings = replace(
  settings::text,
  'Sim, quero somar com meus talentos ou recursos.',
  'Sim, quero somar com minha força de trabalho voluntária.'
)::jsonb
WHERE form_id = '6bd1dc10-6339-4a6f-aa87-5b09397aef45'
  AND settings::text LIKE '%Sim, quero somar com meus talentos ou recursos.%';