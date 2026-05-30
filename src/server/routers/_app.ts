import { createTRPCRouter } from "@/server/api/trpc";
import { horsesRouter } from "./horses";
import { racesRouter } from "./races";
import { jockeysRouter } from "./jockeys";
import { trainersRouter } from "./trainers";
import { favoritesRouter } from "./favorites";
import { betsRouter } from "./bets";
import { notesRouter } from "./notes";
import { searchRouter } from "./search";

export const appRouter = createTRPCRouter({
  horses: horsesRouter,
  races: racesRouter,
  jockeys: jockeysRouter,
  trainers: trainersRouter,
  favorites: favoritesRouter,
  bets: betsRouter,
  notes: notesRouter,
  search: searchRouter,
});

export type AppRouter = typeof appRouter;
