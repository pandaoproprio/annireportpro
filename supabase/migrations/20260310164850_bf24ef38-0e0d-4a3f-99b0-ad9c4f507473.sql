-- Grant forms and events permissions to all existing admins
INSERT INTO public.user_permissions (user_id, permission, granted_by)
SELECT ur.user_id, p.perm::app_permission, ur.user_id
FROM public.user_roles ur
CROSS JOIN (VALUES ('forms_view'), ('forms_create'), ('forms_edit'), ('forms_delete'), ('forms_export'), ('events_view'), ('events_create'), ('events_edit'), ('events_delete')) AS p(perm)
WHERE ur.role IN ('admin', 'super_admin')
ON CONFLICT (user_id, permission) DO NOTHING;