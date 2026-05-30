/**
 * Scraper for race results from galopp.org (or galopp-sport.de)
 *
 * SELECTOR VERIFICATION:
 *   Set DEBUG_SCRAPER=1 in your environment to dump raw HTML from each fetch.
 *   Then inspect the output to confirm or update the SEL constants below.
 *
 * USAGE:
 *   npx tsx src/scrapers/results.ts          # run once immediately
 *   DEBUG_SCRAPER=1 npx tsx src/scrapers/results.ts  # dump HTML for inspection
 */

import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";
import { prisma } from "@/lib/prisma";

// galopp.org redirects / may use a subdomain — update if needed after inspection
const BASE_URL = "https://www.galopp.org";
const RESULTS_PATH = "/de/rennen/ergebnisse"; // TODO: verify this path against the live site

// ─── Selectors ────────────────────────────────────────────────────────────────
// Ordered candidate lists — the first match wins.
// Update after inspecting live HTML with DEBUG_SCRAPER=1.
const SEL = {
  // Results index page: links to individual race-day result pages
  meetingLink: [
    ".ergebnis-tag a",
    ".renntag-ergebnis a",
    "a[href*='/ergebnis']",
    "a[href*='/rennen/']",
    ".meeting-result a",
    "table.ergebnisse tbody tr td a",
  ],

  // Race result block on a meeting-results page
  raceBlock: [
    ".rennen-ergebnis",
    ".ergebnis-block",
    ".race-result",
    "div[id^='rennen-']",
    "div[id^='race-']",
  ],

  // Within a raceBlock: meta data
  raceTitle: [".rennen-title", ".race-title", "h2", "h3"],
  raceDate: [".datum", ".date", ".rennzeit"],
  raceVenue: [".ort", ".venue", ".rennbahn"],
  raceDistance: [".distanz", ".distance"],
  raceClass: [".kategorie", ".klasse", ".class"],
  raceExternalId: ["[data-rennen-id]", "[data-race-id]", "[id]"],

  // Within a raceBlock: result rows
  resultRow: [
    "table.ergebnis tbody tr",
    "table.result tbody tr",
    ".ergebnis-zeile",
    "tbody tr",
  ],
  // Columns — if the site uses positional <td>s adjust nth-child values
  finishPos: [".platz", "td.platz", "td:nth-child(1)"],
  horseName: [".pferd a", ".horse a", "td.pferd a", "td:nth-child(2) a", "td:nth-child(2)"],
  horseLink: [".pferd a", ".horse a", "td.pferd a", "td:nth-child(2) a"],
  jockeyName: [".jockey", "td.jockey", "td:nth-child(3)"],
  trainerName: [".trainer", "td.trainer", "td:nth-child(4)"],
  weight: [".gewicht", "td.gewicht", "td:nth-child(5)"],
  odds: [".quote", ".odds", "td.quote", "td:nth-child(6)"],
  finishTime: [".zeit", ".time", "td.zeit", "td:nth-child(7)"],
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

function firstText($: cheerio.CheerioAPI, ctx: cheerio.Cheerio<AnyNode>, selectors: readonly string[]): string {
  for (const sel of selectors) {
    const text = $(ctx).find(sel).first().text().trim();
    if (text) return text;
  }
  return "";
}

function firstAttr($: cheerio.CheerioAPI, ctx: cheerio.Cheerio<AnyNode>, selectors: readonly string[], attr: string): string {
  for (const sel of selectors) {
    const val = $(ctx).find(sel).first().attr(attr)?.trim() ?? $(ctx).filter(sel).first().attr(attr)?.trim();
    if (val) return val;
  }
  return "";
}

function parseGermanDate(raw: string): Date | null {
  const match = raw.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})(?:[^\d]+(\d{1,2}):(\d{2}))?/);
  if (!match) return null;
  const [, day, month, year, hour = "0", min = "0"] = match;
  return new Date(
    Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(min))
  );
}

function parseOdds(raw: string): number | null {
  // German format: "3,5" or "3.5" or "7/2"
  if (raw.includes("/")) {
    const [n, d] = raw.split("/").map(Number);
    return d ? n / d : null;
  }
  const n = parseFloat(raw.replace(",", ".").replace(/[^\d.]/g, ""));
  return isNaN(n) ? null : n;
}

function parseFinishTime(raw: string): number | null {
  // Formats: "1:28.50" (mm:ss.ms) or "88.50" (seconds)
  const colonMatch = raw.match(/(\d+):(\d+)\.?(\d*)/);
  if (colonMatch) {
    const [, mins, secs, ms = "0"] = colonMatch;
    return Number(mins) * 60 + Number(secs) + Number(ms) / Math.pow(10, ms.length);
  }
  const n = parseFloat(raw.replace(",", "."));
  return isNaN(n) ? null : n;
}

function parseDistance(raw: string): number | null {
  const n = Number(raw.replace(/[^\d]/g, ""));
  return n > 0 ? n : null;
}

function parsePosition(raw: string): number | null {
  const n = parseInt(raw.replace(/\D/g, ""), 10);
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

async function upsertRacecourse(name: string): Promise<string> {
  const externalId = `galopp-${name.toLowerCase().replace(/\s+/g, "-")}`;
  const countryId = await getGermanyId();
  const rc = await prisma.racecourse.upsert({
    where: { externalId },
    create: { externalId, name, city: name, countryId },
    update: { name },
  });
  return rc.id;
}

async function upsertJockey(name: string, linkHref: string): Promise<string> {
  const externalId = linkHref
    ? `galopp-jockey-${linkHref.split("/").filter(Boolean).pop()}`
    : `galopp-jockey-${name.toLowerCase().replace(/\s+/g, "-")}`;
  const countryId = await getGermanyId();
  const j = await prisma.jockey.upsert({
    where: { externalId },
    create: { externalId, name, countryId },
    update: { name },
  });
  return j.id;
}

async function upsertTrainer(name: string): Promise<string> {
  const externalId = `galopp-trainer-${name.toLowerCase().replace(/\s+/g, "-")}`;
  const countryId = await getGermanyId();
  const t = await prisma.trainer.upsert({
    where: { externalId },
    create: { externalId, name, countryId },
    update: { name },
  });
  return t.id;
}

async function upsertHorse(name: string, linkHref: string, trainerId?: string): Promise<string> {
  const externalId = linkHref
    ? `galopp-horse-${linkHref.split("/").filter(Boolean).pop()}`
    : `galopp-horse-${name.toLowerCase().replace(/\s+/g, "-")}`;
  const countryId = await getGermanyId();
  const h = await prisma.horse.upsert({
    where: { externalId },
    create: { externalId, name, countryId, trainerId },
    update: { name, ...(trainerId ? { trainerId } : {}) },
  });
  return h.id;
}

// ─── Parsed types ─────────────────────────────────────────────────────────────

interface ParsedEntry {
  finishPos: number | null;
  horseName: string;
  horseLink: string;
  jockeyName: string;
  trainerName: string;
  weight: number | null;
  odds: number | null;
  finishTime: number | null;
}

interface ParsedRaceResult {
  externalId: string;
  name: string;
  venueName: string;
  scheduledAt: Date | null;
  distance: number | null;
  raceClass: string | null;
  entries: ParsedEntry[];
}

// ─── Scraping logic ───────────────────────────────────────────────────────────

async function fetchMeetingResultUrls(): Promise<string[]> {
  const url = `${BASE_URL}${RESULTS_PATH}`;
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);
  const urls = new Set<string>();

  const linkSel = SEL.meetingLink.join(", ");
  $(linkSel).each((_, el) => {
    let href = $(el).attr("href")?.trim();
    if (!href) return;
    if (!href.startsWith("http")) {
      href = `${BASE_URL}${href.startsWith("/") ? "" : "/"}${href}`;
    }
    urls.add(href);
  });

  if (DEBUG) console.log(`Found ${urls.size} result meeting URL(s).`);
  // Limit to the 7 most recent days to avoid hammering the server
  return Array.from(urls).slice(0, 7);
}

function parseResultsPage(html: string, sourceUrl: string): ParsedRaceResult[] {
  const $ = cheerio.load(html);
  const results: ParsedRaceResult[] = [];
  const blockSel = SEL.raceBlock.join(", ");

  $(blockSel).each((blockIdx, blockEl) => {
    const $block = $(blockEl);

    const name = firstText($, $block, SEL.raceTitle) || `Rennen ${blockIdx + 1}`;
    const dateRaw = firstText($, $block, SEL.raceDate);
    const venue = firstText($, $block, SEL.raceVenue);
    const distRaw = firstText($, $block, SEL.raceDistance);
    const classRaw = firstText($, $block, SEL.raceClass);

    // Build externalId from the source URL + block index as fallback
    const blockId = $block.attr("id") || $block.attr("data-rennen-id") || $block.attr("data-race-id") || `${blockIdx}`;
    const urlSlug = sourceUrl.split("/").filter(Boolean).pop() ?? "unknown";
    const externalId = `galopp-${urlSlug}-${blockId}`;

    const entries: ParsedEntry[] = [];
    const rowSel = SEL.resultRow.join(", ");

    $block.find(rowSel).each((_, rowEl) => {
      const $row = $(rowEl);

      // Skip header rows
      if ($row.find("th").length > 0) return;

      const horseName = firstText($, $row, SEL.horseName);
      if (!horseName) return; // skip empty / header rows

      const horseLink = firstAttr($, $row, SEL.horseLink, "href");
      const jockeyName = firstText($, $row, SEL.jockeyName);
      const trainerName = firstText($, $row, SEL.trainerName);
      const posRaw = firstText($, $row, SEL.finishPos);
      const weightRaw = firstText($, $row, SEL.weight);
      const oddsRaw = firstText($, $row, SEL.odds);
      const timeRaw = firstText($, $row, SEL.finishTime);

      entries.push({
        finishPos: parsePosition(posRaw),
        horseName,
        horseLink,
        jockeyName,
        trainerName,
        weight: parseFloat(weightRaw) || null,
        odds: parseOdds(oddsRaw),
        finishTime: parseFinishTime(timeRaw),
      });
    });

    if (entries.length === 0) return; // skip blocks with no rows

    results.push({
      externalId,
      name,
      venueName: venue || "Unbekannt",
      scheduledAt: parseGermanDate(dateRaw),
      distance: parseDistance(distRaw),
      raceClass: classRaw || null,
      entries,
    });
  });

  if (DEBUG) console.log(`  Parsed ${results.length} race result block(s) from ${sourceUrl}`);
  return results;
}

async function persistResult(result: ParsedRaceResult): Promise<number> {
  let racecourseId: string;
  try {
    racecourseId = await upsertRacecourse(result.venueName);
  } catch (err) {
    console.error(`Failed to upsert racecourse ${result.venueName}:`, err);
    return 0;
  }

  // Find or create the Race record, keyed by externalId
  let race = await prisma.race.findUnique({ where: { externalId: result.externalId } });

  if (!race) {
    // Try to match by name + venue + date (within 1 day) if externalId doesn't exist yet
    if (result.scheduledAt) {
      const dayStart = new Date(result.scheduledAt);
      dayStart.setUTCHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

      race = await prisma.race.findFirst({
        where: {
          name: result.name,
          racecourseId,
          scheduledAt: { gte: dayStart, lt: dayEnd },
        },
      });
    }
  }

  if (!race) {
    race = await prisma.race.create({
      data: {
        externalId: result.externalId,
        name: result.name,
        racecourseId,
        scheduledAt: result.scheduledAt ?? new Date(),
        distance: result.distance ?? 0,
        raceClass: result.raceClass,
        status: "COMPLETED",
      },
    });
  } else {
    // Mark existing race as completed and update distance/class if missing
    await prisma.race.update({
      where: { id: race.id },
      data: {
        status: "COMPLETED",
        ...(result.distance && !race.distance ? { distance: result.distance } : {}),
        ...(result.raceClass && !race.raceClass ? { raceClass: result.raceClass } : {}),
        ...(result.externalId && !race.externalId ? { externalId: result.externalId } : {}),
      },
    });
  }

  let persisted = 0;
  for (const entry of result.entries) {
    if (!entry.horseName) continue;

    try {
      let trainerId: string | undefined;
      if (entry.trainerName) {
        trainerId = await upsertTrainer(entry.trainerName);
      }
      const horseId = await upsertHorse(entry.horseName, entry.horseLink, trainerId);

      let jockeyId: string | undefined;
      if (entry.jockeyName) {
        jockeyId = await upsertJockey(entry.jockeyName, "");
      }

      await prisma.raceEntry.upsert({
        where: { raceId_horseId: { raceId: race!.id, horseId } },
        create: {
          raceId: race!.id,
          horseId,
          jockeyId,
          finishPos: entry.finishPos,
          finishTime: entry.finishTime,
          odds: entry.odds,
          weight: entry.weight,
        },
        update: {
          jockeyId,
          finishPos: entry.finishPos,
          finishTime: entry.finishTime,
          odds: entry.odds,
          weight: entry.weight,
        },
      });
      persisted++;
    } catch (err) {
      console.error(`Failed to persist entry ${entry.horseName} in race ${race!.id}:`, err);
    }
  }

  return persisted;
}

// ─── Public entry point ───────────────────────────────────────────────────────

export async function scrapeResults(): Promise<{ races: number; entries: number; skipped: number }> {
  let totalRaces = 0;
  let totalEntries = 0;
  let skipped = 0;

  let meetingUrls: string[];
  try {
    meetingUrls = await fetchMeetingResultUrls();
  } catch (err) {
    console.error("Failed to fetch result meeting list:", err);
    return { races: 0, entries: 0, skipped: 1 };
  }

  for (const meetingUrl of meetingUrls) {
    let html: string;
    try {
      html = await fetchHtml(meetingUrl);
    } catch (err) {
      console.error(`Failed to fetch ${meetingUrl}:`, err);
      skipped++;
      continue;
    }

    const parsed = parseResultsPage(html, meetingUrl);

    for (const result of parsed) {
      try {
        const count = await persistResult(result);
        totalRaces++;
        totalEntries += count;
      } catch (err) {
        console.error(`Failed to persist result ${result.externalId}:`, err);
        skipped++;
      }
    }

    // Polite crawl delay
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log(`scrapeResults: races=${totalRaces} entries=${totalEntries} skipped=${skipped}`);
  return { races: totalRaces, entries: totalEntries, skipped };
}

// ─── CLI entry ────────────────────────────────────────────────────────────────

if (require.main === module) {
  scrapeResults()
    .then((r) => { console.log(r); process.exit(0); })
    .catch((e) => { console.error(e); process.exit(1); });
}
