import { inngest } from "./client";
import { scrapeUpcomingRaces } from "@/scrapers/races";
import { scrapeResults, scrapeResultsToday } from "@/scrapers/results";

/** Daily 06:00 UTC — full upcoming race schedule sync */
export const scrapeRacesCron = inngest.createFunction(
  { id: "scrape-upcoming-races", name: "Scrape Upcoming Races", triggers: [{ cron: "0 6 * * *" }] },
  async ({ step }) => step.run("fetch-and-upsert-races", scrapeUpcomingRaces),
);

/** Daily 06:00 UTC — full results backfill (~10 recent race days) */
export const scrapeResultsCron = inngest.createFunction(
  { id: "scrape-race-results", name: "Scrape Race Results (Full)", triggers: [{ cron: "0 6 * * *" }] },
  async ({ step }) => step.run("fetch-and-upsert-results", scrapeResults),
);

/**
 * Every 10 minutes — today-only results sync for live race days.
 * Only fetches ~10 URLs (today's meetings + their detail pages),
 * so it's a fast no-op on non-race days.
 */
export const scrapeRaceDayCron = inngest.createFunction(
  { id: "scrape-race-day-live", name: "Scrape Race Day (Live)", triggers: [{ cron: "*/10 * * * *" }] },
  async ({ step }) => step.run("fetch-today-results", scrapeResultsToday),
);
