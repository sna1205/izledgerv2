import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_16px_34px_-18px_hsl(var(--primary)/0.72)] hover:bg-primary/94 hover:shadow-[0_20px_40px_-20px_hsl(var(--primary)/0.76)] dark:shadow-[0_18px_38px_-18px_hsl(var(--primary)/0.42)]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-[0_16px_34px_-18px_hsl(var(--destructive)/0.56)] hover:bg-destructive/94 dark:shadow-[0_18px_38px_-18px_hsl(var(--destructive)/0.34)]",
        outline:
          "border border-border/80 bg-background/82 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.03)] hover:border-border hover:bg-accent/75 hover:text-accent-foreground dark:bg-white/[0.03] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] dark:hover:bg-white/[0.06]",
        secondary:
          "bg-secondary/92 text-secondary-foreground shadow-[inset_0_1px_0_hsl(var(--foreground)/0.03)] hover:bg-secondary dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
        ghost: "text-muted-foreground hover:bg-accent/75 hover:text-accent-foreground dark:hover:bg-white/[0.06] dark:hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3.5 text-[13px]",
        lg: "h-11 px-8",
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
