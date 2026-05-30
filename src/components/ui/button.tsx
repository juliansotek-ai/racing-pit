import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "glass";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantClass: Record<Variant, string> = {
  primary:
    "bg-green-800 text-white border border-green-700 hover:bg-green-700 shadow-[0_2px_12px_rgba(27,67,50,0.35)] hover:shadow-[0_4px_20px_rgba(27,67,50,0.45)]",
  secondary:
    "bg-navy-800 text-white border border-navy-700 hover:bg-navy-700 shadow-[0_2px_12px_rgba(15,45,82,0.35)] hover:shadow-[0_4px_20px_rgba(15,45,82,0.45)]",
  ghost:
    "bg-transparent text-[var(--text-secondary)] border border-[var(--gray-200)] hover:bg-[rgba(255,255,255,0.5)] hover:text-[var(--text-primary)]",
  glass:
    "glass text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.8)] active:scale-[0.98]",
};

const sizeClass: Record<Size, string> = {
  sm: "h-8 px-4 text-sm gap-1.5 rounded-[var(--radius-sm)]",
  md: "h-10 px-5 text-sm gap-2   rounded-[var(--radius-md)]",
  lg: "h-12 px-7 text-base gap-2 rounded-[var(--radius-lg)]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center font-medium tracking-tight",
        "transition-all duration-150 cursor-pointer",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
        variantClass[variant],
        sizeClass[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
);

Button.displayName = "Button";
