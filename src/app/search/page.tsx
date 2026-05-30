"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { trpc } from "@/lib/trpc";
import { GlassCard } from "@/components/ui";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(query.trim()), 300);
    return () => clearTimeout(id);
  }, [query]);

  const enabled = debouncedQ.length >= 2;
  const { data, isFetching } = trpc.search.query.useQuery(
    { q: debouncedQ },
    { enabled }
  );

  const totalResults = data
    ? data.horses.length + data.jockeys.length + data.trainers.length + data.races.length
    : 0;

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 flex flex-col gap-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="display-xl" style={{ color: "var(--green-900)" }}>Search</h1>
          <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
            Horses, jockeys, trainers &amp; races
          </p>
        </div>
        <Link
          href="/dashboard"
          className="text-sm transition-opacity hover:opacity-70"
          style={{ color: "var(--text-secondary)" }}
        >
          ← Dashboard
        </Link>
      </div>

      {/* Search input */}
      <GlassCard variant="heavy" radius="xl" padding="sm">
        <div className="flex items-center gap-3 px-2 py-1.5">
          <span style={{ color: "var(--green-600)", flexShrink: 0 }}>
            <SearchIcon size={18} />
          </span>
          <input
            type="search"
            autoFocus
            placeholder="Search for a horse, jockey, trainer, or race…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-base outline-none min-w-0 placeholder:opacity-50"
            style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)" }}
          />
          {isFetching && (
            <span style={{ color: "var(--text-tertiary)", flexShrink: 0 }}>
              <SpinnerIcon />
            </span>
          )}
          {!isFetching && query.length > 0 && (
            <button
              onClick={() => { setQuery(""); setDebouncedQ(""); }}
              className="transition-opacity hover:opacity-60 flex-shrink-0"
              style={{ color: "var(--text-tertiary)" }}
              aria-label="Clear search"
            >
              <XIcon />
            </button>
          )}
        </div>
      </GlassCard>

      {/* Empty state — waiting for input */}
      {!enabled && (
        <div className="flex flex-col items-center py-20 gap-4">
          <div
            className="w-16 h-16 rounded-[var(--radius-xl)] glass flex items-center justify-center"
            style={{ color: "var(--green-600)" }}
          >
            <SearchIcon size={28} />
          </div>
          <div className="flex flex-col items-center gap-1">
            <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
              Search across all entities
            </p>
            <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
              Type at least 2 characters to see results
            </p>
          </div>
        </div>
      )}

      {/* No results */}
      {enabled && !isFetching && data && totalResults === 0 && (
        <div className="flex flex-col items-center py-20 gap-2">
          <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
            No results for &ldquo;{debouncedQ}&rdquo;
          </p>
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            Try a different term
          </p>
        </div>
      )}

      {/* Results grouped by entity type */}
      {data && totalResults > 0 && (
        <div className="flex flex-col gap-5">
          {data.horses.length > 0 && (
            <ResultGroup label="Horses" count={data.horses.length} accentColor="green">
              {data.horses.map((horse) => (
                <ResultRow
                  key={horse.id}
                  href={`/horses/${horse.id}`}
                  name={horse.name}
                  meta={[
                    horse.country.name,
                    horse.gender,
                    horse.trainer ? `Tr. ${horse.trainer.name}` : null,
                  ].filter(Boolean).join(" · ")}
                />
              ))}
            </ResultGroup>
          )}

          {data.jockeys.length > 0 && (
            <ResultGroup label="Jockeys" count={data.jockeys.length} accentColor="navy">
              {data.jockeys.map((j) => (
                <ResultRow
                  key={j.id}
                  href={`/jockeys/${j.id}`}
                  name={j.name}
                  meta={j.country.name}
                />
              ))}
            </ResultGroup>
          )}

          {data.trainers.length > 0 && (
            <ResultGroup label="Trainers" count={data.trainers.length} accentColor="green">
              {data.trainers.map((t) => (
                <ResultRow
                  key={t.id}
                  href={`/trainers/${t.id}`}
                  name={t.name}
                  meta={t.country.name}
                />
              ))}
            </ResultGroup>
          )}

          {data.races.length > 0 && (
            <ResultGroup label="Races" count={data.races.length} accentColor="navy">
              {data.races.map((r) => (
                <ResultRow
                  key={r.id}
                  href={`/races/${r.id}`}
                  name={r.name}
                  meta={[
                    r.racecourse.name,
                    format(new Date(r.scheduledAt), "d MMM yyyy"),
                    r.raceClass,
                  ].filter(Boolean).join(" · ")}
                />
              ))}
            </ResultGroup>
          )}
        </div>
      )}
    </main>
  );
}

/* ── Sub-components ──────────────────────────────────────────────── */

function ResultGroup({
  label,
  count,
  accentColor,
  children,
}: {
  label: string;
  count: number;
  accentColor: "green" | "navy";
  children: React.ReactNode;
}) {
  const headingColor = accentColor === "green" ? "var(--green-900)" : "var(--navy-800)";
  const badgeBg     = accentColor === "green" ? "var(--green-50)"  : "var(--navy-50)";
  const badgeColor  = accentColor === "green" ? "var(--green-700)" : "var(--navy-600)";

  return (
    <GlassCard variant="default" radius="xl" padding="md">
      <div className="flex items-center gap-2 mb-1">
        <h2 className="display-md" style={{ color: headingColor }}>{label}</h2>
        <span
          className="text-xs font-medium px-2 py-0.5 rounded-full"
          style={{ background: badgeBg, color: badgeColor }}
        >
          {count}
        </span>
      </div>
      <div className="flex flex-col">{children}</div>
    </GlassCard>
  );
}

function ResultRow({ href, name, meta }: { href: string; name: string; meta?: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between -mx-6 px-6 py-3 transition-colors hover:bg-black/[0.025] group"
      style={{ borderTop: "1px solid var(--glass-border-subtle)" }}
    >
      <div className="flex flex-col min-w-0">
        <span
          className="font-display font-medium text-sm group-hover:underline underline-offset-2 decoration-1 truncate"
          style={{ color: "var(--text-primary)" }}
        >
          {name}
        </span>
        {meta && (
          <span className="text-xs truncate" style={{ color: "var(--text-tertiary)" }}>
            {meta}
          </span>
        )}
      </div>
      <ChevronRight />
    </Link>
  );
}

/* ── Icons ───────────────────────────────────────────────────────── */

function SearchIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
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

function SpinnerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" className="animate-spin">
      <path d="M12 2a10 10 0 1 0 10 10" strokeLinecap="round" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ color: "var(--text-tertiary)", flexShrink: 0 }}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}
