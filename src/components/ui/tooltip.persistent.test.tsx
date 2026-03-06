import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { PersistentTooltipText, TOOLTIP_HOVER_DELAY_MS, TooltipProvider } from '@/components/ui/tooltip';

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

function tooltipText() {
  return document.body.querySelector('[role="tooltip"]')?.textContent ?? '';
}

function tooltipContentElement() {
  return document.body.querySelector('[data-side][data-align]') as HTMLElement | null;
}

async function flushUi() {
  await act(async () => {
    await Promise.resolve();
  });
}

describe('PersistentTooltipText', () => {
  it('opens on hover and closes on mouse leave', async () => {
    vi.useFakeTimers();
    const { container, root } = mount(
      <TooltipProvider>
        <PersistentTooltipText content="Help text">Monthly Settlement</PersistentTooltipText>
        <button type="button">Outside</button>
      </TooltipProvider>,
    );
    const trigger = container.querySelector('span[role="button"]');
    expect(trigger).toBeTruthy();

    try {
      act(() => {
        trigger?.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      });
      await flushUi();
      expect(tooltipText()).toBe('');

      act(() => {
        vi.advanceTimersByTime(TOOLTIP_HOVER_DELAY_MS - 1);
      });
      await flushUi();
      expect(tooltipText()).toBe('');

      act(() => {
        vi.advanceTimersByTime(1);
      });
      await flushUi();
      expect(tooltipText()).toContain('Help text');

      act(() => {
        trigger?.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }));
      });
      await flushUi();
      expect(tooltipText()).toBe('');
    } finally {
      unmount(root, container);
      vi.useRealTimers();
    }
  });

  it('remains open on repeated clicks and closes on outside click', async () => {
    const { container, root } = mount(
      <TooltipProvider>
        <PersistentTooltipText content="Help text">Monthly Settlement</PersistentTooltipText>
        <button type="button">Outside</button>
      </TooltipProvider>,
    );
    const trigger = container.querySelector('span[role="button"]');
    const outsideButton = container.querySelector('button');
    expect(trigger).toBeTruthy();
    expect(outsideButton).toBeTruthy();

    try {
      act(() => {
        trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
      await flushUi();
      expect(tooltipText()).toContain('Help text');

      act(() => {
        trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
      await flushUi();
      expect(tooltipText()).toContain('Help text');

      act(() => {
        outsideButton?.dispatchEvent(new Event('pointerdown', { bubbles: true }));
      });
      await flushUi();
      expect(tooltipText()).toBe('');
    } finally {
      unmount(root, container);
    }
  });

  it('applies viewport-aware width clamping to tooltip content', async () => {
    vi.useFakeTimers();
    const { container, root } = mount(
      <TooltipProvider>
        <PersistentTooltipText content="A somewhat longer help message">Monthly Settlement</PersistentTooltipText>
      </TooltipProvider>,
    );
    const trigger = container.querySelector('span[role="button"]');
    expect(trigger).toBeTruthy();

    try {
      act(() => {
        trigger?.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      });
      act(() => {
        vi.advanceTimersByTime(TOOLTIP_HOVER_DELAY_MS);
      });
      await flushUi();
      const tooltipContent = tooltipContentElement();
      expect(tooltipContent).toBeTruthy();
      expect(tooltipContent?.style.maxWidth).toContain('100vw');
      expect(tooltipContent?.style.maxWidth).toContain('1rem');
    } finally {
      unmount(root, container);
      vi.useRealTimers();
    }
  });
});
