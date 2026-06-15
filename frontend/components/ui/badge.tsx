import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded font-medium transition-colors",
  {
    variants: {
      variant: {
        primary: "bg-primary-100 text-primary-700 border border-primary-200",
        secondary: "bg-secondary-100 text-secondary-700 border border-secondary-200",
        success: "bg-emerald-100 text-emerald-700 border border-emerald-200",
        error: "bg-rose-100 text-rose-700 border border-rose-200",
        warning: "bg-amber-100 text-amber-700 border border-amber-200",
        neutral: "bg-neutral-100 text-neutral-600 border border-neutral-200",
        ghost: "bg-transparent text-neutral-500 border border-neutral-200",
        // SQL type badges — usados en ResultsTable headers
        "type-text": "bg-sky-50 text-sky-700 border border-sky-200 font-mono",
        "type-number": "bg-violet-50 text-violet-700 border border-violet-200 font-mono",
        "type-date": "bg-amber-50 text-amber-700 border border-amber-200 font-mono",
        "type-bool": "bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono",
        "type-null": "bg-neutral-100 text-neutral-500 border border-neutral-200 font-mono",
        "type-unknown": "bg-neutral-50 text-neutral-400 border border-neutral-200 font-mono",
      },
      size: {
        xs: "px-1.5 py-0 text-2xs h-4",
        sm: "px-2 py-0.5 text-xs h-5",
        md: "px-2.5 py-0.5 text-xs h-6",
        lg: "px-3 py-1 text-sm h-7",
      },
    },
    defaultVariants: {
      variant: "neutral",
      size: "sm",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, size }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
