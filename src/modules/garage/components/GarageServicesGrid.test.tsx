import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import { GarageServicesGrid } from '@/modules/garage/components/GarageServicesGrid';
import type { GarageService, GarageServicingWithRelations } from '@/modules/garage/types/garage';

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

async function waitForCondition(assertion: () => void, timeoutMs = 500) {
  const start = Date.now();
  let lastError: unknown;
  while (Date.now() - start <= timeoutMs) {
    try {
      assertion();
      return;
    } catch (error: unknown) {
      lastError = error;
    }
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 16));
    });
  }
  throw lastError instanceof Error ? lastError : new Error('Condition not met before timeout');
}

function makeRect({
  top,
  left,
  width,
  height,
}: {
  top: number;
  left: number;
  width: number;
  height: number;
}): DOMRect {
  return {
    x: left,
    y: top,
    top,
    left,
    width,
    height,
    right: left + width,
    bottom: top + height,
    toJSON: () => ({}),
  } as DOMRect;
}

function mockElementRect(element: Element, rect: DOMRect) {
  const original = element.getBoundingClientRect.bind(element);
  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: () => rect,
  });
  return () => {
    Object.defineProperty(element, 'getBoundingClientRect', {
      configurable: true,
      value: original,
    });
  };
}

describe('GarageServicesGrid focus scrolling', () => {
  it('keeps a focused notes cell fully visible in full-view grouped mode', async () => {
    localStorage.setItem('garage_services_groupBy', 'type');
    localStorage.setItem('garage_services_cadenceFilter', 'all');

    const services: GarageService[] = [
      {
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
        notes: 'Use synthetic',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
    ];
    const servicings: GarageServicingWithRelations[] = [];

    const { container, root } = mount(
      <GarageServicesGrid
        userId=""
        services={services}
        servicings={servicings}
        loading={false}
        vehicleName="Test Car"
        fullView
        onAddService={async () => services[0]!}
        onUpdateService={async () => {}}
        onDeleteService={async () => {}}
      />,
    );
    const restoreRects: Array<() => void> = [];

    try {
      const gridContainer = container.querySelector<HTMLDivElement>('div.overflow-auto');
      const header = container.querySelector<HTMLElement>('thead.sticky');
      const groupRow = container.querySelector<HTMLElement>('tbody tr.sticky');
      const groupHeaderCell = groupRow?.querySelector<HTMLElement>('td.sticky');
      const stickyFirstCell = container.querySelector<HTMLElement>('tbody tr:not(.sticky) td.sticky');
      const targetInput = container.querySelector<HTMLInputElement>('input[data-col="6"]');

      expect(gridContainer).not.toBeNull();
      expect(header).not.toBeNull();
      expect(groupRow).not.toBeNull();
      expect(groupHeaderCell).not.toBeNull();
      expect(stickyFirstCell).not.toBeNull();
      expect(targetInput).not.toBeNull();

      restoreRects.push(mockElementRect(gridContainer!, makeRect({ top: 0, left: 0, width: 220, height: 200 })));
      restoreRects.push(mockElementRect(header!, makeRect({ top: 0, left: 0, width: 220, height: 36 })));
      restoreRects.push(mockElementRect(groupRow!, makeRect({ top: 36, left: 0, width: 220, height: 28 })));
      restoreRects.push(mockElementRect(groupHeaderCell!, makeRect({ top: 36, left: 0, width: 80, height: 28 })));
      restoreRects.push(mockElementRect(stickyFirstCell!, makeRect({ top: 60, left: 0, width: 80, height: 28 })));
      restoreRects.push(mockElementRect(targetInput!, makeRect({ top: 60, left: 70, width: 90, height: 28 })));

      gridContainer!.scrollTop = 50;
      gridContainer!.scrollLeft = 30;

      await act(async () => {
        targetInput!.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      });

      await waitForCondition(() => {
        expect(gridContainer!.scrollTop).toBe(46);
        expect(gridContainer!.scrollLeft).toBe(20);
      });
    } finally {
      localStorage.removeItem('garage_services_groupBy');
      localStorage.removeItem('garage_services_cadenceFilter');
      while (restoreRects.length > 0) restoreRects.pop()?.();
      unmount(root, container);
    }
  });
});
