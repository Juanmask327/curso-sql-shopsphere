import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  // Base styles — todos los botones de ShopSphere
  [
    "inline-flex items-center justify-center gap-2",
    "font-semibold text-sm rounded-md",
    "transition-all duration-150",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
    "select-none",
  ].join(" "),
  {
    variants: {
      variant: {
        // Primario — naranja ShopSphere, acción principal
        primary: [
          "bg-primary-500 text-white shadow-sm",
          "hover:bg-primary-600 hover:shadow-primary",
          "active:bg-primary-700 active:scale-[0.98]",
        ].join(" "),

        // Secundario — outline con color de marca
        secondary: [
          "bg-white text-primary-600 border border-primary-300 shadow-sm",
          "hover:bg-primary-50 hover:border-primary-400",
          "active:bg-primary-100 active:scale-[0.98]",
        ].join(" "),

        // Ghost — sin borde, fondo sutil en hover
        ghost: [
          "text-neutral-600 bg-transparent",
          "hover:bg-neutral-100 hover:text-neutral-900",
          "active:bg-neutral-200 active:scale-[0.98]",
        ].join(" "),

        // Destructive — para acciones de reset/borrar
        destructive: [
          "bg-error-500 text-white shadow-sm",
          "hover:bg-rose-600",
          "active:bg-rose-700 active:scale-[0.98]",
        ].join(" "),

        // Success — confirmación
        success: [
          "bg-accent-600 text-white shadow-sm",
          "hover:bg-emerald-700",
          "active:bg-emerald-800 active:scale-[0.98]",
        ].join(" "),

        // Outline neutral — para acciones secundarias sin énfasis de marca
        outline: [
          "bg-white text-neutral-700 border border-neutral-300 shadow-xs",
          "hover:bg-neutral-50 hover:border-neutral-400",
          "active:bg-neutral-100 active:scale-[0.98]",
        ].join(" "),

        // Link — sin caja, solo texto
        link: [
          "text-primary-600 underline-offset-4",
          "hover:underline hover:text-primary-700",
          "h-auto p-0",
        ].join(" "),
      },
      size: {
        xs: "h-7 px-2.5 text-xs rounded",
        sm: "h-8 px-3 text-sm",
        md: "h-10 px-4 text-sm",
        lg: "h-11 px-5 text-base",
        xl: "h-12 px-6 text-base",
        icon: "h-9 w-9 p-0",
        "icon-sm": "h-7 w-7 p-0 rounded",
        "icon-lg": "h-11 w-11 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {asChild ? (
          children
        ) : (
          <>
            {loading && (
              <svg
                className="animate-spin h-4 w-4 shrink-0"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            )}
            {children}
          </>
        )}
      </Comp>
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };
