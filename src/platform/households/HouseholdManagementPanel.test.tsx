import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { HouseholdManagementPanel } from '@/platform/households/HouseholdManagementPanel';
import type { HouseholdMember } from '@/platform/households/types';

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
  useToast: () => ({ toast: vi.fn() }),
}));

function buildMembers(count: number): HouseholdMember[] {
  if (count === 1) {
    return [{
      userId: 'user-1',
      email: 'user@example.com',
      displayName: 'User One',
      createdAt: '2026-02-28T00:00:00.000Z',
      isSelf: true,
    }];
  }

  return [
    {
      userId: 'user-1',
      email: 'user@example.com',
      displayName: 'User One',
      createdAt: '2026-02-28T00:00:00.000Z',
      isSelf: true,
    },
    {
      userId: 'user-2',
      email: 'other@example.com',
      displayName: 'User Two',
      createdAt: '2026-02-28T00:00:01.000Z',
      isSelf: false,
    },
  ];
}

interface MountPanelOverrides {
  onRotateInviteCode?: () => Promise<void>;
  onRemoveMember?: (memberUserId: string) => Promise<void>;
  onLeaveHousehold?: () => Promise<void>;
  onDeleteHousehold?: () => Promise<void>;
}

function mountPanel(members: HouseholdMember[], overrides: MountPanelOverrides = {}) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(
      <HouseholdManagementPanel
        moduleName="Budget"
        inviteCode="abc123def456"
        userEmail="user@example.com"
        members={members}
        membersLoading={false}
        pendingMemberId={null}
        rotatingInviteCode={false}
        leavingHousehold={false}
        deletingHousehold={false}
        onRotateInviteCode={overrides.onRotateInviteCode ?? (async () => {})}
        onRemoveMember={overrides.onRemoveMember ?? (async () => {})}
        onLeaveHousehold={overrides.onLeaveHousehold ?? (async () => {})}
        onDeleteHousehold={overrides.onDeleteHousehold ?? (async () => {})}
      />,
    );
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

function findButtonsByText(label: string, withinNode: ParentNode = document.body): HTMLButtonElement[] {
  return Array.from(withinNode.querySelectorAll('button')).filter((button) => button.textContent?.trim() === label) as HTMLButtonElement[];
}

function setInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function findOpenDialogByText(text: string): HTMLElement | undefined {
  const dialogs = Array.from(document.body.querySelectorAll('[role="alertdialog"], [role="dialog"]')) as HTMLElement[];
  return dialogs.find((dialog) => dialog.textContent?.includes(text));
}

function getRenderedMemberLabels(withinNode: ParentNode = document.body): string[] {
  return Array.from(withinNode.querySelectorAll('p.text-sm.font-medium'))
    .map((node) => node.textContent?.trim() ?? '')
    .filter((label) => label.length > 0);
}

describe('HouseholdManagementPanel', () => {
  it('shows self marker and remove action only for other members', () => {
    const { container, root } = mountPanel(buildMembers(2));
    try {
      expect(document.body.textContent).toContain('User One (You)');
      expect(document.body.textContent).toContain('User Two');
      expect(findButtonsByText('Remove')).toHaveLength(1);
      expect(findButtonsByText('Leave')).toHaveLength(1);
    } finally {
      cleanup(root, container);
    }
  });

  it('hides leave action when the user is the only household member', () => {
    const { container, root } = mountPanel(buildMembers(1));
    try {
      expect(findButtonsByText('Leave')).toHaveLength(0);
      expect(findButtonsByText('Delete Household')).toHaveLength(1);
    } finally {
      cleanup(root, container);
    }
  });

  it('requires matching email before enabling delete household confirmation', async () => {
    const { container, root } = mountPanel(buildMembers(1));
    try {
      const [deleteTrigger] = findButtonsByText('Delete Household');
      expect(deleteTrigger).toBeTruthy();

      await act(async () => {
        deleteTrigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });

      await waitForCondition(() => {
        const dialog = document.body.querySelector('[role="alertdialog"]');
        expect(dialog).toBeTruthy();
      });

      const dialog = document.body.querySelector('[role="alertdialog"]') as HTMLElement;
      const confirmButton = findButtonsByText('Delete Household', dialog)[0];
      const emailInput = dialog.querySelector('input') as HTMLInputElement;

      expect(confirmButton).toBeTruthy();
      expect(emailInput).toBeTruthy();
      expect(confirmButton.disabled).toBe(true);
      expect(emailInput.inputMode).toBe('email');
      expect(emailInput.autocomplete).toBe('off');

      await act(async () => {
        setInputValue(emailInput, 'wrong@example.com');
      });
      expect(findButtonsByText('Delete Household', dialog)[0]?.disabled).toBe(true);

      await act(async () => {
        setInputValue(emailInput, 'user@example.com');
      });
      await waitForCondition(() => {
        expect(findButtonsByText('Delete Household', dialog)[0]?.disabled).toBe(false);
      });
    } finally {
      cleanup(root, container);
    }
  });

  it('opens remove-member confirmation and submits remove action', async () => {
    const onRemoveMember = vi.fn(async () => {});
    const { container, root } = mountPanel(buildMembers(2), { onRemoveMember });
    try {
      const [removeButton] = findButtonsByText('Remove');
      expect(removeButton).toBeTruthy();

      await act(async () => {
        removeButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });

      await waitForCondition(() => {
        const removeDialog = findOpenDialogByText('Remove Member');
        expect(removeDialog).toBeTruthy();
      });

      const removeDialog = findOpenDialogByText('Remove Member') as HTMLElement;
      const [confirmRemoveButton] = findButtonsByText('Remove', removeDialog);
      expect(confirmRemoveButton).toBeTruthy();

      await act(async () => {
        confirmRemoveButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });

      await waitForCondition(() => {
        expect(onRemoveMember).toHaveBeenCalledWith('user-2');
      });
    } finally {
      cleanup(root, container);
    }
  });

  it('opens leave-household confirmation and submits leave action', async () => {
      const onLeaveHousehold = vi.fn(async () => {});
      const { container, root } = mountPanel(buildMembers(2), { onLeaveHousehold });
    try {
      const [leaveTrigger] = findButtonsByText('Leave');
      expect(leaveTrigger).toBeTruthy();

      await act(async () => {
        leaveTrigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });

      await waitForCondition(() => {
        const leaveDialog = findOpenDialogByText('Leave Household');
        expect(leaveDialog).toBeTruthy();
      });

      const leaveDialog = findOpenDialogByText('Leave Household') as HTMLElement;
      const [confirmLeaveButton] = findButtonsByText('Leave', leaveDialog);
      expect(confirmLeaveButton).toBeTruthy();

      await act(async () => {
        confirmLeaveButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });

      await waitForCondition(() => {
        expect(onLeaveHousehold).toHaveBeenCalledTimes(1);
      });
    } finally {
      cleanup(root, container);
    }
  });

  it('orders members alphabetically while keeping the signed-in user first', () => {
    const members: HouseholdMember[] = [
      {
        userId: 'user-3',
        email: 'zoe@example.com',
        displayName: 'Zoe',
        createdAt: '2026-02-28T00:00:02.000Z',
        isSelf: false,
      },
      {
        userId: 'user-2',
        email: 'alex@example.com',
        displayName: 'alex',
        createdAt: '2026-02-28T00:00:01.000Z',
        isSelf: false,
      },
      {
        userId: 'user-1',
        email: 'user@example.com',
        displayName: 'User One',
        createdAt: '2026-02-28T00:00:00.000Z',
        isSelf: true,
      },
    ];
    const { container, root } = mountPanel(members);
    try {
      expect(getRenderedMemberLabels()).toEqual(['User One (You)', 'alex', 'Zoe']);
    } finally {
      cleanup(root, container);
    }
  });
});
