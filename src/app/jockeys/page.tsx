export const dynamic = "force-dynamic";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { GlassCard } from "@/components/ui";

async function getJockeys() {
  const jockeys = await prisma.jockey.findMany({
    include: {
      country: { select: { name: true } },
      raceEntries: {
        where: { finishPos: { not: null } },
        select: { finishPos: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return jockeys.map((j) => {
    const positions = j.raceEntries.map((e) => e.finishPos!);
    const wins = positions.filter((p) => p === 1).length;
    return {
      id: j.id,
      name: j.name,
      country: j.country,
      totalRides: positions.length,
      wins,
      winRate: positions.length > 0 ? Math.round((wins / positions.length) * 100) : null,
      avgPos:
        positions.length > 0
          ? (positions.reduce((a, b) => a + b, 0) / positions.length).toFixed(1)
          : null,
    };
  });
}

export default async function JockeysPage() {
  const jockeys = await getJockeys();

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 flex flex-col gap-8">

      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="display-xl" style={{ color: "var(--green-900)" }}>Jockeys</h1>
          <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
            {jockeys.length} registered
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

      <GlassCard variant="default" radius="xl" padding="md">
        {jockeys.length === 0 ? (
          <p className="py-6 text-center text-sm" style={{ color: "var(--text-tertiary)" }}>
            No jockeys registered yet.
          </p>
        ) : (
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th className="text-left py-2 pr-4 text-[10px] font-semibold tracking-widest uppercase" style={{ color: "var(--text-tertiary)" }}>
                    Jockey
                  </th>
                  <th className="text-right py-2 pl-3 text-[10px] font-semibold tracking-widest uppercase" style={{ color: "var(--text-tertiary)" }}>
                    Rides
                  </th>
                  <th className="text-right py-2 pl-3 text-[10px] font-semibold tracking-widest uppercase" style={{ color: "var(--text-tertiary)" }}>
                    Wins
                  </th>
                  <th className="text-right py-2 pl-3 text-[10px] font-semibold tracking-widest uppercase hidden sm:table-cell" style={{ color: "var(--text-tertiary)" }}>
                    Win%
                  </th>
                  <th className="text-right py-2 pl-3 text-[10px] font-semibold tracking-widest uppercase hidden sm:table-cell" style={{ color: "var(--text-tertiary)" }}>
                    Avg
                  </th>
                </tr>
              </thead>
              <tbody>
                {jockeys.map((jockey) => (
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

    </main>
  );
}
