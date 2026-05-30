import Image from "next/image";
import { cn } from "@/lib/utils";

interface IllustrationSlotProps {
  /** When provided, renders the actual image instead of the placeholder */
  src?: string;
  alt: string;
  /** Human-readable label shown on the placeholder */
  label?: string;
  /** Optional aspect ratio class, e.g. "aspect-video" or "aspect-square" */
  aspectClass?: string;
  className?: string;
  /** Placeholder icon (SVG path data). Defaults to an image icon. */
  iconPath?: string;
}

const defaultIconPath =
  "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z";

export function IllustrationSlot({
  src,
  alt,
  label,
  aspectClass = "aspect-video",
  className,
  iconPath = defaultIconPath,
}: IllustrationSlotProps) {
  if (src) {
    return (
      <div className={cn("relative overflow-hidden rounded-[var(--radius-lg)]", aspectClass, className)}>
        <Image src={src} alt={alt} fill className="object-cover" />
      </div>
    );
  }

  return (
    <div className={cn("illustration-slot", aspectClass, className)}>
      <svg
        width="36"
        height="36"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d={iconPath} />
      </svg>
      {label && <span>{label}</span>}
    </div>
  );
}
