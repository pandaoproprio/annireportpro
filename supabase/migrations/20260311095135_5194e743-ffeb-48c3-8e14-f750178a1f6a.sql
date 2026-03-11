
-- Drop the recursive SELECT policy (self-references chat_channel_members)
DROP POLICY IF EXISTS "Members can view channel members" ON public.chat_channel_members;

-- Create SECURITY DEFINER helper for channel ownership check
CREATE OR REPLACE FUNCTION public.is_channel_creator(_user_id uuid, _channel_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_channels
    WHERE id = _channel_id AND created_by = _user_id
  )
$$;

REVOKE EXECUTE ON FUNCTION public.is_channel_creator FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_channel_creator TO authenticated;

-- Recreate INSERT policy using the helper
DROP POLICY IF EXISTS "Authorized can add members" ON public.chat_channel_members;
CREATE POLICY "Authorized can add members"
ON public.chat_channel_members
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_channel_creator(auth.uid(), channel_id)
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
);

-- Recreate DELETE policy using the helper
DROP POLICY IF EXISTS "Authorized can remove members" ON public.chat_channel_members;
CREATE POLICY "Authorized can remove members"
ON public.chat_channel_members
FOR DELETE
TO authenticated
USING (
  public.is_channel_creator(auth.uid(), channel_id)
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
  OR auth.uid() = user_id
);
