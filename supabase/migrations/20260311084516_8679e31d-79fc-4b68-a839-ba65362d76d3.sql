
-- Drop existing RESTRICTIVE policies on chat_channels
DROP POLICY IF EXISTS "Users can create channels" ON public.chat_channels;
DROP POLICY IF EXISTS "Members can view channels" ON public.chat_channels;
DROP POLICY IF EXISTS "Channel creators and admins can update channels" ON public.chat_channels;

-- Recreate as PERMISSIVE (default)
CREATE POLICY "Users can create channels"
  ON public.chat_channels FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Members can view channels"
  ON public.chat_channels FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_channel_members
      WHERE chat_channel_members.channel_id = chat_channels.id
        AND chat_channel_members.user_id = auth.uid()
    )
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Channel creators and admins can update channels"
  ON public.chat_channels FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = created_by
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

-- Also fix chat_channel_members (same RESTRICTIVE issue)
DROP POLICY IF EXISTS "Authorized can add members" ON public.chat_channel_members;
DROP POLICY IF EXISTS "Members can view their memberships" ON public.chat_channel_members;

CREATE POLICY "Authorized can add members"
  ON public.chat_channel_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_channels c
      WHERE c.id = chat_channel_members.channel_id
        AND c.created_by = auth.uid()
    )
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Members can view memberships"
  ON public.chat_channel_members FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );
