import Link from "next/link";
import { GlassCard } from "./glass-card";
import { cn } from "@/lib/utils";

export interface LeaderboardRow {
  id: string;
  rank: number;
  name: string;
  sub?: string;
  href?: string;
  cols: (string | number)[];
}

interface LeaderboardTableProps {
  title: string;
  headers: string[];
  rows: LeaderboardRow[];
  viewAllHref?: string;
  emptyMessage?: string;
  accentColor?: "green" | "navy";
}

const rankStyle = [
  { bg: "rgba(212,175,55,0.12)", color: "#B8962E", ring: "rgba(212,175,55,0.4)" },  // gold
  { bg: "rgba(160,160,175,0.12)", color: "#7A7A8A", ring: "rgba(160,160,175,0.4)" }, // silver
  { bg: "rgba(176,116,72,0.12)", color: "#9B6B43", ring: "rgba(176,116,72,0.4)" },  // bronze
];

export function LeaderboardTable({
  title,
  headers,
  rows,
  viewAllHref,
  emptyMessage = "No data yet.",
  accentColor = "green",
}: LeaderboardTableProps) {
  const headingColor = accentColor === "green" ? "var(--green-900)" : "var(--navy-800)";

  return (
    <GlassCard variant="default" radius="xl" padding="md" className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="display-md" style={{ color: headingColor }}>{title}</h2>
        {viewAllHref && (
          <Link
            href={viewAllHref}
            className="text-xs font-medium transition-colors hover:underline"
            style={{ color: "var(--text-tertiary)" }}
          >
            View all →
          </Link>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="text-sm py-4 text-center" style={{ color: "var(--text-tertiary)" }}>
          {emptyMessage}
        </p>
      ) : (
        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th
                  className="text-left py-2 pr-3 w-8 text-[10px] font-semibold tracking-widest uppercase"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  #
                </th>
                <th
                  className="text-left py-2 pr-4 text-[10px] font-semibold tracking-widest uppercase"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Name
                </th>
                {headers.map((h) => (
                  <th
                    key={h}
                    className="text-right py-2 pl-3 text-[10px] font-semibold tracking-widest uppercase whitespace-nowrap"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const rs = rankStyle[row.rank - 1];

                return (
                  <tr
                    key={row.id}
                    className="transition-colors hover:bg-black/[0.025] group"
                    style={{ borderTop: "1px solid var(--glass-border-subtle)" }}
                  >
                    {/* Rank */}
                    <td className="py-3 pr-3 w-8">
                      <span
                        className={cn(
                          "inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold",
                          rs ? "ring-1" : ""
                        )}
                        style={
                          rs
                            ? { background: rs.bg, color: rs.color, boxShadow: `0 0 0 1px ${rs.ring}` }
                            : { color: "var(--text-tertiary)" }
                        }
                      >
                        {row.rank}
                      </span>
                    </td>

                    {/* Name */}
                    <td className="py-3 pr-4">
                      {row.href ? (
                        <Link href={row.href} className="flex flex-col group-hover:underline underline-offset-2 decoration-1">
                          <NameContent row={row} />
                        </Link>
                      ) : (
                        <div className="flex flex-col">
                          <NameContent row={row} />
                        </div>
                      )}
                    </td>

                    {/* Stat columns */}
                    {row.cols.map((val, i) => (
                      <td
                        key={i}
                        className="py-3 pl-3 text-right font-medium tabular-nums"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {val}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </GlassCard>
  );
}

function NameContent({ row }: { row: LeaderboardRow }) {
  return (
    <>
      <span
        className="font-display font-medium leading-snug"
        style={{ color: "var(--text-primary)" }}
      >
        {row.name}
      </span>
      {row.sub && (
        <span className="text-xs leading-none mt-0.5" style={{ color: "var(--text-tertiary)" }}>
          {row.sub}
        </span>
      )}
    </>
  );
}
