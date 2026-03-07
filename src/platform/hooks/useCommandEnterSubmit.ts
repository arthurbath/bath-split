import { useEffect } from "react";

const FORM_SELECTOR = "form";
const MODAL_SELECTOR = '[role="dialog"], [role="alertdialog"]';
const COMMAND_SCOPE_SELECTOR = '[data-command-enter-scope="true"]';
const COMMAND_CONFIRM_SELECTOR = '[data-command-enter-confirm="true"]';

const isCommandEnter = (event: KeyboardEvent) =>
  event.key === "Enter" && event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey && !event.isComposing;

const isActionableElement = (element: HTMLElement) => {
  if ("disabled" in element && typeof element.disabled === "boolean" && element.disabled) return false;
  if (element.getAttribute("aria-disabled") === "true") return false;
  return true;
};

export function useCommandEnterSubmit() {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isCommandEnter(event)) return;

      const target = event.target instanceof HTMLElement ? event.target : null;
      if (!target) return;
      if (target.closest(MODAL_SELECTOR)) return;

      const form = target.closest<HTMLFormElement>(FORM_SELECTOR);
      if (form) {
        event.preventDefault();
        form.requestSubmit();
        return;
      }

      const scope = target.closest<HTMLElement>(COMMAND_SCOPE_SELECTOR);
      if (!scope) return;

      const confirmAction = scope.querySelector<HTMLElement>(COMMAND_CONFIRM_SELECTOR);
      if (!confirmAction || !isActionableElement(confirmAction)) return;

      event.preventDefault();
      confirmAction.click();
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, []);
}
