import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock useAppData
vi.mock('@/contexts/AppDataContext', () => ({
  useAppData: vi.fn(),
}));

import { useAppData } from '@/contexts/AppDataContext';
import { PendingActivitiesBanner } from '@/components/PendingActivitiesBanner';

const mockUseAppData = vi.mocked(useAppData);

describe('PendingActivitiesBanner', () => {
  it('shows message when no activities exist', () => {
    mockUseAppData.mockReturnValue({
      activities: [],
    } as any);
    render(<PendingActivitiesBanner />);
    expect(screen.getByText(/ainda não registrou/)).toBeInTheDocument();
  });

  it('shows reminder when last activity was 10 days ago', () => {
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
    mockUseAppData.mockReturnValue({
      activities: [{ id: '1', date: tenDaysAgo.toISOString().split('T')[0] }],
    } as any);
    render(<PendingActivitiesBanner />);
    expect(screen.getByText(/10 dias/)).toBeInTheDocument();
  });

  it('hides when recent activity exists', () => {
    const today = new Date().toISOString().split('T')[0];
    mockUseAppData.mockReturnValue({
      activities: [{ id: '1', date: today }],
    } as any);
    const { container } = render(<PendingActivitiesBanner />);
    expect(container.firstChild).toBeNull();
  });
});
