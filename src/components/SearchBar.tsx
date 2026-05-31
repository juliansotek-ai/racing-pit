"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useRef } from "react";

export function SearchBar({ placeholder = "Search..." }: { placeholder?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    clearTimeout(timerRef.current);
    const value = e.target.value;
    timerRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set("search", value);
      } else {
        params.delete("search");
      }
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    }, 300);
  }

  return (
    <input
      type="search"
      defaultValue={searchParams.get("search") ?? ""}
      onChange={handleChange}
      placeholder={placeholder}
      className="w-full sm:w-64 h-9 px-3 text-sm rounded-[var(--radius-md)] border transition-colors outline-none focus:ring-1"
      style={{
        background: "rgba(255,255,255,0.6)",
        borderColor: "var(--glass-border)",
        color: "var(--text-primary)",
        "--tw-ring-color": "var(--green-700)",
      } as React.CSSProperties}
    />
  );
}
