import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import { IncomesTab } from '@/components/IncomesTab';
import type { Income } from '@/hooks/useIncomes';
import { TooltipProvider } from '@/components/ui/tooltip';

function mount(ui: React.ReactElement) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(ui);
  });
  return { container, root };
}

function unmount(root: Root, container: HTMLElement) {
  act(() => {
    root.unmount();
  });
  container.remove();
}

describe('IncomesTab averaged rows', () => {
  it('shows static averaged frequency and opens the records editor from amount', () => {
    const incomes: Income[] = [
      {
        id: 'income-1',
        household_id: 'h-1',
        name: 'Contract',
        amount: 12000,
        frequency_type: 'annual',
        frequency_param: null,
        partner_label: 'X',
        is_estimate: true,
        value_type: 'yearly_averaged',
        average_records: [{ year: 2025, month: null, amount: 11000 }, { year: 2026, month: null, amount: 13000 }],
      },
    ];

    const { container, root } = mount(
      <TooltipProvider>
        <IncomesTab
          incomes={incomes}
          partnerX="Partner X"
          partnerY="Partner Y"
          onAdd={async () => {}}
          onUpdate={async () => {}}
          onRemove={async () => {}}
        />
      </TooltipProvider>,
    );

    try {
      expect(container.textContent).toContain('Yearly Avg');
      const amountButton = container.querySelector('button[aria-label="Edit averaged records for Contract"]');
      expect(amountButton).toBeTruthy();

      act(() => {
        amountButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
      expect(document.body.textContent).toContain('Edit Yearly Records');
    } finally {
      unmount(root, container);
    }
  });
});
