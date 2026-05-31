"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession, signIn, signOut } from "next-auth/react";
import { NavDrawer } from "./nav-drawer";

export function Navbar() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const { data: session } = useSession();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profileMenuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [profileMenuOpen]);

  return (
    <>
      <header
        className="sticky top-0 z-30 glass-heavy"
        style={{ borderBottom: "1px solid var(--glass-border-subtle)" }}
      >
        <div className="max-w-6xl mx-auto px-4 h-14 grid grid-cols-3 items-center">

          {/* Left: menu button */}
          <div>
            <button
              onClick={() => setDrawerOpen(true)}
              className="flex items-center justify-center w-9 h-9 rounded-[var(--radius-sm)] transition-colors hover:bg-black/5"
              style={{ color: "var(--text-secondary)" }}
              aria-label="Open menu"
            >
              <MenuIcon />
            </button>
          </div>

          {/* Center: logo + wordmark */}
          <div className="flex justify-center">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 select-none group"
            >
              <Image
                src="/logo.png"
                alt="Racing Pit"
                width={36}
                height={36}
                className="object-contain transition-transform group-hover:scale-105"
                style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.10))" }}
              />
              <span
                className="font-display text-sm font-medium uppercase tracking-widest hidden sm:block"
                style={{ color: "var(--green-900)", letterSpacing: "0.18em" }}
              >
                Racing Pit
              </span>
            </Link>
          </div>

          {/* Right: account */}
          <div className="flex justify-end">
            {session ? (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setProfileMenuOpen((v) => !v)}
                  className="flex items-center justify-center w-9 h-9 rounded-full overflow-hidden transition-opacity hover:opacity-80"
                  title={session.user?.email ?? "Account"}
                  aria-label="Account menu"
                  aria-expanded={profileMenuOpen}
                  aria-haspopup="true"
                >
                  {session.user?.image ? (
                    <Image
                      src={session.user.image}
                      alt={session.user.name ?? "Account"}
                      width={36}
                      height={36}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <AvatarFallback name={session.user?.name} />
                  )}
                </button>

                {/* Dropdown menu */}
                {profileMenuOpen && (
                  <div
                    className="absolute right-0 top-11 w-56 glass-heavy rounded-[var(--radius-md)] overflow-hidden"
                    style={{
                      border: "1px solid var(--glass-border)",
                      boxShadow: "0 8px 32px rgba(10,22,18,0.12)",
                      zIndex: 50,
                    }}
                    role="menu"
                  >
                    {/* User info header */}
                    <div
                      className="px-4 py-3"
                      style={{ borderBottom: "1px solid var(--glass-border-subtle)" }}
                    >
                      <p className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>
                        {session.user?.name ?? "Account"}
                      </p>
                      <p className="text-xs truncate mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                        {session.user?.email}
                      </p>
                    </div>

                    {/* Menu items */}
                    <div className="py-1">
                      <Link
                        href="/profile"
                        role="menuitem"
                        onClick={() => setProfileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-black/5"
                        style={{ color: "var(--text-primary)" }}
                      >
                        <ProfileIcon />
                        View Profile
                      </Link>

                      <div style={{ borderTop: "1px solid var(--glass-border-subtle)" }} className="my-1" />

                      <button
                        role="menuitem"
                        onClick={() => { setProfileMenuOpen(false); void signOut(); }}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm transition-colors hover:bg-black/5 text-left"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        <SignOutIcon />
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => signIn()}
                className="flex items-center justify-center w-9 h-9 rounded-full transition-colors hover:bg-black/5"
                style={{ color: "var(--text-secondary)" }}
                aria-label="Sign in"
              >
                <PersonIcon />
              </button>
            )}
          </div>
        </div>
      </header>

      <NavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}

function AvatarFallback({ name }: { name?: string | null }) {
  const initials = name
    ? name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";
  return (
    <span
      className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold text-white"
      style={{ background: "linear-gradient(135deg, var(--green-800), var(--navy-800))" }}
    >
      {initials}
    </span>
  );
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
