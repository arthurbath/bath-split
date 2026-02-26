import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, onCheckedChange, onMouseDown, ...props }, forwardedRef) => {
  const innerRef = React.useRef<React.ElementRef<typeof CheckboxPrimitive.Root>>(null);

  const setRef = (node: React.ElementRef<typeof CheckboxPrimitive.Root> | null) => {
    innerRef.current = node;
    if (typeof forwardedRef === "function") {
      forwardedRef(node);
    } else if (forwardedRef) {
      forwardedRef.current = node;
    }
  };

  const focusSelf = () => {
    requestAnimationFrame(() => {
      innerRef.current?.focus();
    });
  };

  return (
    <CheckboxPrimitive.Root
      ref={setRef}
      className={cn(
        "peer inline-flex h-4 w-4 shrink-0 items-center justify-center align-middle rounded-sm border border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/65 focus:ring-offset-1 focus:ring-offset-black focus-visible:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/65 focus-visible:ring-offset-1 focus-visible:ring-offset-black disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      onMouseDown={(event) => {
        onMouseDown?.(event);
        if (!event.defaultPrevented) {
          focusSelf();
        }
      }}
      onCheckedChange={(checked) => {
        onCheckedChange?.(checked);
        focusSelf();
      }}
      {...props}
    >
      <CheckboxPrimitive.Indicator className={cn("flex items-center justify-center text-current")}>
        <Check className="h-4 w-4" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
});
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
