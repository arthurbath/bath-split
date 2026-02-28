import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useHouseholdManagement } from '@/platform/households/useHouseholdManagement';
import { budgetHouseholdAdapter } from '@/platform/households/adapters';

const rpcMock = vi.fn();
const showMutationErrorMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
  },
}));

vi.mock('@/lib/supabaseRequest', () => ({
  supabaseRequest: async (operation: () => Promise<{ data: unknown; error: unknown }>) => {
    const result = await operation();
    if (result.error) throw result.error;
    return result.data;
  },
  showMutationError: (...args: unknown[]) => showMutationErrorMock(...args),
}));

vi.mock('@/lib/mutationTiming', () => ({
  withMutationTiming: async (_meta: unknown, run: () => Promise<unknown>) => await run(),
}));

function HookHarness({ onExited }: { onExited?: () => void }) {
  const management = useHouseholdManagement({
    adapter: budgetHouseholdAdapter,
    householdId: 'hh-1',
    userId: 'user-1',
    enabled: true,
    onExitedHousehold: onExited,
  });

  return (
    <div>
      <div data-testid="members-count">{management.members.length}</div>
      <button type="button" data-testid="leave" onClick={() => { void management.leaveHousehold().catch(() => {}); }}>leave</button>
    </div>
  );
}

function mount(ui: React.ReactElement) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(ui);
  });
  return { container, root };
}

function cleanup(root: Root, container: HTMLElement) {
  act(() => {
    root.unmount();
  });
  container.remove();
}

async function waitForCondition(assertion: () => void, timeoutMs = 1500) {
  const start = Date.now();
  let lastError: unknown;
  while (Date.now() - start < timeoutMs) {
    try {
      assertion();
      return;
    } catch (error) {
      lastError = error;
    }
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 16));
    });
  }
  throw lastError instanceof Error ? lastError : new Error('Condition not met before timeout');
}

describe('useHouseholdManagement', () => {
  beforeEach(() => {
    rpcMock.mockReset();
    showMutationErrorMock.mockReset();
  });

  it('loads household members on mount', async () => {
    rpcMock.mockImplementation(async (fn: string) => {
      if (fn === 'budget_list_household_members') {
        return {
          data: [
            {
              user_id: 'user-1',
              email: 'user@example.com',
              display_name: 'User One',
              created_at: '2026-02-28T00:00:00.000Z',
              is_self: true,
            },
          ],
          error: null,
        };
      }

      return { data: null, error: null };
    });

    const { container, root } = mount(<HookHarness />);
    try {
      await waitForCondition(() => {
        const membersCount = container.querySelector('[data-testid="members-count"]');
        expect(membersCount?.textContent).toBe('1');
      });
    } finally {
      cleanup(root, container);
    }
  });

  it('calls leave RPC and exit callback', async () => {
    const onExited = vi.fn();

    rpcMock.mockImplementation(async (fn: string) => {
      if (fn === 'budget_list_household_members') {
        return { data: [], error: null };
      }
      if (fn === 'budget_leave_household') {
        return { data: { householdId: 'hh-1' }, error: null };
      }
      return { data: null, error: null };
    });

    const { container, root } = mount(<HookHarness onExited={onExited} />);
    try {
      const leaveButton = container.querySelector('[data-testid="leave"]') as HTMLButtonElement | null;
      expect(leaveButton).toBeTruthy();

      await act(async () => {
        leaveButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });

      await waitForCondition(() => {
        expect(rpcMock).toHaveBeenCalledWith('budget_leave_household', { _household_id: 'hh-1' });
        expect(onExited).toHaveBeenCalledTimes(1);
      });
    } finally {
      cleanup(root, container);
    }
  });

  it('surfaces leave failure and does not exit when leave RPC fails', async () => {
    const onExited = vi.fn();

    rpcMock.mockImplementation(async (fn: string) => {
      if (fn === 'budget_list_household_members') {
        return {
          data: [
            {
              user_id: 'user-1',
              email: 'user@example.com',
              display_name: 'User One',
              created_at: '2026-02-28T00:00:00.000Z',
              is_self: true,
            },
          ],
          error: null,
        };
      }
      if (fn === 'budget_leave_household') {
        return { data: null, error: new Error('Cannot leave household as sole member. Delete the household instead.') };
      }
      return { data: null, error: null };
    });

    const { container, root } = mount(<HookHarness onExited={onExited} />);
    try {
      const leaveButton = container.querySelector('[data-testid="leave"]') as HTMLButtonElement | null;
      expect(leaveButton).toBeTruthy();

      await act(async () => {
        leaveButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });

      await waitForCondition(() => {
        expect(rpcMock).toHaveBeenCalledWith('budget_leave_household', { _household_id: 'hh-1' });
        expect(showMutationErrorMock).toHaveBeenCalledTimes(1);
      });

      expect(onExited).not.toHaveBeenCalled();
    } finally {
      cleanup(root, container);
    }
  });
});
