import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { scrapeRacesCron, scrapeResultsCron, scrapeRaceDayCron } from "@/inngest/functions";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [scrapeRacesCron, scrapeResultsCron, scrapeRaceDayCron],
});
