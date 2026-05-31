"use client";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";

interface Props {
  min: string | null;
  max: string | null;
  from: string;
  to: string;
}

export function DateRangeFilter({ min, max, from, to }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const update = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  const clear = useCallback(() => {
    router.push(pathname);
  }, [router, pathname]);

  const hasFilter = from || to;

  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="flex flex-col gap-1.5">
        <label
          className="text-xs font-medium tracking-wide uppercase"
          style={{ color: "var(--text-tertiary)" }}
        >
          From
        </label>
        <input
          type="date"
          value={from}
          min={min ?? undefined}
          max={(to || max) ?? undefined}
          onChange={(e) => update("from", e.target.value)}
          className="h-10 px-3 text-sm rounded-[var(--radius-md)] border"
          style={{
            color: "var(--text-primary)",
            background: "rgba(255,255,255,0.6)",
            borderColor: "var(--glass-border)",
            backdropFilter: "blur(8px)",
          }}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label
          className="text-xs font-medium tracking-wide uppercase"
          style={{ color: "var(--text-tertiary)" }}
        >
          To
        </label>
        <input
          type="date"
          value={to}
          min={(from || min) ?? undefined}
          max={max ?? undefined}
          onChange={(e) => update("to", e.target.value)}
          className="h-10 px-3 text-sm rounded-[var(--radius-md)] border"
          style={{
            color: "var(--text-primary)",
            background: "rgba(255,255,255,0.6)",
            borderColor: "var(--glass-border)",
            backdropFilter: "blur(8px)",
          }}
        />
      </div>
      {hasFilter && (
        <button
          onClick={clear}
          className="h-10 px-4 text-sm font-medium rounded-[var(--radius-md)] transition-opacity hover:opacity-70"
          style={{ color: "var(--text-secondary)" }}
        >
          Clear
        </button>
      )}
    </div>
  );
}
