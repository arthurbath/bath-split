import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { AverageRecordsEditor } from '@/components/AverageRecordsEditor';

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

async function flushUi() {
  await act(async () => {
    await new Promise((resolve) => window.setTimeout(resolve, 0));
  });
}

describe('AverageRecordsEditor', () => {
  it('shows both yearly and monthly averages in yearly mode', () => {
    const { container, root } = mount(
      <AverageRecordsEditor
        valueType="yearly_averaged"
        records={[
          { year: 2024, month: null, amount: 12000 },
          { year: 2025, month: null, amount: 24000 },
        ]}
        onChange={() => {}}
      />,
    );

    try {
      expect(container.textContent).toContain('Yearly average:');
      expect(container.textContent).toContain('$18000.00');
      expect(container.textContent).toContain('Monthly average:');
      expect(container.textContent).toContain('$1500.00');
    } finally {
      unmount(root, container);
    }
  });

  it('uses icon-only add control in records header', () => {
    const { container, root } = mount(
      <AverageRecordsEditor
        valueType="monthly_averaged"
        records={[]}
        onChange={() => {}}
      />,
    );

    try {
      const addButton = container.querySelector('button[aria-label="Add month record"]');
      expect(addButton).toBeTruthy();
      expect(addButton?.textContent?.trim()).toBe('');
    } finally {
      unmount(root, container);
    }
  });

  it('clears the final monthly record to defaults, keeps amount input blank, and refocuses primary input', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-02T12:00:00-08:00'));

    function Harness() {
      const [records, setRecords] = React.useState([{ year: 2024, month: 7, amount: 500 }]);
      return (
        <AverageRecordsEditor
          valueType="monthly_averaged"
          records={records}
          onChange={setRecords}
        />
      );
    }

    const { container, root } = mount(<Harness />);

    try {
      const clearButton = container.querySelector('button[aria-label="Clear month record"]') as HTMLButtonElement | null;
      expect(clearButton).toBeTruthy();
      expect(clearButton?.className).toContain('h-9');
      expect(clearButton?.className).toContain('border-warning');

      act(() => {
        clearButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
      act(() => {
        vi.runAllTimers();
      });

      const amountInput = container.querySelector('input[type="number"]') as HTMLInputElement | null;
      expect(amountInput).toBeTruthy();
      expect(amountInput?.value).toBe('');

      const monthlyPicker = Array.from(container.querySelectorAll('button'))
        .find((button) => button.textContent?.includes('Mar 2026'));
      expect(monthlyPicker).toBeTruthy();
      const active = document.activeElement as HTMLElement | null;
      expect(active?.getAttribute('data-average-record-primary-input')).toBe('true');
      expect(active?.getAttribute('data-average-record-row')).toBe('0');
    } finally {
      unmount(root, container);
      vi.useRealTimers();
    }
  });

  it('does not show per-row year or amount labels', () => {
    const { container, root } = mount(
      <AverageRecordsEditor
        valueType="yearly_averaged"
        records={[
          { year: 2024, month: null, amount: 12000 },
          { year: 2025, month: null, amount: 24000 },
        ]}
        onChange={() => {}}
      />,
    );

    try {
      const labels = Array.from(container.querySelectorAll('label'));
      const yearLabels = labels.filter((label) => label.textContent?.trim() === 'Year');
      const amountLabels = labels.filter((label) => label.textContent?.trim() === 'Amount');
      expect(yearLabels).toHaveLength(0);
      expect(amountLabels).toHaveLength(0);
    } finally {
      unmount(root, container);
    }
  });

  it('prepends new records to the top of the list', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-02T12:00:00-08:00'));

    const onChange = vi.fn();
    const existingRecords = [
      { year: 2024, month: null as null, amount: 1000 },
      { year: 2025, month: null as null, amount: 2000 },
    ];

    const { container, root } = mount(
      <AverageRecordsEditor
        valueType="yearly_averaged"
        records={existingRecords}
        onChange={onChange}
      />,
    );

    try {
      const addButton = container.querySelector('button[aria-label="Add year record"]') as HTMLButtonElement | null;
      expect(addButton).toBeTruthy();

      act(() => {
        addButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });

      expect(onChange).toHaveBeenCalledTimes(1);
      const nextRecords = onChange.mock.calls[0]?.[0] as Array<{ year: number; month: number | null; amount: number }>;
      expect(nextRecords[0]).toEqual({ year: 2026, month: null, amount: 0 });
      expect(nextRecords.slice(1)).toEqual(existingRecords);
    } finally {
      unmount(root, container);
      vi.useRealTimers();
    }
  });

  it('focuses the newly-added row primary picker control', async () => {
    function Harness() {
      const [records, setRecords] = React.useState([{ year: 2025, month: null as null, amount: 100 }]);
      return (
        <AverageRecordsEditor
          valueType="yearly_averaged"
          records={records}
          onChange={setRecords}
        />
      );
    }

    const { container, root } = mount(<Harness />);

    try {
      const addButton = container.querySelector('button[aria-label="Add year record"]') as HTMLButtonElement | null;
      expect(addButton).toBeTruthy();

      act(() => {
        addButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
      await flushUi();

      const active = document.activeElement as HTMLElement | null;
      expect(active?.getAttribute('data-average-record-primary-input')).toBe('true');
      expect(active?.getAttribute('data-average-record-row')).toBe('0');
    } finally {
      unmount(root, container);
    }
  });

  it('pages monthly picker by year and selects month without day granularity', () => {
    const onChange = vi.fn();

    const { container, root } = mount(
      <AverageRecordsEditor
        valueType="monthly_averaged"
        records={[{ year: 2026, month: 3, amount: 100 }]}
        onChange={onChange}
      />,
    );

    try {
      const openPickerButton = Array.from(container.querySelectorAll('button'))
        .find((button) => button.textContent?.includes('Mar 2026'));
      expect(openPickerButton).toBeTruthy();

      act(() => {
        openPickerButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });

      const nextYearButton = document.body.querySelector('button[aria-label="Next year"]');
      expect(nextYearButton).toBeTruthy();

      act(() => {
        nextYearButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });

      const janButton = Array.from(document.body.querySelectorAll('button'))
        .find((button) => button.textContent?.trim() === 'Jan');
      expect(janButton).toBeTruthy();

      act(() => {
        janButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });

      expect(onChange).toHaveBeenCalled();
      const nextRecords = onChange.mock.calls.at(-1)?.[0] as Array<{ year: number; month: number | null; amount: number }>;
      expect(nextRecords[0]).toEqual({ year: 2027, month: 1, amount: 100 });
    } finally {
      unmount(root, container);
    }
  });

  it('focuses the selected month button when monthly picker opens', async () => {
    const { container, root } = mount(
      <AverageRecordsEditor
        valueType="monthly_averaged"
        records={[{ year: 2026, month: 3, amount: 100 }]}
        onChange={() => {}}
      />,
    );

    try {
      const openPickerButton = Array.from(container.querySelectorAll('button'))
        .find((button) => button.textContent?.includes('Mar 2026')) as HTMLButtonElement | undefined;
      expect(openPickerButton).toBeTruthy();

      act(() => {
        openPickerButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
      await flushUi();

      const active = document.activeElement as HTMLElement | null;
      expect(active?.textContent?.trim()).toBe('Mar');
    } finally {
      unmount(root, container);
    }
  });

  it('supports arrow-key navigation and enter/space activation in month picker', async () => {
    const onChange = vi.fn();

    const { container, root } = mount(
      <AverageRecordsEditor
        valueType="monthly_averaged"
        records={[{ year: 2026, month: 3, amount: 100 }]}
        onChange={onChange}
      />,
    );

    try {
      const openPickerButton = Array.from(container.querySelectorAll('button'))
        .find((button) => button.textContent?.includes('Mar 2026')) as HTMLButtonElement | undefined;
      expect(openPickerButton).toBeTruthy();

      act(() => {
        openPickerButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
      await flushUi();

      let active = document.activeElement as HTMLButtonElement | null;
      expect(active?.textContent?.trim()).toBe('Mar');

      act(() => {
        active?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
      });
      active = document.activeElement as HTMLButtonElement | null;
      expect(active?.getAttribute('aria-label')).toBe('Next year');

      act(() => {
        active?.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
      });
      await flushUi();
      expect(document.body.textContent).toContain('2027');

      act(() => {
        active?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      });
      active = document.activeElement as HTMLButtonElement | null;
      expect(active?.textContent?.trim()).toBe('Mar');

      act(() => {
        active?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
      });
      active = document.activeElement as HTMLButtonElement | null;
      expect(active?.textContent?.trim()).toBe('Feb');

      act(() => {
        active?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      });
      await flushUi();

      const nextRecords = onChange.mock.calls.at(-1)?.[0] as Array<{ year: number; month: number | null; amount: number }>;
      expect(nextRecords[0]).toEqual({ year: 2027, month: 2, amount: 100 });
      const triggerButton = container.querySelector('button[data-average-record-primary-input="true"][data-average-record-row="0"]');
      expect(document.activeElement).toBe(triggerButton);
    } finally {
      unmount(root, container);
    }
  });

  it('keeps focus on prev/next controls while paging across the selected year', async () => {
    const { container, root } = mount(
      <AverageRecordsEditor
        valueType="monthly_averaged"
        records={[{ year: 2026, month: 3, amount: 100 }]}
        onChange={() => {}}
      />,
    );

    try {
      const openPickerButton = Array.from(container.querySelectorAll('button'))
        .find((button) => button.textContent?.includes('Mar 2026')) as HTMLButtonElement | undefined;
      expect(openPickerButton).toBeTruthy();

      act(() => {
        openPickerButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
      await flushUi();

      let active = document.activeElement as HTMLButtonElement | null;
      expect(active?.textContent?.trim()).toBe('Mar');

      act(() => {
        active?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
      });
      active = document.activeElement as HTMLButtonElement | null;
      expect(active?.getAttribute('aria-label')).toBe('Next year');

      act(() => {
        active?.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
      });
      await flushUi();
      active = document.activeElement as HTMLButtonElement | null;
      expect(active?.getAttribute('aria-label')).toBe('Next year');
      expect(document.body.textContent).toContain('2027');

      act(() => {
        active?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
      });
      active = document.activeElement as HTMLButtonElement | null;
      expect(active?.getAttribute('aria-label')).toBe('Previous year');

      act(() => {
        active?.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
      });
      await flushUi();
      active = document.activeElement as HTMLButtonElement | null;
      expect(active?.getAttribute('aria-label')).toBe('Previous year');
      expect(document.body.textContent).toContain('2026');
    } finally {
      unmount(root, container);
    }
  });

  it('does not move focus on tab or shift+tab inside month picker controls', async () => {
    const { container, root } = mount(
      <AverageRecordsEditor
        valueType="monthly_averaged"
        records={[{ year: 2026, month: 3, amount: 100 }]}
        onChange={() => {}}
      />,
    );

    try {
      const openPickerButton = Array.from(container.querySelectorAll('button'))
        .find((button) => button.textContent?.includes('Mar 2026')) as HTMLButtonElement | undefined;
      expect(openPickerButton).toBeTruthy();

      act(() => {
        openPickerButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
      await flushUi();

      let active = document.activeElement as HTMLButtonElement | null;
      expect(active?.textContent?.trim()).toBe('Mar');

      act(() => {
        active?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
      });
      expect(document.activeElement).toBe(active);

      act(() => {
        active?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }));
      });
      expect(document.activeElement).toBe(active);
    } finally {
      unmount(root, container);
    }
  });

  it('returns focus to monthpicker trigger after selecting a month with state updates', async () => {
    function Harness() {
      const [records, setRecords] = React.useState([{ year: 2026, month: 3, amount: 100 }]);
      return (
        <AverageRecordsEditor
          valueType="monthly_averaged"
          records={records}
          onChange={setRecords}
        />
      );
    }

    const { container, root } = mount(<Harness />);

    try {
      const openPickerButton = Array.from(container.querySelectorAll('button'))
        .find((button) => button.textContent?.includes('Mar 2026')) as HTMLButtonElement | undefined;
      expect(openPickerButton).toBeTruthy();

      act(() => {
        openPickerButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
      await flushUi();

      let active = document.activeElement as HTMLButtonElement | null;
      expect(active?.textContent?.trim()).toBe('Mar');

      act(() => {
        active?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
      });
      active = document.activeElement as HTMLButtonElement | null;
      expect(active?.textContent?.trim()).toBe('Feb');

      act(() => {
        active?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      });
      await flushUi();

      const trigger = container.querySelector('button[data-average-record-primary-input="true"][data-average-record-row="0"]');
      expect(document.activeElement).toBe(trigger);
      expect((trigger as HTMLButtonElement | null)?.textContent).toContain('Feb 2026');
    } finally {
      unmount(root, container);
    }
  });

  it('focuses the next-highest row primary input after deleting a middle row', async () => {
    function Harness() {
      const [records, setRecords] = React.useState([
        { year: 2026, month: null as null, amount: 300 },
        { year: 2025, month: null as null, amount: 200 },
        { year: 2024, month: null as null, amount: 100 },
      ]);
      return (
        <AverageRecordsEditor
          valueType="yearly_averaged"
          records={records}
          onChange={setRecords}
        />
      );
    }

    const { container, root } = mount(<Harness />);

    try {
      const removeMiddleButton = container.querySelector('button[aria-label="Remove year record 2"]') as HTMLButtonElement | null;
      expect(removeMiddleButton).toBeTruthy();

      act(() => {
        removeMiddleButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
      await flushUi();

      const active = document.activeElement as HTMLElement | null;
      expect(active?.getAttribute('data-average-record-primary-input')).toBe('true');
      expect(active?.getAttribute('data-average-record-row')).toBe('0');
    } finally {
      unmount(root, container);
    }
  });

  it('focuses the next row primary input after deleting the topmost row', async () => {
    function Harness() {
      const [records, setRecords] = React.useState([
        { year: 2026, month: null as null, amount: 300 },
        { year: 2025, month: null as null, amount: 200 },
      ]);
      return (
        <AverageRecordsEditor
          valueType="yearly_averaged"
          records={records}
          onChange={setRecords}
        />
      );
    }

    const { container, root } = mount(<Harness />);

    try {
      const removeTopButton = container.querySelector('button[aria-label="Remove year record 1"]') as HTMLButtonElement | null;
      expect(removeTopButton).toBeTruthy();

      act(() => {
        removeTopButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
      await flushUi();

      const active = document.activeElement as HTMLElement | null;
      expect(active?.getAttribute('data-average-record-primary-input')).toBe('true');
      expect(active?.getAttribute('data-average-record-row')).toBe('0');
    } finally {
      unmount(root, container);
    }
  });

  it('returns focus to yearly record year input after selecting a year', async () => {
    function Harness() {
      const [records, setRecords] = React.useState([{ year: 2026, month: null as null, amount: 100 }]);
      return (
        <AverageRecordsEditor
          valueType="yearly_averaged"
          records={records}
          onChange={setRecords}
        />
      );
    }

    const { container, root } = mount(<Harness />);

    try {
      const yearTrigger = container.querySelector('button[data-average-record-primary-input="true"][data-average-record-row="0"]') as HTMLButtonElement | null;
      expect(yearTrigger).toBeTruthy();

      act(() => {
        yearTrigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });

      const nextYearOption = Array.from(document.body.querySelectorAll('[role="option"]'))
        .find((option) => option.textContent?.trim() === '2027') as HTMLElement | undefined;
      expect(nextYearOption).toBeTruthy();

      act(() => {
        nextYearOption?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
      await flushUi();

      const updatedTrigger = container.querySelector('button[data-average-record-primary-input="true"][data-average-record-row="0"]') as HTMLButtonElement | null;
      expect(updatedTrigger?.textContent).toContain('2027');
      expect(document.activeElement).toBe(updatedTrigger);
    } finally {
      unmount(root, container);
    }
  });

  it('shows blank amount for a single default zero-valued record', () => {
    const { container, root } = mount(
      <AverageRecordsEditor
        valueType="yearly_averaged"
        records={[{ year: 2026, month: null, amount: 0 }]}
        onChange={() => {}}
      />,
    );

    try {
      const amountInput = container.querySelector('input[type="number"]') as HTMLInputElement | null;
      expect(amountInput).toBeTruthy();
      expect(amountInput?.value).toBe('');
    } finally {
      unmount(root, container);
    }
  });
});
