import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GatewayFooter from '@/platform/components/GatewayFooter';

vi.mock('@/platform/components/TermsDocument', () => ({
  TermsDocument: () => <div>Terms document</div>,
}));

function mountFooter() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(
      <MemoryRouter>
        <GatewayFooter />
      </MemoryRouter>,
    );
  });

  return { container, root };
}

function unmount(root: Root, container: HTMLElement) {
  act(() => {
    root.unmount();
  });
  container.remove();
}

describe('GatewayFooter', () => {
  beforeEach(() => {
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    });
  });

  it('uses the standard footer spacing', () => {
    const { container, root } = mountFooter();

    try {
      const footer = container.querySelector('footer');
      expect(footer).toBeTruthy();
      expect(footer?.style.getPropertyValue('--gateway-footer-bottom-space')).toBe('1rem');
    } finally {
      unmount(root, container);
    }
  });
});
