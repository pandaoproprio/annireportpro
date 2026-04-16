import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

describe('cn (classname merge)', () => {
  it('merges simple classes', () => {
    expect(cn('px-2', 'py-1')).toBe('px-2 py-1');
  });

  it('handles conflicting tailwind classes', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });

  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', 'visible')).toBe('base visible');
  });

  it('handles undefined and null', () => {
    expect(cn('base', undefined, null, 'end')).toBe('base end');
  });

  it('handles empty input', () => {
    expect(cn()).toBe('');
  });
});
