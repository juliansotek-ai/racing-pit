import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const betsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        horseId: z.string().optional(),
        jockeyId: z.string().optional(),
        trainerId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.prisma.bet.findMany({
        where: {
          userId: ctx.session.user.id,
          raceEntry: {
            horseId: input.horseId,
            jockeyId: input.jockeyId,
          },
        },
        include: {
          raceEntry: {
            include: {
              race: { include: { racecourse: true } },
              horse: true,
              jockey: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  place: protectedProcedure
    .input(
      z.object({
        raceEntryId: z.string(),
        betType: z.enum(["WIN", "PLACE", "EACH_WAY"]),
        stake: z.number().positive(),
        oddsAtBet: z.number().positive(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.bet.create({
        data: { userId: ctx.session.user.id, ...input },
      });
    }),

  stats: protectedProcedure.query(async ({ ctx }) => {
    const bets = await ctx.prisma.bet.findMany({
      where: { userId: ctx.session.user.id, result: { not: null } },
    });
    type Bet = (typeof bets)[number];
    const totalStake = bets.reduce((s: number, b: Bet) => s + b.stake, 0);
    const totalPayout = bets.reduce((s: number, b: Bet) => s + (b.payout ?? 0), 0);
    const wins = bets.filter((b: Bet) => b.result === "WON").length;
    return {
      totalBets: bets.length,
      wins,
      winRate: bets.length ? wins / bets.length : 0,
      totalStake,
      totalPayout,
      roi: totalStake ? (totalPayout - totalStake) / totalStake : 0,
    };
  }),
});
