import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GatewayPageLayout from '@/platform/components/GatewayPageLayout';

vi.mock('@/platform/components/GatewayFooter', () => ({
  default: () => <footer data-testid="gateway-footer">Footer</footer>,
}));

function mountLayout(ui: React.ReactNode) {
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

describe('GatewayPageLayout', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 844,
    });
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: undefined,
    });
  });

  it('uses the visual viewport height when available', () => {
    const resizeListeners = new Set<() => void>();
    const scrollListeners = new Set<() => void>();

    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: {
        height: 701,
        addEventListener: (event: string, listener: () => void) => {
          if (event === 'resize') resizeListeners.add(listener);
          if (event === 'scroll') scrollListeners.add(listener);
        },
        removeEventListener: (event: string, listener: () => void) => {
          if (event === 'resize') resizeListeners.delete(listener);
          if (event === 'scroll') scrollListeners.delete(listener);
        },
      },
    });

    const { container, root } = mountLayout(<GatewayPageLayout>Content</GatewayPageLayout>);

    try {
      const shell = container.firstElementChild as HTMLElement | null;
      expect(shell).toBeTruthy();
      expect(shell?.style.minHeight).toBe('701px');
      expect(container.querySelector('[data-testid="gateway-footer"]')).toBeTruthy();
      expect(resizeListeners.size).toBe(1);
      expect(scrollListeners.size).toBe(1);
    } finally {
      unmount(root, container);
    }
  });

  it('falls back to window.innerHeight when visualViewport is unavailable', () => {
    const { container, root } = mountLayout(<GatewayPageLayout showFooter={false}>Content</GatewayPageLayout>);

    try {
      const shell = container.firstElementChild as HTMLElement | null;
      expect(shell).toBeTruthy();
      expect(shell?.style.minHeight).toBe('844px');
      expect(container.querySelector('footer')).toBeNull();
    } finally {
      unmount(root, container);
    }
  });
});
