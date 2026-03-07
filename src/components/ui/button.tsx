import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md border border-transparent text-sm font-medium transition-colors focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/65 focus:ring-offset-0 focus-visible:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/65 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground enabled:hover:bg-primary/90",
        outline: "border border-primary bg-background text-primary enabled:hover:bg-primary/10",
        success: "bg-success text-success-foreground enabled:hover:bg-success/90",
        "outline-success": "border border-success bg-background text-success enabled:hover:bg-success/10",
        destructive: "bg-destructive text-destructive-foreground enabled:hover:bg-destructive/90",
        "outline-destructive": "border border-destructive bg-background text-destructive enabled:hover:bg-destructive/10",
        danger: "bg-destructive text-destructive-foreground enabled:hover:bg-destructive/90",
        "outline-danger": "border border-destructive bg-background text-destructive enabled:hover:bg-destructive/10",
        warning: "bg-warning text-warning-foreground enabled:hover:bg-warning/90",
        "outline-warning": "border border-warning bg-background text-warning enabled:hover:bg-warning/10",
        info: "bg-info text-info-foreground enabled:hover:bg-info/90",
        "outline-info": "border border-info bg-background text-info enabled:hover:bg-info/10",
        admin: "bg-admin text-admin-foreground enabled:hover:bg-admin/90",
        "outline-admin": "border border-admin bg-background text-admin enabled:hover:bg-admin/10",
        secondary: "bg-secondary text-secondary-foreground enabled:hover:bg-secondary/80",
        clear: "border border-transparent bg-transparent text-white enabled:hover:bg-primary/10 enabled:hover:text-primary",
        ghost: "enabled:hover:bg-accent enabled:hover:text-accent-foreground",
        "ghost-destructive": "enabled:hover:bg-destructive/10 enabled:hover:text-destructive",
        link: "text-primary underline-offset-4 enabled:hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
