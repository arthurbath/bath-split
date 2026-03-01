import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import GarageIndex from '@/modules/garage/GarageIndex';

const mockAuth = vi.fn();

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockAuth(),
}));

vi.mock('@/platform/components/AuthPage', () => ({
  default: () => <div data-testid="auth-page" />,
}));

vi.mock('@/modules/garage/components/GarageShell', () => ({
  GarageShell: () => <div data-testid="garage-shell" />,
}));

function renderComponent() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(
      <MemoryRouter initialEntries={['/garage/due']}>
        <Routes>
          <Route path="/garage/due" element={<GarageIndex />} />
        </Routes>
      </MemoryRouter>,
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

describe('GarageIndex access', () => {
  it('shows garage shell for signed-in users', () => {
    mockAuth.mockReturnValue({
      user: { id: 'user-1' },
      loading: false,
      signOut: vi.fn(),
      isSigningOut: false,
    });

    const { container, root } = renderComponent();
    try {
      expect(container.querySelector('[data-testid="garage-shell"]')).toBeTruthy();
    } finally {
      cleanup(root, container);
    }
  });

  it('shows auth page for signed-out users', () => {
    mockAuth.mockReturnValue({
      user: null,
      loading: false,
      signOut: vi.fn(),
      isSigningOut: false,
    });

    const { container, root } = renderComponent();
    try {
      expect(container.querySelector('[data-testid="auth-page"]')).toBeTruthy();
    } finally {
      cleanup(root, container);
    }
  });

  it('keeps loading when auth is unresolved', () => {
    mockAuth.mockReturnValue({
      user: { id: 'user-1' },
      loading: true,
      signOut: vi.fn(),
      isSigningOut: false,
    });

    const { container, root } = renderComponent();
    try {
      expect(container.querySelector('[role="status"]')).toBeTruthy();
      expect(container.querySelector('[data-testid="garage-shell"]')).toBeNull();
    } finally {
      cleanup(root, container);
    }
  });
});
