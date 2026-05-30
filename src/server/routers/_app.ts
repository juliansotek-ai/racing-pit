import { createTRPCRouter } from "@/server/api/trpc";
import { horsesRouter } from "./horses";
import { racesRouter } from "./races";
import { jockeysRouter } from "./jockeys";
import { trainersRouter } from "./trainers";
import { favoritesRouter } from "./favorites";
import { betsRouter } from "./bets";

export const appRouter = createTRPCRouter({
  horses: horsesRouter,
  races: racesRouter,
  jockeys: jockeysRouter,
  trainers: trainersRouter,
  favorites: favoritesRouter,
  bets: betsRouter,
});

export type AppRouter = typeof appRouter;
