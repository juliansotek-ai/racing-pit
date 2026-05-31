export const dynamic = "force-dynamic";
import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { GlassCard } from "@/components/ui";
import { auth } from "@/lib/auth";
import { TrainersTable, type TrainerRow } from "@/components/TrainersTable";
import { SearchBar } from "@/components/SearchBar";
import { Pagination } from "@/components/Pagination";

const LIMIT = 50;

async function getTrainers(search: string, skip: number): Promise<{ items: TrainerRow[]; total: number }> {
  const where = search
    ? { name: { contains: search, mode: "insensitive" as const } }
    : undefined;

  const [trainers, total] = await Promise.all([
    prisma.trainer.findMany({
      where,
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
      skip,
      take: LIMIT,
    }),
    prisma.trainer.count({ where }),
  ]);

  return {
    items: trainers.map((t) => {
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
    }),
    total,
  };
}

async function getFavoriteTrainers(userId: string): Promise<TrainerRow[]> {
  const favorites = await prisma.favorite.findMany({
    where: { userId, trainerId: { not: null } },
    include: {
      trainer: {
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
      },
    },
  });

  const trainerIds = favorites.map((f) => f.trainerId!);
  if (trainerIds.length === 0) return [];

  const trainerHorses = await prisma.horse.findMany({
    where: { trainerId: { in: trainerIds } },
    select: { id: true, trainerId: true },
  });

  const horseToTrainer: Record<string, string> = {};
  for (const h of trainerHorses) {
    if (h.trainerId) horseToTrainer[h.id] = h.trainerId;
  }
  const allHorseIds = trainerHorses.map((h) => h.id);

  const bets =
    allHorseIds.length > 0
      ? await prisma.bet.findMany({
          where: { userId, raceEntry: { horseId: { in: allHorseIds } } },
          include: { raceEntry: { select: { horseId: true } } },
        })
      : [];

  const betsByTrainer: Record<string, { total: number; settledStake: number; settledPayout: number }> = {};
  for (const bet of bets) {
    const trainerId = horseToTrainer[bet.raceEntry.horseId];
    if (!trainerId) continue;
    if (!betsByTrainer[trainerId]) betsByTrainer[trainerId] = { total: 0, settledStake: 0, settledPayout: 0 };
    betsByTrainer[trainerId].total++;
    if (bet.result !== null) {
      betsByTrainer[trainerId].settledStake += bet.stake;
      betsByTrainer[trainerId].settledPayout += bet.payout ?? 0;
    }
  }

  return favorites
    .filter((f) => f.trainer != null)
    .map((f) => {
      const t = f.trainer!;
      const positions = t.horses.flatMap((h) => h.raceEntries.map((e) => e.finishPos!));
      const wins = positions.filter((p) => p === 1).length;
      const stats = betsByTrainer[t.id];
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
        betsPlaced: stats?.total ?? 0,
        roi:
          stats && stats.settledStake > 0
            ? ((stats.settledPayout - stats.settledStake) / stats.settledStake) * 100
            : null,
      };
    })
    .sort((a, b) => b.wins - a.wins);
}

export default async function TrainersPage(props: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const searchParams = await props.searchParams;
  const search = searchParams.search ?? "";
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10));
  const skip = (page - 1) * LIMIT;

  const session = await auth();

  const [{ items: trainers, total }, favoriteTrainers] = await Promise.all([
    getTrainers(search, skip),
    session?.user?.id ? getFavoriteTrainers(session.user.id) : Promise.resolve(null),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 flex flex-col gap-8">

      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="display-xl" style={{ color: "var(--green-900)" }}>Trainers</h1>
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

      {favoriteTrainers !== null && (
        <div className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold tracking-widest uppercase" style={{ color: "var(--text-secondary)" }}>
            ★ Followed Trainers
          </h2>
          <GlassCard variant="default" radius="xl" padding="md">
            <TrainersTable
              trainers={favoriteTrainers}
              showBetStats
              emptyMessage="You haven't followed any trainers yet. Click Follow on a trainer's page to track it here."
            />
          </GlassCard>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xs font-semibold tracking-widest uppercase" style={{ color: "var(--text-secondary)" }}>
            All Trainers
          </h2>
          <Suspense fallback={null}>
            <SearchBar placeholder="Search trainers…" />
          </Suspense>
        </div>
        <GlassCard variant="default" radius="xl" padding="md">
          <TrainersTable trainers={trainers} emptyMessage={search ? "No trainers match your search." : "No trainers registered yet."} />
          <Pagination page={page} totalPages={totalPages} total={total} limit={LIMIT} search={search} basePath="/trainers" />
        </GlassCard>
      </div>

    </main>
  );
}
