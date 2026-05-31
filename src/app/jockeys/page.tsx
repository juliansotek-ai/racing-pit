export const dynamic = "force-dynamic";
import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { GlassCard } from "@/components/ui";
import { auth } from "@/lib/auth";
import { JockeysTable, type JockeyRow } from "@/components/JockeysTable";
import { SearchBar } from "@/components/SearchBar";
import { Pagination } from "@/components/Pagination";

const LIMIT = 50;

async function getJockeys(search: string, skip: number): Promise<{ items: JockeyRow[]; total: number }> {
  const where = search
    ? { name: { contains: search, mode: "insensitive" as const } }
    : undefined;

  const [jockeys, total] = await Promise.all([
    prisma.jockey.findMany({
      where,
      include: {
        country: { select: { name: true } },
        raceEntries: {
          where: { finishPos: { not: null } },
          select: { finishPos: true },
        },
      },
      orderBy: { name: "asc" },
      skip,
      take: LIMIT,
    }),
    prisma.jockey.count({ where }),
  ]);

  return {
    items: jockeys.map((j) => {
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
    }),
    total,
  };
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

export default async function JockeysPage(props: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const searchParams = await props.searchParams;
  const search = searchParams.search ?? "";
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10));
  const skip = (page - 1) * LIMIT;

  const session = await auth();

  const [{ items: jockeys, total }, favoriteJockeys] = await Promise.all([
    getJockeys(search, skip),
    session?.user?.id ? getFavoriteJockeys(session.user.id) : Promise.resolve(null),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 flex flex-col gap-8">

      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="display-xl" style={{ color: "var(--green-900)" }}>Jockeys</h1>
          <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
            {total} registered
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

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xs font-semibold tracking-widest uppercase" style={{ color: "var(--text-secondary)" }}>
            All Jockeys
          </h2>
          <Suspense fallback={null}>
            <SearchBar placeholder="Search jockeys…" />
          </Suspense>
        </div>
        <GlassCard variant="default" radius="xl" padding="md">
          <JockeysTable jockeys={jockeys} emptyMessage={search ? "No jockeys match your search." : "No jockeys registered yet."} />
          <Pagination page={page} totalPages={totalPages} total={total} limit={LIMIT} search={search} basePath="/jockeys" />
        </GlassCard>
      </div>

    </main>
  );
}
