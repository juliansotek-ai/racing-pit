"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

type SortDir = "asc" | "desc";

export type JockeyRow = {
  id: string;
  name: string;
  country: { name: string };
  totalRides: number;
  wins: number;
  winRate: number | null;
  avgPos: string | null;
  betsPlaced?: number;
  roi?: number | null;
};

function SortTh({
  active,
  sortDir,
  colKey,
  onSort,
  align = "right",
  className = "",
  children,
}: {
  active: boolean;
  sortDir: SortDir;
  colKey: string;
  onSort: (k: string) => void;
  align?: "left" | "right";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <th
      className={`py-2 text-[10px] font-semibold tracking-widest uppercase cursor-pointer select-none hover:opacity-70 transition-opacity ${
        align === "right" ? "text-right pl-3" : "text-left pr-4"
      } ${className}`}
      style={{ color: active ? "var(--green-700)" : "var(--text-tertiary)" }}
      onClick={() => onSort(colKey)}
    >
      {children}
      {active && (
        <span className="ml-0.5 opacity-60">{sortDir === "asc" ? "↑" : "↓"}</span>
      )}
    </th>
  );
}

function RoiCell({ roi, betsPlaced }: { roi?: number | null; betsPlaced?: number }) {
  if (!betsPlaced) return <span style={{ color: "var(--text-tertiary)" }}>—</span>;
  if (roi == null) return <span style={{ color: "var(--text-tertiary)" }}>—</span>;
  return (
    <span style={{ color: roi >= 0 ? "var(--green-700)" : "#ef4444" }}>
      {roi >= 0 ? "+" : ""}
      {roi.toFixed(1)}%
    </span>
  );
}

export function JockeysTable({
  jockeys,
  showBetStats = false,
  emptyMessage = "No jockeys found.",
}: {
  jockeys: JockeyRow[];
  showBetStats?: boolean;
  emptyMessage?: string;
}) {
  const [sortKey, setSortKey] = useState("wins");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "avgPos" ? "asc" : "desc");
    }
  }

  const sorted = useMemo(() => {
    return [...jockeys].sort((a, b) => {
      let va: number | string;
      let vb: number | string;
      if (sortKey === "name") { va = a.name; vb = b.name; }
      else if (sortKey === "totalRides") { va = a.totalRides; vb = b.totalRides; }
      else if (sortKey === "wins") { va = a.wins; vb = b.wins; }
      else if (sortKey === "winRate") { va = a.winRate ?? -1; vb = b.winRate ?? -1; }
      else if (sortKey === "avgPos") { va = parseFloat(a.avgPos ?? "9999"); vb = parseFloat(b.avgPos ?? "9999"); }
      else if (sortKey === "betsPlaced") { va = a.betsPlaced ?? 0; vb = b.betsPlaced ?? 0; }
      else if (sortKey === "roi") { va = a.roi ?? -9999; vb = b.roi ?? -9999; }
      else { va = 0; vb = 0; }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [jockeys, sortKey, sortDir]);

  if (jockeys.length === 0) {
    return (
      <p className="py-6 text-center text-sm" style={{ color: "var(--text-tertiary)" }}>
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto -mx-6 px-6">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            <SortTh active={sortKey === "name"} sortDir={sortDir} colKey="name" onSort={handleSort} align="left">
              Jockey
            </SortTh>
            <SortTh active={sortKey === "totalRides"} sortDir={sortDir} colKey="totalRides" onSort={handleSort}>
              Rides
            </SortTh>
            <SortTh active={sortKey === "wins"} sortDir={sortDir} colKey="wins" onSort={handleSort}>
              Wins
            </SortTh>
            <SortTh active={sortKey === "winRate"} sortDir={sortDir} colKey="winRate" onSort={handleSort} className="hidden sm:table-cell">
              Win%
            </SortTh>
            <SortTh active={sortKey === "avgPos"} sortDir={sortDir} colKey="avgPos" onSort={handleSort} className="hidden sm:table-cell">
              Avg
            </SortTh>
            {showBetStats && (
              <SortTh active={sortKey === "betsPlaced"} sortDir={sortDir} colKey="betsPlaced" onSort={handleSort} className="hidden sm:table-cell">
                Bets
              </SortTh>
            )}
            {showBetStats && (
              <SortTh active={sortKey === "roi"} sortDir={sortDir} colKey="roi" onSort={handleSort} className="hidden sm:table-cell">
                ROI
              </SortTh>
            )}
          </tr>
        </thead>
        <tbody>
          {sorted.map((jockey) => (
            <tr
              key={jockey.id}
              className="transition-colors hover:bg-black/[0.025] group"
              style={{ borderTop: "1px solid var(--glass-border-subtle)" }}
            >
              <td className="py-3 pr-4">
                <Link
                  href={`/jockeys/${jockey.id}`}
                  className="flex flex-col group-hover:underline underline-offset-2 decoration-1"
                >
                  <span className="font-display font-medium" style={{ color: "var(--text-primary)" }}>
                    {jockey.name}
                  </span>
                  <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                    {jockey.country.name}
                  </span>
                </Link>
              </td>
              <td className="py-3 pl-3 text-right tabular-nums font-medium" style={{ color: "var(--text-secondary)" }}>
                {jockey.totalRides || "—"}
              </td>
              <td
                className="py-3 pl-3 text-right tabular-nums font-medium"
                style={{ color: jockey.wins > 0 ? "var(--green-700)" : "var(--text-secondary)" }}
              >
                {jockey.wins || "—"}
              </td>
              <td className="py-3 pl-3 text-right tabular-nums font-medium hidden sm:table-cell" style={{ color: "var(--text-secondary)" }}>
                {jockey.winRate != null ? `${jockey.winRate}%` : "—"}
              </td>
              <td className="py-3 pl-3 text-right tabular-nums font-medium hidden sm:table-cell" style={{ color: "var(--text-secondary)" }}>
                {jockey.avgPos ?? "—"}
              </td>
              {showBetStats && (
                <td className="py-3 pl-3 text-right tabular-nums font-medium hidden sm:table-cell" style={{ color: "var(--text-secondary)" }}>
                  {jockey.betsPlaced ?? "—"}
                </td>
              )}
              {showBetStats && (
                <td className="py-3 pl-3 text-right tabular-nums font-medium hidden sm:table-cell">
                  <RoiCell roi={jockey.roi} betsPlaced={jockey.betsPlaced} />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
