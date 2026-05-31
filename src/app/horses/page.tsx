export const dynamic = "force-dynamic";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { GlassCard } from "@/components/ui";
import { auth } from "@/lib/auth";
import { HorsesTable, type HorseRow } from "@/components/HorsesTable";

async function getAllHorses(): Promise<HorseRow[]> {
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
    const wins = positions.filter((p) => p === 1).length;
    return {
      id: h.id,
      name: h.name,
      gender: h.gender,
      country: h.country,
      trainer: h.trainer,
      totalRaces: positions.length,
      wins,
      avgPos:
        positions.length > 0
          ? (positions.reduce((a, b) => a + b, 0) / positions.length).toFixed(1)
          : null,
    };
  });
}

async function getFavoriteHorses(userId: string): Promise<HorseRow[]> {
  const favorites = await prisma.favorite.findMany({
    where: { userId, horseId: { not: null } },
    include: {
      horse: {
        include: {
          trainer: { select: { id: true, name: true } },
          country: { select: { name: true } },
          raceEntries: {
            where: { finishPos: { not: null } },
            select: { finishPos: true },
          },
        },
      },
    },
  });

  const horseIds = favorites.map((f) => f.horseId!);
  if (horseIds.length === 0) return [];

  const bets = await prisma.bet.findMany({
    where: { userId, raceEntry: { horseId: { in: horseIds } } },
    include: { raceEntry: { select: { horseId: true } } },
  });

  const betsByHorse: Record<string, { total: number; settledStake: number; settledPayout: number }> = {};
  for (const bet of bets) {
    const id = bet.raceEntry.horseId;
    if (!betsByHorse[id]) betsByHorse[id] = { total: 0, settledStake: 0, settledPayout: 0 };
    betsByHorse[id].total++;
    if (bet.result !== null) {
      betsByHorse[id].settledStake += bet.stake;
      betsByHorse[id].settledPayout += bet.payout ?? 0;
    }
  }

  return favorites
    .filter((f) => f.horse != null)
    .map((f) => {
      const h = f.horse!;
      const positions = h.raceEntries.map((e) => e.finishPos!);
      const wins = positions.filter((p) => p === 1).length;
      const stats = betsByHorse[h.id];
      return {
        id: h.id,
        name: h.name,
        gender: h.gender,
        country: h.country,
        trainer: h.trainer,
        totalRaces: positions.length,
        wins,
        avgPos:
          positions.length > 0
            ? (positions.reduce((a, b) => a + b, 0) / positions.length).toFixed(1)
            : null,
        betsPlaced: stats?.total ?? 0,
        roi:
          stats && stats.settledStake > 0
            ? ((stats.settledPayout - stats.settledStake) / stats.settledStake) * 100
            : null,
      };
    })
    .sort((a, b) => b.wins - a.wins);
}

export default async function HorsesPage() {
  const session = await auth();

  const [horses, favoriteHorses] = await Promise.all([
    getAllHorses(),
    session?.user?.id ? getFavoriteHorses(session.user.id) : Promise.resolve(null),
  ]);

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

      {favoriteHorses !== null && (
        <div className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold tracking-widest uppercase" style={{ color: "var(--text-secondary)" }}>
            ★ Followed Horses
          </h2>
          <GlassCard variant="default" radius="xl" padding="md">
            <HorsesTable
              horses={favoriteHorses}
              showBetStats
              emptyMessage="You haven't followed any horses yet. Click Follow on a horse's page to track it here."
            />
          </GlassCard>
        </div>
      )}

      <GlassCard variant="default" radius="xl" padding="md">
        <HorsesTable horses={horses} emptyMessage="No horses registered yet." />
      </GlassCard>

    </main>
  );
}
