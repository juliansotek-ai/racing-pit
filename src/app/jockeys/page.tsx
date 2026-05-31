export const dynamic = "force-dynamic";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { GlassCard } from "@/components/ui";
import { auth } from "@/lib/auth";
import { JockeysTable, type JockeyRow } from "@/components/JockeysTable";

async function getAllJockeys(): Promise<JockeyRow[]> {
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

async function getFavoriteJockeys(userId: string): Promise<JockeyRow[]> {
  const favorites = await prisma.favorite.findMany({
    where: { userId, jockeyId: { not: null } },
    include: {
      jockey: {
        include: {
          country: { select: { name: true } },
          raceEntries: {
            where: { finishPos: { not: null } },
            select: { finishPos: true },
          },
        },
      },
    },
  });

  const jockeyIds = favorites.map((f) => f.jockeyId!);
  if (jockeyIds.length === 0) return [];

  const bets = await prisma.bet.findMany({
    where: { userId, raceEntry: { jockeyId: { in: jockeyIds } } },
    include: { raceEntry: { select: { jockeyId: true } } },
  });

  const betsByJockey: Record<string, { total: number; settledStake: number; settledPayout: number }> = {};
  for (const bet of bets) {
    const id = bet.raceEntry.jockeyId;
    if (!id) continue;
    if (!betsByJockey[id]) betsByJockey[id] = { total: 0, settledStake: 0, settledPayout: 0 };
    betsByJockey[id].total++;
    if (bet.result !== null) {
      betsByJockey[id].settledStake += bet.stake;
      betsByJockey[id].settledPayout += bet.payout ?? 0;
    }
  }

  return favorites
    .filter((f) => f.jockey != null)
    .map((f) => {
      const j = f.jockey!;
      const positions = j.raceEntries.map((e) => e.finishPos!);
      const wins = positions.filter((p) => p === 1).length;
      const stats = betsByJockey[j.id];
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
        betsPlaced: stats?.total ?? 0,
        roi:
          stats && stats.settledStake > 0
            ? ((stats.settledPayout - stats.settledStake) / stats.settledStake) * 100
            : null,
      };
    })
    .sort((a, b) => b.wins - a.wins);
}

export default async function JockeysPage() {
  const session = await auth();

  const [jockeys, favoriteJockeys] = await Promise.all([
    getAllJockeys(),
    session?.user?.id ? getFavoriteJockeys(session.user.id) : Promise.resolve(null),
  ]);

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

      {favoriteJockeys !== null && (
        <div className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold tracking-widest uppercase" style={{ color: "var(--text-secondary)" }}>
            ★ Followed Jockeys
          </h2>
          <GlassCard variant="default" radius="xl" padding="md">
            <JockeysTable
              jockeys={favoriteJockeys}
              showBetStats
              emptyMessage="You haven't followed any jockeys yet. Click Follow on a jockey's page to track it here."
            />
          </GlassCard>
        </div>
      )}

      <GlassCard variant="default" radius="xl" padding="md">
        <JockeysTable jockeys={jockeys} emptyMessage="No jockeys registered yet." />
      </GlassCard>

    </main>
  );
}
