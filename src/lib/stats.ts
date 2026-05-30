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

export async function getUpcomingRaces(limit = 6) {
  return prisma.race.findMany({
    where: { status: "SCHEDULED", scheduledAt: { gte: new Date() } },
    include: {
      racecourse: { select: { name: true, city: true } },
      entries: { select: { id: true } },
    },
    orderBy: { scheduledAt: "asc" },
    take: limit,
  });
}
