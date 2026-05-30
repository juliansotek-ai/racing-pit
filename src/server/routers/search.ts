import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";

export const searchRouter = createTRPCRouter({
  query: publicProcedure
    .input(z.object({ q: z.string().min(2) }))
    .query(async ({ ctx, input }) => {
      const { q } = input;
      const nameFilter = { contains: q, mode: "insensitive" as const };

      const [horses, jockeys, trainers, races] = await Promise.all([
        ctx.prisma.horse.findMany({
          where: { name: nameFilter },
          select: {
            id: true,
            name: true,
            gender: true,
            country: { select: { name: true } },
            trainer: { select: { id: true, name: true } },
          },
          orderBy: { name: "asc" },
          take: 5,
        }),
        ctx.prisma.jockey.findMany({
          where: { name: nameFilter },
          select: {
            id: true,
            name: true,
            country: { select: { name: true } },
          },
          orderBy: { name: "asc" },
          take: 5,
        }),
        ctx.prisma.trainer.findMany({
          where: { name: nameFilter },
          select: {
            id: true,
            name: true,
            country: { select: { name: true } },
          },
          orderBy: { name: "asc" },
          take: 5,
        }),
        ctx.prisma.race.findMany({
          where: { name: nameFilter },
          select: {
            id: true,
            name: true,
            scheduledAt: true,
            raceClass: true,
            status: true,
            racecourse: { select: { name: true, city: true } },
          },
          orderBy: { scheduledAt: "desc" },
          take: 5,
        }),
      ]);

      return { horses, jockeys, trainers, races };
    }),
});
