import { inngest } from "./client";
import { scrapeUpcomingRaces } from "@/scrapers/races";
import { scrapeResults } from "@/scrapers/results";

/** Runs daily at 06:00 UTC — syncs upcoming race schedule from rennliste.de */
export const scrapeRacesCron = inngest.createFunction(
  {
    id: "scrape-upcoming-races",
    name: "Scrape Upcoming Races",
    triggers: [{ cron: "0 6 * * *" }],
  },
  async ({ step }) => {
    return step.run("fetch-and-upsert-races", scrapeUpcomingRaces);
  }
);

/** Runs every hour — syncs race results from galopp.org */
export const scrapeResultsCron = inngest.createFunction(
  {
    id: "scrape-race-results",
    name: "Scrape Race Results",
    triggers: [{ cron: "0 * * * *" }],
  },
  async ({ step }) => {
    return step.run("fetch-and-upsert-results", scrapeResults);
  }
);
