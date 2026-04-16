import { describe, it, expect } from 'vitest';

/**
 * Tests for diaryEditRules business logic
 */
import { canEditActivity, canDeleteActivity, getEditBlockReason, getDeleteBlockReason } from '@/lib/diaryEditRules';

describe('diaryEditRules', () => {
  const baseActivity = {
    date: new Date().toISOString().split('T')[0],
    is_draft: false,
    user_id: 'user-1',
    created_at: new Date().toISOString(),
  };

  describe('canEditActivity', () => {
    it('allows editing own draft', () => {
      expect(canEditActivity({ ...baseActivity, is_draft: true }, 'user-1', 'usuario', false)).toBe(true);
    });

    it('allows admin to edit any activity', () => {
      expect(canEditActivity(baseActivity, 'user-2', 'admin', true)).toBe(true);
    });
  });

  describe('canDeleteActivity', () => {
    it('allows admin to delete', () => {
      expect(canDeleteActivity(baseActivity, 'user-2', 'admin', true)).toBe(true);
    });
  });

  describe('getEditBlockReason', () => {
    it('returns null when edit is allowed', () => {
      expect(getEditBlockReason({ ...baseActivity, is_draft: true }, 'user-1', 'usuario', false)).toBeNull();
    });
  });

  describe('getDeleteBlockReason', () => {
    it('returns null when delete is allowed by admin', () => {
      expect(getDeleteBlockReason(baseActivity, 'user-1', 'admin', true)).toBeNull();
    });
  });
});
