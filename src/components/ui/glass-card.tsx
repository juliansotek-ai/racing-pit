import { type HTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "heavy" | "subtle";

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: Variant;
  radius?: "md" | "lg" | "xl" | "2xl";
  padding?: "sm" | "md" | "lg" | "xl";
}

const variantClass: Record<Variant, string> = {
  default: "glass",
  heavy:   "glass-heavy",
  subtle:  "glass-subtle",
};

const radiusClass = {
  md:  "rounded-[var(--radius-md)]",
  lg:  "rounded-[var(--radius-lg)]",
  xl:  "rounded-[var(--radius-xl)]",
  "2xl": "rounded-[var(--radius-2xl)]",
};

const paddingClass = {
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
  xl: "p-10",
};

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, variant = "default", radius = "xl", padding = "md", children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        variantClass[variant],
        radiusClass[radius],
        paddingClass[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);

GlassCard.displayName = "GlassCard";
