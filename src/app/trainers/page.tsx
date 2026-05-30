import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { GlassCard } from "@/components/ui";

async function getTrainers() {
  const trainers = await prisma.trainer.findMany({
    include: {
      country: { select: { name: true } },
      horses: {
        select: {
          id: true,
          raceEntries: {
            where: { finishPos: { not: null } },
            select: { finishPos: true },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return trainers.map((t) => {
    const positions = t.horses.flatMap((h) => h.raceEntries.map((e) => e.finishPos!));
    const wins = positions.filter((p) => p === 1).length;
    return {
      id: t.id,
      name: t.name,
      country: t.country,
      totalHorses: t.horses.length,
      totalRunners: positions.length,
      wins,
      winRate: positions.length > 0 ? Math.round((wins / positions.length) * 100) : null,
      avgPos:
        positions.length > 0
          ? (positions.reduce((a, b) => a + b, 0) / positions.length).toFixed(1)
          : null,
    };
  });
}

export default async function TrainersPage() {
  const trainers = await getTrainers();

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 flex flex-col gap-8">

      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="display-xl" style={{ color: "var(--green-900)" }}>Trainers</h1>
          <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
            {trainers.length} registered
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
        {trainers.length === 0 ? (
          <p className="py-6 text-center text-sm" style={{ color: "var(--text-tertiary)" }}>
            No trainers registered yet.
          </p>
        ) : (
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th className="text-left py-2 pr-4 text-[10px] font-semibold tracking-widest uppercase" style={{ color: "var(--text-tertiary)" }}>
                    Trainer
                  </th>
                  <th className="text-right py-2 pl-3 text-[10px] font-semibold tracking-widest uppercase hidden sm:table-cell" style={{ color: "var(--text-tertiary)" }}>
                    Horses
                  </th>
                  <th className="text-right py-2 pl-3 text-[10px] font-semibold tracking-widest uppercase" style={{ color: "var(--text-tertiary)" }}>
                    Runners
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
                {trainers.map((trainer) => (
                  <tr
                    key={trainer.id}
                    className="transition-colors hover:bg-black/[0.025] group"
                    style={{ borderTop: "1px solid var(--glass-border-subtle)" }}
                  >
                    <td className="py-3 pr-4">
                      <Link
                        href={`/trainers/${trainer.id}`}
                        className="flex flex-col group-hover:underline underline-offset-2 decoration-1"
                      >
                        <span className="font-display font-medium" style={{ color: "var(--text-primary)" }}>
                          {trainer.name}
                        </span>
                        <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                          {trainer.country.name}
                        </span>
                      </Link>
                    </td>
                    <td className="py-3 pl-3 text-right tabular-nums font-medium hidden sm:table-cell" style={{ color: "var(--text-secondary)" }}>
                      {trainer.totalHorses || "—"}
                    </td>
                    <td className="py-3 pl-3 text-right tabular-nums font-medium" style={{ color: "var(--text-secondary)" }}>
                      {trainer.totalRunners || "—"}
                    </td>
                    <td
                      className="py-3 pl-3 text-right tabular-nums font-medium"
                      style={{ color: trainer.wins > 0 ? "var(--green-700)" : "var(--text-secondary)" }}
                    >
                      {trainer.wins || "—"}
                    </td>
                    <td className="py-3 pl-3 text-right tabular-nums font-medium hidden sm:table-cell" style={{ color: "var(--text-secondary)" }}>
                      {trainer.winRate != null ? `${trainer.winRate}%` : "—"}
                    </td>
                    <td className="py-3 pl-3 text-right tabular-nums font-medium hidden sm:table-cell" style={{ color: "var(--text-secondary)" }}>
                      {trainer.avgPos ?? "—"}
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
