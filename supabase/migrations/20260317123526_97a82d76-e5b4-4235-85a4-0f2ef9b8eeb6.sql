UPDATE form_responses
SET answers = jsonb_set(answers, '{f5da0094-70ce-4cec-b481-4a2018a1d959}', '"Chocalho "'::jsonb)
WHERE id = '5b077fcf-023b-4cd7-8e35-b331da50f479'
AND form_id = '98b06170-70c7-49fc-8888-944d48d2c401'