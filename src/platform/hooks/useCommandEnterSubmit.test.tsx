import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { describe, expect, it } from "vitest";

import { useCommandEnterSubmit } from "@/platform/hooks/useCommandEnterSubmit";

function mount(ui: React.ReactElement) {
  const container = document.createElement("div");
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

async function dispatchCommandEnter(target: HTMLElement) {
  await act(async () => {
    target.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", metaKey: true, bubbles: true }));
  });
}

function GlobalShortcutHarness({ children }: { children: React.ReactNode }) {
  useCommandEnterSubmit();
  return <>{children}</>;
}

function FormHarness() {
  const [submitCount, setSubmitCount] = React.useState(0);

  return (
    <GlobalShortcutHarness>
      <div data-testid="submit-count">{String(submitCount)}</div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setSubmitCount((count) => count + 1);
        }}
      >
        <input data-testid="form-input" />
      </form>
    </GlobalShortcutHarness>
  );
}

function ScopeHarness() {
  const [confirmCount, setConfirmCount] = React.useState(0);

  return (
    <GlobalShortcutHarness>
      <div data-testid="confirm-count">{String(confirmCount)}</div>
      <section data-command-enter-scope="true">
        <input data-testid="scoped-input" />
        <button
          type="button"
          data-command-enter-confirm="true"
          onClick={() => setConfirmCount((count) => count + 1)}
        >
          Save
        </button>
      </section>
    </GlobalShortcutHarness>
  );
}

function ModalBypassHarness() {
  const [confirmCount, setConfirmCount] = React.useState(0);

  return (
    <GlobalShortcutHarness>
      <div data-testid="confirm-count">{String(confirmCount)}</div>
      <section data-command-enter-scope="true" role="dialog">
        <input data-testid="modal-input" />
        <button
          type="button"
          data-command-enter-confirm="true"
          onClick={() => setConfirmCount((count) => count + 1)}
        >
          Save
        </button>
      </section>
    </GlobalShortcutHarness>
  );
}

describe("useCommandEnterSubmit", () => {
  it("submits focused in-page forms on command enter", async () => {
    const { container, root } = mount(<FormHarness />);
    try {
      const input = container.querySelector<HTMLElement>('[data-testid="form-input"]');
      expect(input).not.toBeNull();
      input?.focus();
      await dispatchCommandEnter(input!);
      expect(container.querySelector('[data-testid="submit-count"]')?.textContent).toBe("1");
    } finally {
      unmount(root, container);
    }
  });

  it("triggers scoped page confirm actions when no form is present", async () => {
    const { container, root } = mount(<ScopeHarness />);
    try {
      const input = container.querySelector<HTMLElement>('[data-testid="scoped-input"]');
      expect(input).not.toBeNull();
      input?.focus();
      await dispatchCommandEnter(input!);
      expect(container.querySelector('[data-testid="confirm-count"]')?.textContent).toBe("1");
    } finally {
      unmount(root, container);
    }
  });

  it("does not interfere with modal-scoped command enter handling", async () => {
    const { container, root } = mount(<ModalBypassHarness />);
    try {
      const input = container.querySelector<HTMLElement>('[data-testid="modal-input"]');
      expect(input).not.toBeNull();
      input?.focus();
      await dispatchCommandEnter(input!);
      expect(container.querySelector('[data-testid="confirm-count"]')?.textContent).toBe("0");
    } finally {
      unmount(root, container);
    }
  });
});
