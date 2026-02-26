import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { describe, expect, it } from "vitest";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

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
  throw lastError instanceof Error ? lastError : new Error("Condition not met before timeout");
}

async function dispatchTabOnActiveElement(shiftKey = false) {
  await act(async () => {
    const active = document.activeElement as HTMLElement | null;
    active?.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", shiftKey, bubbles: true }));
  });
}

function AlertDialogNoInputHarness() {
  return (
    <AlertDialog open onOpenChange={() => {}}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete item</AlertDialogTitle>
          <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel data-testid="cancel">Cancel</AlertDialogCancel>
          <AlertDialogAction data-testid="confirm">Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function AlertDialogWithInputHarness() {
  return (
    <AlertDialog open onOpenChange={() => {}}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete item</AlertDialogTitle>
          <AlertDialogDescription>Type DELETE to confirm.</AlertDialogDescription>
        </AlertDialogHeader>
        <Input data-testid="confirm-input" placeholder="Type DELETE" />
        <AlertDialogFooter>
          <AlertDialogCancel data-testid="cancel">Cancel</AlertDialogCancel>
          <AlertDialogAction data-testid="confirm">Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function DialogNoInputHarness() {
  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete item</DialogTitle>
          <DialogDescription>This action cannot be undone.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" data-testid="cancel">Cancel</Button>
          <Button type="button" data-dialog-confirm="true" data-testid="confirm">Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DialogWithSettingsHarness() {
  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete and reassign</DialogTitle>
          <DialogDescription>Choose settings before confirming.</DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-3">
          <Input data-testid="notes-input" placeholder="Optional note" />
          <button type="button" role="combobox" data-testid="target-combobox">
            Reassign target
          </button>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" data-testid="cancel">Cancel</Button>
          <Button type="button" data-dialog-confirm="true" data-testid="confirm">Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

describe("Modal focus conventions", () => {
  it("focuses confirm action when alert dialog has no inputs", async () => {
    const { container, root } = mount(<AlertDialogNoInputHarness />);
    try {
      await waitForCondition(() => {
        const active = document.activeElement as HTMLElement | null;
        expect(active?.getAttribute("data-testid")).toBe("confirm");
      });
    } finally {
      unmount(root, container);
    }
  });

  it("focuses first input when alert dialog contains one", async () => {
    const { container, root } = mount(<AlertDialogWithInputHarness />);
    try {
      await waitForCondition(() => {
        const active = document.activeElement as HTMLElement | null;
        expect(active?.getAttribute("data-testid")).toBe("confirm-input");
      });
    } finally {
      unmount(root, container);
    }
  });

  it("focuses confirm button when dialog has no form controls", async () => {
    const { container, root } = mount(<DialogNoInputHarness />);
    try {
      await waitForCondition(() => {
        const active = document.activeElement as HTMLElement | null;
        expect(active?.getAttribute("data-testid")).toBe("confirm");
      });
    } finally {
      unmount(root, container);
    }
  });

  it("tabs through input, dropdown, cancel, and confirm controls in dialog", async () => {
    const { container, root } = mount(<DialogWithSettingsHarness />);
    try {
      await waitForCondition(() => {
        const active = document.activeElement as HTMLElement | null;
        expect(active?.getAttribute("data-testid")).toBe("notes-input");
      });

      await dispatchTabOnActiveElement();
      await waitForCondition(() => {
        const active = document.activeElement as HTMLElement | null;
        expect(active?.getAttribute("data-testid")).toBe("target-combobox");
      });

      await dispatchTabOnActiveElement();
      await waitForCondition(() => {
        const active = document.activeElement as HTMLElement | null;
        expect(active?.getAttribute("data-testid")).toBe("cancel");
      });

      await dispatchTabOnActiveElement();
      await waitForCondition(() => {
        const active = document.activeElement as HTMLElement | null;
        expect(active?.getAttribute("data-testid")).toBe("confirm");
      });

      await dispatchTabOnActiveElement();
      await waitForCondition(() => {
        const active = document.activeElement as HTMLElement | null;
        expect(active?.getAttribute("data-testid")).toBe("notes-input");
      });
    } finally {
      unmount(root, container);
    }
  });
});
