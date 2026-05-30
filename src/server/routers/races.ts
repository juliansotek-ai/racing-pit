import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";

export const racesRouter = createTRPCRouter({
  upcoming: publicProcedure
    .input(
      z.object({
        countryId: z.string().optional(),
        cursor: z.string().optional(),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const { countryId, cursor, limit } = input;
      const items = await ctx.prisma.race.findMany({
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        where: {
          scheduledAt: { gte: new Date() },
          status: "SCHEDULED",
          racecourse: countryId ? { countryId } : undefined,
        },
        include: {
          racecourse: { include: { country: true } },
          entries: { include: { horse: true, jockey: true } },
        },
        orderBy: { scheduledAt: "asc" },
      });
      const nextCursor = items.length > limit ? items.pop()!.id : undefined;
      return { items, nextCursor };
    }),

  byId: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.race.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          racecourse: { include: { country: true } },
          entries: {
            include: { horse: { include: { trainer: true } }, jockey: true },
            orderBy: { saddleNo: "asc" },
          },
        },
      });
    }),
});
