/**
 * Scraper for upcoming races from rennliste.de
 *
 * SELECTOR VERIFICATION:
 *   Set DEBUG_SCRAPER=1 in your environment to dump raw HTML from each fetch.
 *   Then inspect the output to confirm or update the SEL constants below.
 *
 * USAGE:
 *   npx tsx src/scrapers/races.ts          # run once immediately
 *   DEBUG_SCRAPER=1 npx tsx src/scrapers/races.ts  # dump HTML for inspection
 */

import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";
import { prisma } from "@/lib/prisma";

const BASE_URL = "https://www.rennliste.de";

// ─── Selectors ────────────────────────────────────────────────────────────────
// Each value is an ordered list of candidates — the first match wins.
// Update these after inspecting the live site with DEBUG_SCRAPER=1.
const SEL = {
  // Listing page: one entry per upcoming race day
  meetingRow: [".renntag", "tr.renntag", ".meeting-item", "table.renntage tbody tr"],
  meetingLink: ["a.renntag-link", "a[href*='/renntag']", "td:first-child a", "a"],
  meetingDate: [".datum", "td.datum", ".date", "td:nth-child(1)"],
  meetingVenue: [".ort", "td.ort", ".venue", "td:nth-child(2)"],

  // Detail page: one entry per race in the meeting
  raceRow: [".rennen", "tr.rennen", ".race-row", "table.rennen tbody tr", "tbody tr"],
  raceNumber: [".nr", "td.nr", "td:nth-child(1)"],
  raceName: [".name", ".rennen-name", "td.name", "td:nth-child(2) a", "td:nth-child(2)"],
  raceTime: [".startzeit", ".uhrzeit", "td.startzeit", "td:nth-child(3)"],
  raceDistance: [".distanz", "td.distanz", "td:nth-child(4)"],
  raceClass: [".kategorie", ".klasse", "td.kategorie", "td:nth-child(5)"],
  racePrize: [".dotierung", ".preis", "td.dotierung", "td:nth-child(6)"],
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DEBUG = process.env.DEBUG_SCRAPER === "1";

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; RacingPitBot/1.0; +https://racing-pit.vercel.app)",
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "de,en;q=0.8",
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const html = await res.text();
  if (DEBUG) {
    console.log(`\n=== HTML dump: ${url} ===\n${html.slice(0, 8000)}\n`);
  }
  return html;
}

/** Return first text match from a list of CSS selectors. */
function firstText($: cheerio.CheerioAPI, ctx: cheerio.Cheerio<AnyNode>, selectors: readonly string[]): string {
  for (const sel of selectors) {
    const text = $(ctx).find(sel).first().text().trim();
    if (text) return text;
  }
  return "";
}

/** Return first attribute match from a list of CSS selectors. */
function firstAttr($: cheerio.CheerioAPI, ctx: cheerio.Cheerio<AnyNode>, selectors: readonly string[], attr: string): string {
  for (const sel of selectors) {
    const val = $(ctx).find(sel).first().attr(attr)?.trim();
    if (val) return val;
  }
  return "";
}

// ─── Parse helpers ────────────────────────────────────────────────────────────

/**
 * Parse a German date string like "31.05.2026" or "Sonntag, 31.05.2026 14:00"
 * into a JavaScript Date object (UTC).
 */
function parseGermanDate(raw: string): Date | null {
  const match = raw.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})(?:[^\d]+(\d{1,2}):(\d{2}))?/);
  if (!match) return null;
  const [, day, month, year, hour = "0", min = "0"] = match;
  return new Date(
    Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(min))
  );
}

/** Parse "1400m", "1.400 m", "1400" → metres as number. */
function parseDistance(raw: string): number | null {
  const n = Number(raw.replace(/[^\d]/g, ""));
  return n > 0 ? n : null;
}

/** Parse "100.000 €", "€ 50,000", "50000" → float. */
function parsePrize(raw: string): number | null {
  const n = parseFloat(raw.replace(/[^\d,.-]/g, "").replace(",", "."));
  return isNaN(n) ? null : n;
}

// ─── DB helpers ───────────────────────────────────────────────────────────────

let _germanyId: string | null = null;
async function getGermanyId(): Promise<string> {
  if (_germanyId) return _germanyId;
  const country = await prisma.country.upsert({
    where: { code: "DE" },
    create: { code: "DE", name: "Deutschland" },
    update: {},
  });
  _germanyId = country.id;
  return country.id;
}

async function upsertRacecourse(name: string, city: string): Promise<string> {
  // Use a slug as externalId so the same venue always resolves to one row.
  const externalId = `rennliste-${name.toLowerCase().replace(/\s+/g, "-")}`;
  const countryId = await getGermanyId();
  const rc = await prisma.racecourse.upsert({
    where: { externalId },
    create: { externalId, name, city: city || name, countryId },
    update: { name, city: city || name },
  });
  return rc.id;
}

// ─── Core scraping logic ──────────────────────────────────────────────────────

interface MeetingRef {
  url: string;
  date: string;
  venue: string;
}

async function fetchMeetingList(): Promise<MeetingRef[]> {
  const html = await fetchHtml(`${BASE_URL}/`);
  const $ = cheerio.load(html);
  const meetings: MeetingRef[] = [];

  const rowSel = SEL.meetingRow.join(", ");
  $(rowSel).each((_, el) => {
    const $el = $(el);
    let href = firstAttr($, $el, SEL.meetingLink, "href");
    if (!href) return;
    if (!href.startsWith("http")) href = `${BASE_URL}${href.startsWith("/") ? "" : "/"}${href}`;

    const date = firstText($, $el, SEL.meetingDate) || $el.text().trim();
    const venue = firstText($, $el, SEL.meetingVenue);

    if (href && date) meetings.push({ url: href, date, venue });
  });

  if (DEBUG) console.log(`Found ${meetings.length} meeting(s):`, meetings);
  return meetings;
}

interface ParsedRace {
  externalId: string;
  name: string;
  scheduledAt: Date;
  distance: number | null;
  raceClass: string | null;
  prize: number | null;
}

async function fetchMeetingRaces(meeting: MeetingRef): Promise<ParsedRace[]> {
  const html = await fetchHtml(meeting.url);
  const $ = cheerio.load(html);
  const races: ParsedRace[] = [];

  const baseDate = parseGermanDate(meeting.date);
  const rowSel = SEL.raceRow.join(", ");

  $(rowSel).each((_, el) => {
    const $el = $(el);
    const raceNo = firstText($, $el, SEL.raceNumber);
    const name = firstText($, $el, SEL.raceName);
    const timeStr = firstText($, $el, SEL.raceTime);
    const distStr = firstText($, $el, SEL.raceDistance);
    const classStr = firstText($, $el, SEL.raceClass);
    const prizeStr = firstText($, $el, SEL.racePrize);

    if (!name || name.toLowerCase().includes("rennen") === false && !raceNo) return;

    // Build scheduledAt from baseDate + time on the page, or from a combined string
    let scheduledAt = baseDate;
    if (!scheduledAt) {
      scheduledAt = parseGermanDate(timeStr) ?? new Date();
    } else if (timeStr) {
      const timeParsed = parseGermanDate(`${meeting.date} ${timeStr}`);
      if (timeParsed) scheduledAt = timeParsed;
    }

    // External ID: venue + date + race number (stable across re-scrapes)
    const slug = meeting.venue.toLowerCase().replace(/\s+/g, "-");
    const dateStr = scheduledAt.toISOString().slice(0, 10);
    const externalId = `rennliste-${slug}-${dateStr}-r${raceNo || races.length + 1}`;

    races.push({
      externalId,
      name: name || `Rennen ${raceNo}`,
      scheduledAt,
      distance: parseDistance(distStr),
      raceClass: classStr || null,
      prize: parsePrize(prizeStr),
    });
  });

  if (DEBUG) console.log(`  → ${races.length} race(s) in meeting ${meeting.venue} ${meeting.date}`);
  return races;
}

// ─── Public entry point ───────────────────────────────────────────────────────

export async function scrapeUpcomingRaces(): Promise<{ upserted: number; skipped: number }> {
  let upserted = 0;
  let skipped = 0;

  const meetings = await fetchMeetingList();

  for (const meeting of meetings) {
    let racecourseId: string;
    try {
      // Venue name might be in the meeting object or needs to be parsed from detail page
      const venueName = meeting.venue || "Unbekannt";
      racecourseId = await upsertRacecourse(venueName, venueName);
    } catch (err) {
      console.error(`Failed to upsert racecourse for ${meeting.venue}:`, err);
      skipped++;
      continue;
    }

    let races: ParsedRace[];
    try {
      races = await fetchMeetingRaces(meeting);
    } catch (err) {
      console.error(`Failed to fetch meeting ${meeting.url}:`, err);
      skipped++;
      continue;
    }

    for (const race of races) {
      try {
        await prisma.race.upsert({
          where: { externalId: race.externalId },
          create: {
            externalId: race.externalId,
            name: race.name,
            racecourseId,
            scheduledAt: race.scheduledAt,
            distance: race.distance ?? 0,
            raceClass: race.raceClass,
            prize: race.prize,
            status: "SCHEDULED",
          },
          update: {
            name: race.name,
            scheduledAt: race.scheduledAt,
            distance: race.distance ?? 0,
            raceClass: race.raceClass,
            prize: race.prize,
          },
        });
        upserted++;
      } catch (err) {
        console.error(`Failed to upsert race ${race.externalId}:`, err);
        skipped++;
      }
    }

    // Polite crawl delay between meeting pages
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log(`scrapeUpcomingRaces: upserted=${upserted} skipped=${skipped}`);
  return { upserted, skipped };
}

// ─── CLI entry ────────────────────────────────────────────────────────────────

if (require.main === module) {
  scrapeUpcomingRaces()
    .then((r) => { console.log(r); process.exit(0); })
    .catch((e) => { console.error(e); process.exit(1); });
}
