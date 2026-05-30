import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

const entityInput = z.object({
  horseId: z.string().optional(),
  jockeyId: z.string().optional(),
  trainerId: z.string().optional(),
});

export const favoritesRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.favorite.findMany({
      where: { userId: ctx.session.user.id },
      include: { horse: true, jockey: true, trainer: true },
    });
  }),

  toggle: protectedProcedure
    .input(entityInput)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const existing = await ctx.prisma.favorite.findFirst({
        where: { userId, ...input },
      });
      if (existing) {
        await ctx.prisma.favorite.delete({ where: { id: existing.id } });
        return { favorited: false };
      }
      await ctx.prisma.favorite.create({ data: { userId, ...input } });
      return { favorited: true };
    }),
});
