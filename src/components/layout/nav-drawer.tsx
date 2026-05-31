"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/dashboard",  label: "Dashboard",  icon: GridIcon },
  { href: "/search",     label: "Search",      icon: SearchIcon },
  { href: "/races",      label: "Races",       icon: FlagIcon },
  { href: "/favorites",  label: "Favourites",  icon: HeartIcon },
  { href: "/horses",     label: "Horses",      icon: HorseIcon },
  { href: "/jockeys",    label: "Jockeys",     icon: UserIcon },
  { href: "/trainers",   label: "Trainers",    icon: ClipboardIcon },
  { href: "/dashboard/bets", label: "My Bets", icon: TicketIcon },
  { href: "/dashboard/bets/today", label: "Race Day", icon: RaceDayIcon },
];

interface NavDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function NavDrawer({ open, onClose }: NavDrawerProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 transition-opacity duration-300",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        style={{ background: "rgba(10,22,18,0.35)", backdropFilter: "blur(2px)" }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        className={cn(
          "fixed left-0 top-0 h-full z-50 w-72 glass-heavy flex flex-col",
          "transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ borderRight: "1px solid var(--glass-border)" }}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
      >
        {/* Drawer header */}
        <div
          className="flex items-center justify-between px-6 py-5"
          style={{ borderBottom: "1px solid var(--glass-border-subtle)" }}
        >
          <span
            className="font-display text-lg tracking-wider"
            style={{ color: "var(--green-900)" }}
          >
            Racing Pit
          </span>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-[var(--radius-sm)] transition-colors hover:bg-black/5"
            style={{ color: "var(--text-secondary)" }}
            aria-label="Close menu"
          >
            <XIcon />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/dashboard/bets"
                ? pathname === href
                : pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)]",
                  "text-sm font-medium transition-all duration-150",
                  active
                    ? "bg-green-800 text-white shadow-[0_2px_8px_rgba(27,67,50,0.3)]"
                    : "hover:bg-black/5"
                )}
                style={active ? {} : { color: "var(--text-secondary)" }}
              >
                <Icon size={18} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom accent bar */}
        <div
          className="mx-6 mb-6 h-1 rounded-full"
          style={{ background: "linear-gradient(to right, var(--green-800), var(--navy-800))" }}
        />
      </div>
    </>
  );
}

/* ─── Inline icon components ───────────────────────────────────── */

function Icon({ size = 20, children }: { size?: number; children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

function GridIcon({ size }: { size?: number }) {
  return (
    <Icon size={size}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </Icon>
  );
}

function SearchIcon({ size }: { size?: number }) {
  return (
    <Icon size={size}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </Icon>
  );
}

function FlagIcon({ size }: { size?: number }) {
  return (
    <Icon size={size}>
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </Icon>
  );
}

function HorseIcon({ size }: { size?: number }) {
  return (
    <Icon size={size}>
      <path d="M4 16c0 1.1.9 2 2 2h12a2 2 0 002-2V8c0-1.1-.9-2-2-2H6a2 2 0 00-2 2v8z" />
      <path d="M8 6V4M16 6V4M12 6V3" />
    </Icon>
  );
}

function UserIcon({ size }: { size?: number }) {
  return (
    <Icon size={size}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </Icon>
  );
}

function ClipboardIcon({ size }: { size?: number }) {
  return (
    <Icon size={size}>
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <line x1="9" y1="12" x2="15" y2="12" />
      <line x1="9" y1="16" x2="13" y2="16" />
    </Icon>
  );
}

function TicketIcon({ size }: { size?: number }) {
  return (
    <Icon size={size}>
      <path d="M2 9a3 3 0 010 6v2a2 2 0 002 2h16a2 2 0 002-2v-2a3 3 0 010-6V7a2 2 0 00-2-2H4a2 2 0 00-2 2v2z" />
    </Icon>
  );
}

function XIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function RaceDayIcon({ size }: { size?: number }) {
  return (
    <Icon size={size}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <circle cx="12" cy="16" r="2" fill="currentColor" stroke="none" />
    </Icon>
  );
}

function HeartIcon({ size }: { size?: number }) {
  return (
    <Icon size={size}>
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
    </Icon>
  );
}
