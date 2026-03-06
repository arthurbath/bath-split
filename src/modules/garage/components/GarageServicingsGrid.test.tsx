import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GarageServicingsGrid } from '@/modules/garage/components/GarageServicingsGrid';
import type { GarageService, GarageServicingWithRelations } from '@/modules/garage/types/garage';

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/components/ui/data-grid', () => ({
  DataGrid: () => <div data-testid="garage-servicings-grid" />,
  GridEditableCell: () => null,
  gridMenuTriggerProps: () => ({}),
  gridNavProps: () => ({}),
  useDataGrid: () => null,
}));

if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
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

function unmount(root: Root, container: HTMLElement) {
  act(() => {
    root.unmount();
  });
  container.remove();
}

async function waitForCondition(assertion: () => void, timeoutMs = 1000) {
  const start = Date.now();
  let lastError: unknown;
  while (Date.now() - start <= timeoutMs) {
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

async function flushUi() {
  await act(async () => {
    await new Promise((resolve) => window.setTimeout(resolve, 0));
  });
}

function click(node: HTMLElement) {
  act(() => {
    node.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

async function clickAsync(node: HTMLElement) {
  await act(async () => {
    node.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await Promise.resolve();
  });
}

function setFileInputFiles(input: HTMLInputElement, files: File[]) {
  Object.defineProperty(input, 'files', {
    configurable: true,
    value: files,
  });

  act(() => {
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

function buildProps(overrides: Partial<React.ComponentProps<typeof GarageServicingsGrid>> = {}): React.ComponentProps<typeof GarageServicingsGrid> {
  const services: GarageService[] = [{
    id: 'service-1',
    user_id: 'user-1',
    vehicle_id: 'vehicle-1',
    name: 'Oil Change',
    type: 'replacement',
    monitoring: true,
    cadence_type: 'recurring',
    every_miles: 5000,
    every_months: 6,
    sort_order: 0,
    notes: null,
    created_at: '2026-03-01T00:00:00.000Z',
    updated_at: '2026-03-01T00:00:00.000Z',
  }];

  const servicings: GarageServicingWithRelations[] = [];

  return {
    userId: '',
    currentVehicleId: 'vehicle-1',
    services,
    servicings,
    loading: false,
    currentVehicleMileage: 123456,
    vehicleName: 'Test Car',
    onAddServicing: async () => {},
    onUpdateServicing: async () => {},
    onDeleteServicing: async () => {},
    onOpenReceipt: async () => {},
    onAddService: async () => services[0]!,
    ...overrides,
  };
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('GarageServicingsGrid servicing dialog', () => {
  it('renders Notes after Receipts in the add servicing dialog', async () => {
    const { container, root } = mount(<GarageServicingsGrid {...buildProps()} />);

    try {
      const addButton = document.body.querySelector('button[aria-label="Add servicing"]') as HTMLButtonElement | null;
      expect(addButton).toBeTruthy();

      click(addButton!);

      await waitForCondition(() => {
        expect(document.body.querySelector('[role="dialog"]')).toBeTruthy();
      });

      const dialog = document.body.querySelector('[role="dialog"]') as HTMLElement;
      const labels = Array.from(dialog.querySelectorAll('label')).map((label) => label.textContent?.trim() ?? '');
      const mileageInput = dialog.querySelector('#garage-servicing-mileage') as HTMLInputElement | null;

      expect(labels).toEqual(['Date', 'Mileage', 'Shop', 'Service Outcomes', 'Receipts', 'Notes']);
      expect(mileageInput?.inputMode).toBe('decimal');
    } finally {
      unmount(root, container);
    }
  });

  it('lists pending receipt files and lets the user remove them before saving', async () => {
    const onAddServicing = vi.fn(async () => {});
    const { container, root } = mount(
      <GarageServicingsGrid
        {...buildProps({ onAddServicing })}
      />,
    );

    try {
      const addButton = document.body.querySelector('button[aria-label="Add servicing"]') as HTMLButtonElement | null;
      expect(addButton).toBeTruthy();
      click(addButton!);

      await waitForCondition(() => {
        expect(document.body.querySelector('[role="dialog"]')).toBeTruthy();
      });

      const receiptInput = document.body.querySelector('#garage-servicing-receipts') as HTMLInputElement | null;
      expect(receiptInput).toBeTruthy();

      const fileA = new File(['alpha'], 'invoice-a.pdf', { type: 'application/pdf' });
      const fileB = new File(['beta'], 'invoice-b.jpg', { type: 'image/jpeg' });
      setFileInputFiles(receiptInput!, [fileA, fileB]);

      await waitForCondition(() => {
        expect(document.body.textContent).toContain('invoice-a.pdf');
        expect(document.body.textContent).toContain('invoice-b.jpg');
      });
      expect(document.body.textContent).not.toContain('pending upload');

      const removeButton = document.body.querySelector('button[aria-label="Remove invoice-a.pdf"]') as HTMLButtonElement | null;
      expect(removeButton).toBeTruthy();
      click(removeButton!);

      await waitForCondition(() => {
        expect(document.body.textContent).not.toContain('invoice-a.pdf');
        expect(document.body.textContent).toContain('invoice-b.jpg');
      });

      const saveButton = Array.from(document.body.querySelectorAll('button')).find((button) => button.textContent?.trim() === 'Save') as HTMLButtonElement | undefined;
      expect(saveButton).toBeTruthy();
      await clickAsync(saveButton!);

      await waitForCondition(() => {
        expect(onAddServicing).toHaveBeenCalledTimes(1);
      });

      expect(onAddServicing.mock.calls[0]?.[0].receipt_files).toEqual([fileB]);
    } finally {
      unmount(root, container);
    }
  });

  it('keeps the selected date when the user chooses the same day again', async () => {
    const { container, root } = mount(<GarageServicingsGrid {...buildProps()} />);

    try {
      const addButton = document.body.querySelector('button[aria-label="Add servicing"]') as HTMLButtonElement | null;
      expect(addButton).toBeTruthy();
      click(addButton!);

      await waitForCondition(() => {
        expect(document.body.querySelector('[role="dialog"]')).toBeTruthy();
      });

      const dateButton = document.body.querySelector('#garage-servicing-date') as HTMLButtonElement | null;
      expect(dateButton).toBeTruthy();
      const initialLabel = dateButton!.textContent?.trim();
      expect(initialLabel).toBeTruthy();
      expect(initialLabel).not.toContain('Pick a date');

      click(dateButton!);
      await flushUi();

      const selectedDay = Array.from(document.body.querySelectorAll('button[name="day"]')).find((button) => button.getAttribute('aria-selected') === 'true') as HTMLButtonElement | undefined;
      expect(selectedDay).toBeTruthy();

      click(selectedDay!);

      await waitForCondition(() => {
        expect((document.body.querySelector('#garage-servicing-date') as HTMLButtonElement | null)?.textContent?.trim()).toBe(initialLabel);
      });
    } finally {
      unmount(root, container);
    }
  });
});
