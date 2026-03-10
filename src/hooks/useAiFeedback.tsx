import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type FeedbackType = 'accepted' | 'rejected' | 'edited';

export interface AiFeedbackInput {
  entityType: string;
  entityId: string;
  aiModel?: string;
  aiOutput: string;
  feedback: FeedbackType;
  userCorrection?: string;
  metadata?: Record<string, any>;
}

export function useAiFeedback() {
  const { user } = useAuth();

  const submitFeedback = useMutation({
    mutationFn: async (input: AiFeedbackInput) => {
      const { error } = await supabase.from('ai_feedback' as any).insert({
        user_id: user!.id,
        entity_type: input.entityType,
        entity_id: input.entityId,
        ai_model: input.aiModel || null,
        ai_output: input.aiOutput,
        feedback: input.feedback,
        user_correction: input.userCorrection || null,
        metadata: input.metadata || null,
      } as any);
      if (error) throw error;
    },
  });

  return { submitFeedback };
}
