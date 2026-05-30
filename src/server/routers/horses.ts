import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";

export const horsesRouter = createTRPCRouter({
  list: publicProcedure
    .input(
      z.object({
        search: z.string().optional(),
        trainerId: z.string().optional(),
        countryId: z.string().optional(),
        cursor: z.string().optional(),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const { search, trainerId, countryId, cursor, limit } = input;
      const items = await ctx.prisma.horse.findMany({
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        where: {
          trainerId,
          countryId,
          name: search ? { contains: search, mode: "insensitive" } : undefined,
        },
        include: { trainer: true, country: true },
        orderBy: { name: "asc" },
      });
      const nextCursor = items.length > limit ? items.pop()!.id : undefined;
      return { items, nextCursor };
    }),

  byId: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.horse.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          trainer: true,
          country: true,
          raceEntries: {
            include: { race: { include: { racecourse: true } }, jockey: true },
            orderBy: { race: { scheduledAt: "desc" } },
          },
        },
      });
    }),
});
