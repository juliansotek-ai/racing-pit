export const dynamic = "force-dynamic";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { GlassCard } from "@/components/ui";

async function getHorses() {
  const horses = await prisma.horse.findMany({
    include: {
      trainer: { select: { id: true, name: true } },
      country: { select: { name: true } },
      raceEntries: {
        where: { finishPos: { not: null } },
        select: { finishPos: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return horses.map((h) => {
    const positions = h.raceEntries.map((e) => e.finishPos!);
    return {
      id: h.id,
      name: h.name,
      gender: h.gender,
      country: h.country,
      trainer: h.trainer,
      totalRaces: positions.length,
      wins: positions.filter((p) => p === 1).length,
      avgPos:
        positions.length > 0
          ? (positions.reduce((a, b) => a + b, 0) / positions.length).toFixed(1)
          : null,
    };
  });
}

export default async function HorsesPage() {
  const horses = await getHorses();

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 flex flex-col gap-8">

      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="display-xl" style={{ color: "var(--green-900)" }}>Horses</h1>
          <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
            {horses.length} registered
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
        {horses.length === 0 ? (
          <p className="py-6 text-center text-sm" style={{ color: "var(--text-tertiary)" }}>
            No horses registered yet.
          </p>
        ) : (
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th className="text-left py-2 pr-4 text-[10px] font-semibold tracking-widest uppercase" style={{ color: "var(--text-tertiary)" }}>
                    Horse
                  </th>
                  <th className="text-left py-2 pr-4 text-[10px] font-semibold tracking-widest uppercase hidden sm:table-cell" style={{ color: "var(--text-tertiary)" }}>
                    Trainer
                  </th>
                  <th className="text-right py-2 pl-3 text-[10px] font-semibold tracking-widest uppercase" style={{ color: "var(--text-tertiary)" }}>
                    Races
                  </th>
                  <th className="text-right py-2 pl-3 text-[10px] font-semibold tracking-widest uppercase" style={{ color: "var(--text-tertiary)" }}>
                    Wins
                  </th>
                  <th className="text-right py-2 pl-3 text-[10px] font-semibold tracking-widest uppercase" style={{ color: "var(--text-tertiary)" }}>
                    Avg
                  </th>
                </tr>
              </thead>
              <tbody>
                {horses.map((horse) => (
                  <tr
                    key={horse.id}
                    className="transition-colors hover:bg-black/[0.025] group"
                    style={{ borderTop: "1px solid var(--glass-border-subtle)" }}
                  >
                    <td className="py-3 pr-4">
                      <Link
                        href={`/horses/${horse.id}`}
                        className="flex flex-col group-hover:underline underline-offset-2 decoration-1"
                      >
                        <span className="font-display font-medium" style={{ color: "var(--text-primary)" }}>
                          {horse.name}
                        </span>
                        <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                          {horse.country.name}{horse.gender ? ` · ${horse.gender}` : ""}
                        </span>
                      </Link>
                    </td>
                    <td className="py-3 pr-4 hidden sm:table-cell">
                      {horse.trainer ? (
                        <Link
                          href={`/trainers/${horse.trainer.id}`}
                          className="text-sm hover:underline underline-offset-2"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {horse.trainer.name}
                        </Link>
                      ) : (
                        <span className="text-sm" style={{ color: "var(--text-tertiary)" }}>—</span>
                      )}
                    </td>
                    <td className="py-3 pl-3 text-right tabular-nums font-medium" style={{ color: "var(--text-secondary)" }}>
                      {horse.totalRaces || "—"}
                    </td>
                    <td
                      className="py-3 pl-3 text-right tabular-nums font-medium"
                      style={{ color: horse.wins > 0 ? "var(--green-700)" : "var(--text-secondary)" }}
                    >
                      {horse.wins || "—"}
                    </td>
                    <td className="py-3 pl-3 text-right tabular-nums font-medium" style={{ color: "var(--text-secondary)" }}>
                      {horse.avgPos ?? "—"}
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
