import { prisma } from "@/lib/prisma";

function avg(nums: number[]) {
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export async function getTopHorses(limit = 10) {
  const horses = await prisma.horse.findMany({
    include: {
      trainer: { select: { id: true, name: true } },
      raceEntries: {
        where: { finishPos: { not: null } },
        select: { finishPos: true },
      },
    },
  });

  return horses
    .map((horse) => {
      const positions = horse.raceEntries.map((e) => e.finishPos!);
      if (positions.length === 0) return null;
      return {
        id: horse.id,
        name: horse.name,
        trainer: horse.trainer ? { id: horse.trainer.id, name: horse.trainer.name } : null,
        totalRaces: positions.length,
        wins: positions.filter((p) => p === 1).length,
        avgPosition: avg(positions),
        bestPosition: Math.min(...positions),
      };
    })
    .filter((h): h is NonNullable<typeof h> => h !== null)
    .sort((a, b) => a.avgPosition - b.avgPosition)
    .slice(0, limit);
}

export async function getTopJockeys(limit = 10) {
  const jockeys = await prisma.jockey.findMany({
    include: {
      raceEntries: {
        where: { finishPos: { not: null } },
        select: { finishPos: true },
      },
    },
  });

  return jockeys
    .map((jockey) => {
      const positions = jockey.raceEntries.map((e) => e.finishPos!);
      if (positions.length === 0) return null;
      return {
        id: jockey.id,
        name: jockey.name,
        totalRides: positions.length,
        wins: positions.filter((p) => p === 1).length,
        avgPosition: avg(positions),
        bestPosition: Math.min(...positions),
      };
    })
    .filter((j): j is NonNullable<typeof j> => j !== null)
    .sort((a, b) => a.avgPosition - b.avgPosition)
    .slice(0, limit);
}

export async function getTopTrainers(limit = 10) {
  const trainers = await prisma.trainer.findMany({
    include: {
      horses: {
        include: {
          raceEntries: {
            where: { finishPos: { not: null } },
            select: { finishPos: true },
          },
        },
      },
    },
  });

  return trainers
    .map((trainer) => {
      const positions = trainer.horses
        .flatMap((h) => h.raceEntries)
        .map((e) => e.finishPos!);
      if (positions.length === 0) return null;
      return {
        id: trainer.id,
        name: trainer.name,
        totalRunners: positions.length,
        wins: positions.filter((p) => p === 1).length,
        avgPosition: avg(positions),
        bestPosition: Math.min(...positions),
      };
    })
    .filter((t): t is NonNullable<typeof t> => t !== null)
    .sort((a, b) => a.avgPosition - b.avgPosition)
    .slice(0, limit);
}

export async function getFollowedHorsesRacingToday(userId: string) {
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setUTCDate(todayEnd.getUTCDate() + 1);

  const favorites = await prisma.favorite.findMany({
    where: { userId, horseId: { not: null } },
    select: { horseId: true },
  });

  const horseIds = favorites.map((f) => f.horseId!);
  if (horseIds.length === 0) return [];

  return prisma.raceEntry.findMany({
    where: {
      horseId: { in: horseIds },
      race: {
        scheduledAt: { gte: todayStart, lt: todayEnd },
        status: { in: ["SCHEDULED", "COMPLETED"] },
      },
    },
    include: {
      horse: { select: { id: true, name: true } },
      jockey: { select: { id: true, name: true } },
      race: {
        include: {
          racecourse: { select: { id: true, name: true, city: true } },
        },
      },
    },
    orderBy: { race: { scheduledAt: "asc" } },
  });
}

export async function getUpcomingMeetingsAll(from?: Date, to?: Date) {
  const now = new Date();
  const start = from && from > now ? from : now;

  const toEnd = to ? new Date(to) : undefined;
  if (toEnd) toEnd.setUTCHours(23, 59, 59, 999);

  const races = await prisma.race.findMany({
    where: {
      status: "SCHEDULED",
      scheduledAt: {
        gte: start,
        ...(toEnd ? { lte: toEnd } : {}),
      },
    },
    include: {
      racecourse: { select: { id: true, name: true, city: true } },
      entries: { select: { id: true } },
    },
    orderBy: { scheduledAt: "asc" },
  });

  const map = new Map<
    string,
    {
      date: string;
      racecourseId: string;
      racecourse: { name: string; city: string };
      raceCount: number;
      firstStart: Date;
      totalRunners: number;
    }
  >();

  for (const race of races) {
    const dateStr = new Date(race.scheduledAt).toISOString().slice(0, 10);
    const key = `${dateStr}:${race.racecourseId}`;
    if (!map.has(key)) {
      map.set(key, {
        date: dateStr,
        racecourseId: race.racecourseId,
        racecourse: race.racecourse,
        raceCount: 0,
        firstStart: new Date(race.scheduledAt),
        totalRunners: 0,
      });
    }
    const m = map.get(key)!;
    m.raceCount++;
    m.totalRunners += race.entries.length;
    if (new Date(race.scheduledAt) < m.firstStart) {
      m.firstStart = new Date(race.scheduledAt);
    }
  }

  return Array.from(map.values()).sort(
    (a, b) => a.firstStart.getTime() - b.firstStart.getTime()
  );
}

export async function getUpcomingDateRange() {
  const now = new Date();
  const [first, last] = await Promise.all([
    prisma.race.findFirst({
      where: { status: "SCHEDULED", scheduledAt: { gte: now } },
      orderBy: { scheduledAt: "asc" },
      select: { scheduledAt: true },
    }),
    prisma.race.findFirst({
      where: { status: "SCHEDULED", scheduledAt: { gte: now } },
      orderBy: { scheduledAt: "desc" },
      select: { scheduledAt: true },
    }),
  ]);
  return {
    min: first ? new Date(first.scheduledAt).toISOString().slice(0, 10) : null,
    max: last ? new Date(last.scheduledAt).toISOString().slice(0, 10) : null,
  };
}

export async function getUpcomingMeetings(limit = 6) {
  const races = await prisma.race.findMany({
    where: { status: "SCHEDULED", scheduledAt: { gte: new Date() } },
    include: {
      racecourse: { select: { id: true, name: true, city: true } },
      entries: { select: { id: true } },
    },
    orderBy: { scheduledAt: "asc" },
    take: 300,
  });

  const map = new Map<
    string,
    {
      date: string;
      racecourseId: string;
      racecourse: { name: string; city: string };
      raceCount: number;
      firstStart: Date;
      totalRunners: number;
    }
  >();

  for (const race of races) {
    const dateStr = new Date(race.scheduledAt).toISOString().slice(0, 10);
    const key = `${dateStr}:${race.racecourseId}`;
    if (!map.has(key)) {
      map.set(key, {
        date: dateStr,
        racecourseId: race.racecourseId,
        racecourse: race.racecourse,
        raceCount: 0,
        firstStart: new Date(race.scheduledAt),
        totalRunners: 0,
      });
    }
    const m = map.get(key)!;
    m.raceCount++;
    m.totalRunners += race.entries.length;
    if (new Date(race.scheduledAt) < m.firstStart) {
      m.firstStart = new Date(race.scheduledAt);
    }
  }

  return Array.from(map.values())
    .sort((a, b) => a.firstStart.getTime() - b.firstStart.getTime())
    .slice(0, limit);
}
