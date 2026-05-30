import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

const entityInput = z.object({
  horseId: z.string().optional(),
  jockeyId: z.string().optional(),
  trainerId: z.string().optional(),
});

export const notesRouter = createTRPCRouter({
  get: protectedProcedure
    .input(entityInput)
    .query(async ({ ctx, input }) => {
      return ctx.prisma.note.findFirst({
        where: { userId: ctx.session.user.id, ...input },
      });
    }),

  upsert: protectedProcedure
    .input(entityInput.extend({ content: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { content, ...entity } = input;
      const userId = ctx.session.user.id;
      const existing = await ctx.prisma.note.findFirst({
        where: { userId, ...entity },
      });
      if (existing) {
        return ctx.prisma.note.update({
          where: { id: existing.id },
          data: { content },
        });
      }
      return ctx.prisma.note.create({ data: { userId, content, ...entity } });
    }),

  delete: protectedProcedure
    .input(entityInput)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const existing = await ctx.prisma.note.findFirst({
        where: { userId, ...input },
      });
      if (existing) {
        await ctx.prisma.note.delete({ where: { id: existing.id } });
      }
      return { deleted: true };
    }),
});
