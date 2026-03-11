
-- Create SECURITY DEFINER function to check channel membership (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_channel_member(_user_id uuid, _channel_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_channel_members
    WHERE channel_id = _channel_id AND user_id = _user_id
  )
$$;

REVOKE EXECUTE ON FUNCTION public.is_channel_member FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_channel_member TO authenticated;

-- Fix chat_messages INSERT policy to use SECURITY DEFINER function
DROP POLICY IF EXISTS "Members can send messages" ON public.chat_messages;
CREATE POLICY "Members can send messages"
ON public.chat_messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND public.is_channel_member(auth.uid(), channel_id)
);

-- Fix chat_messages SELECT policy to use SECURITY DEFINER function
DROP POLICY IF EXISTS "Members can view messages" ON public.chat_messages;
CREATE POLICY "Members can view messages"
ON public.chat_messages
FOR SELECT
TO authenticated
USING (
  public.is_channel_member(auth.uid(), channel_id)
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
);
