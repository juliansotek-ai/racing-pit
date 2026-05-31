"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function BetsTabStrip() {
  const pathname = usePathname();
  const isToday = pathname === "/dashboard/bets/today";

  return (
    <div
      className="flex gap-1 p-1 self-start rounded-[var(--radius-pill)]"
      style={{ background: "rgba(0,0,0,0.06)" }}
    >
      <TabLink href="/dashboard/bets/today" active={isToday}>
        Today
      </TabLink>
      <TabLink href="/dashboard/bets" active={!isToday}>
        All bets
      </TabLink>
    </div>
  );
}

function TabLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="px-5 py-1.5 rounded-[var(--radius-pill)] text-sm font-medium transition-all duration-150"
      style={
        active
          ? { background: "var(--green-800)", color: "#fff", boxShadow: "0 2px 8px rgba(27,67,50,0.25)" }
          : { color: "var(--text-secondary)" }
      }
    >
      {children}
    </Link>
  );
}
