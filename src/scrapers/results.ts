/**
 * Scraper for race results from galopp-statistik.de
 *
 * Flow: ErgebnisseMenu.php → ResultRenntag.php → DisplayErgebnis.php
 *
 * USAGE:
 *   npx tsx src/scrapers/results.ts
 *   DEBUG_SCRAPER=1 npx tsx src/scrapers/results.ts
 */

import * as cheerio from "cheerio";
import { prisma } from "@/lib/prisma";

const BASE_URL = "https://www.galopp-statistik.de";
const DEBUG = process.env.DEBUG_SCRAPER === "1";

// ─── Venue code → display name map ───────────────────────────────────────────

const VENUE_NAMES: Record<string, string> = {
  Bad: "Baden-Baden", Dob: "Bad Doberan", Hrz: "Bad Harzburg",
  Brem: "Bremen", "Do-S": "Dortmund (Sand)", "Do-T": "Dortmund (Turf)",
  Dres: "Dresden", Düs: "Düsseldorf", Hall: "Halle", Han: "Hannover",
  Ham: "Hamburg", Hop: "Hoppegarten", Köln: "Köln", Kre: "Krefeld",
  Leip: "Leipzig", Mag: "Magdeburg", Man: "Mannheim", Mül: "Mülheim",
  Mün: "München", "Ne-S": "Neuss (Sand)", Saar: "Saarbrücken", Zwe: "Zweibrücken",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; RacingPitBot/1.0; +https://racing-pit.vercel.app)",
      "Accept": "text/html,application/xhtml+xml",
      "Accept-Language": "de-DE,de;q=0.9",
    },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const html = await res.text();
  if (DEBUG) console.log(`\n=== ${url} ===\n${html.slice(0, 3000)}\n`);
  return html;
}

function parseDistance(raw: string): number | null {
  const n = Number(raw.replace(/[^\d]/g, ""));
  return n > 0 ? n : null;
}

function parsePrize(raw: string): number | null {
  // "5000 €" or "5.000 €"
  const n = parseFloat(raw.replace(/[^\d]/g, ""));
  return isNaN(n) || n === 0 ? null : n;
}

function parseOdds(raw: string): number | null {
  const n = parseFloat(raw.replace(",", ".").replace(/[^\d.]/g, ""));
  return isNaN(n) || n === 0 ? null : n;
}

function parseWeight(raw: string): number | null {
  const n = parseFloat(raw.replace(",", ".").replace(/[^\d.]/g, ""));
  return isNaN(n) || n === 0 ? null : n;
}

function parsePosition(raw: string): number | null {
  const n = parseInt(raw.replace(/\D/g, ""), 10);
  return isNaN(n) ? null : n;
}

/** Parse "YYYY-MM-DD" + "HH:MM" (or "--") → UTC Date */
function buildDate(datePart: string, timePart: string): Date {
  const time = /^\d{1,2}:\d{2}$/.test(timePart) ? timePart : "00:00";
  return new Date(`${datePart}T${time}:00Z`);
}

// ─── DB helpers ───────────────────────────────────────────────────────────────

let _germanyId: string | null = null;
async function getGermanyId(): Promise<string> {
  if (_germanyId) return _germanyId;
  const c = await prisma.country.upsert({
    where: { code: "DE" },
    create: { code: "DE", name: "Deutschland" },
    update: {},
  });
  _germanyId = c.id;
  return c.id;
}

async function upsertRacecourse(ortCode: string, displayName: string): Promise<string> {
  const externalId = `gs-venue-${ortCode.toLowerCase()}`;
  const countryId = await getGermanyId();
  const rc = await prisma.racecourse.upsert({
    where: { externalId },
    create: { externalId, name: displayName, city: displayName, countryId },
    update: { name: displayName, city: displayName },
  });
  return rc.id;
}

async function upsertTrainer(name: string): Promise<string> {
  const externalId = `gs-trainer-${name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}`;
  const countryId = await getGermanyId();
  const t = await prisma.trainer.upsert({
    where: { externalId },
    create: { externalId, name, countryId },
    update: { name },
  });
  return t.id;
}

async function upsertJockey(name: string): Promise<string> {
  const externalId = `gs-jockey-${name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}`;
  const countryId = await getGermanyId();
  const j = await prisma.jockey.upsert({
    where: { externalId },
    create: { externalId, name, countryId },
    update: { name },
  });
  return j.id;
}

async function upsertHorse(name: string, trainerId?: string): Promise<string> {
  const externalId = `gs-horse-${name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-()/]/g, "")}`;
  const countryId = await getGermanyId();
  const h = await prisma.horse.upsert({
    where: { externalId },
    create: { externalId, name, countryId, trainerId },
    update: { name, ...(trainerId ? { trainerId } : {}) },
  });
  return h.id;
}

// ─── Step 1: get list of recent result-day URLs ───────────────────────────────

interface MeetingRef {
  url: string;
  datePart: string; // YYYY-MM-DD
  ortCode: string;
}

async function fetchResultMeetings(): Promise<MeetingRef[]> {
  const html = await fetchHtml(`${BASE_URL}/ErgebnisseMenu.php`);
  const $ = cheerio.load(html);
  const meetings: MeetingRef[] = [];

  $("a[href*='ResultRenntag.php']").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    const params = new URLSearchParams(href.split("?")[1] ?? "");
    const datePart = params.get("Datum") ?? "";
    const ortCode = params.get("Ort") ?? "";
    if (!datePart || !ortCode) return;
    const url = href.startsWith("http") ? href : `${BASE_URL}/${href.replace(/^\//, "")}`;
    meetings.push({ url, datePart, ortCode });
  });

  if (DEBUG) console.log(`Found ${meetings.length} result meeting(s)`);
  return meetings;
}

// ─── Step 2: parse race list from ResultRenntag.php ───────────────────────────

interface RaceRef {
  displayErgebnisUrl: string;
  resultId: string; // numeric id from DisplayErgebnis.php?id=N
  raceNo: number;
  name: string;
  time: string;
  distanceRaw: string;
  prizeRaw: string;
  kategorie: string;
  klasse: string;
}

function parseRaceDayPage(html: string): RaceRef[] {
  const $ = cheerio.load(html);
  const refs: RaceRef[] = [];

  $(".kompletter-kasten-das-rennen").each((_, block) => {
    const $block = $(block);
    const linkEl = $block.closest("a[href*='DisplayErgebnis.php']");
    const href = linkEl.attr("href") ?? $block.find("a[href*='DisplayErgebnis.php']").attr("href") ?? "";

    if (!href) {
      // The outer <a> wraps the entire card
      return;
    }

    const params = new URLSearchParams(href.split("?")[1] ?? "");
    const resultId = params.get("id") ?? "";
    if (!resultId) return;

    const url = href.startsWith("http") ? href : `${BASE_URL}/${href.replace(/^\//, "")}`;
    const raceNo = parseInt($block.find(".nr-des-rennens").first().text().trim(), 10) || 0;
    const name = $block.find(".titel-des-rennens").first().text().trim();
    const time = $block.find(".uhrzeit").first().text().trim();
    const distanceCash = $block.find(".distance-cash").first().text().trim();
    // "2300 m - 5000 €"
    const [distanceRaw = "", prizeRaw = ""] = distanceCash.split("-").map(s => s.trim());
    const bTags = $block.find(".kat-class b");
    const kategorie = $(bTags[0]).text().trim();
    const klasse = $(bTags[1]).text().trim();

    refs.push({ displayErgebnisUrl: url, resultId, raceNo, name, time, distanceRaw, prizeRaw, kategorie, klasse });
  });

  return refs;
}

// ─── Step 3: parse full result from DisplayErgebnis.php ───────────────────────

interface EntryData {
  place: number | null;
  horseName: string;
  jockeyName: string;
  trainerName: string;
  weight: number | null;
  odds: number | null;
}

function parseResultDetail(html: string): EntryData[] {
  const $ = cheerio.load(html);
  const entries: EntryData[] = [];

  $(".table-result-row").each((_, row) => {
    const $row = $(row);

    // Horse name: inside <a> link within .horsename (same pattern as upcoming races)
    const horseName = $row.find(".horsename a").first().text().trim();
    if (!horseName) return;

    // Jockey/Trainer: .rowbox contains .tr-jo ("Jockey:" or "Trainer:") + .trainer-box
    let jockeyName = "";
    let trainerName = "";
    $row.find(".celle.rowbox").each((_, rb) => {
      const label = $(rb).find(".tr-jo").text().trim();
      const value = $(rb).find(".trainer-box").text().trim();
      if (label.startsWith("Jockey")) jockeyName = value;
      if (label.startsWith("Trainer")) trainerName = value;
    });

    const place = parsePosition($row.find(".place").first().text());
    const weight = parseWeight($row.find(".weight").first().text());
    const odds = parseOdds($row.find(".odds").first().text());

    entries.push({ place, horseName, jockeyName, trainerName, weight, odds });
  });

  if (DEBUG) console.log(`  Parsed ${entries.length} entries`);
  return entries;
}

// ─── Persist a single race + entries ─────────────────────────────────────────

async function persistRace(
  ref: RaceRef,
  datePart: string,
  ortCode: string,
  racecourseId: string,
  entries: EntryData[],
): Promise<number> {
  const externalId = `gs-result-${ref.resultId}`;
  const scheduledAt = buildDate(datePart, ref.time);

  let race = await prisma.race.findUnique({ where: { externalId } });
  if (!race) {
    race = await prisma.race.create({
      data: {
        externalId,
        name: ref.name || `Rennen ${ref.raceNo}`,
        racecourseId,
        scheduledAt,
        distance: parseDistance(ref.distanceRaw) ?? 0,
        raceClass: ref.klasse || ref.kategorie || null,
        prize: parsePrize(ref.prizeRaw),
        status: "COMPLETED",
      },
    });
  } else {
    await prisma.race.update({
      where: { id: race.id },
      data: { status: "COMPLETED" },
    });
  }

  let persisted = 0;
  for (const entry of entries) {
    if (!entry.horseName) continue;
    try {
      let trainerId: string | undefined;
      if (entry.trainerName) trainerId = await upsertTrainer(entry.trainerName);
      const horseId = await upsertHorse(entry.horseName, trainerId);
      let jockeyId: string | undefined;
      if (entry.jockeyName) jockeyId = await upsertJockey(entry.jockeyName);

      await prisma.raceEntry.upsert({
        where: { raceId_horseId: { raceId: race!.id, horseId } },
        create: { raceId: race!.id, horseId, jockeyId, finishPos: entry.place, odds: entry.odds, weight: entry.weight },
        update: { jockeyId, finishPos: entry.place, odds: entry.odds, weight: entry.weight },
      });
      persisted++;
    } catch (err) {
      console.error(`Failed to persist entry ${entry.horseName}:`, err);
    }
  }
  return persisted;
}

// ─── Public entry point ───────────────────────────────────────────────────────

export async function scrapeResults(): Promise<{ races: number; entries: number; skipped: number }> {
  let totalRaces = 0;
  let totalEntries = 0;
  let skipped = 0;

  const meetings = await fetchResultMeetings();

  for (const meeting of meetings) {
    const venueName = VENUE_NAMES[meeting.ortCode] ?? meeting.ortCode;
    let racecourseId: string;
    try {
      racecourseId = await upsertRacecourse(meeting.ortCode, venueName);
    } catch (err) {
      console.error(`Failed to upsert racecourse ${meeting.ortCode}:`, err);
      skipped++;
      continue;
    }

    let raceDayHtml: string;
    try {
      raceDayHtml = await fetchHtml(meeting.url);
    } catch (err) {
      console.error(`Failed to fetch ${meeting.url}:`, err);
      skipped++;
      continue;
    }

    const raceRefs = parseRaceDayPage(raceDayHtml);
    if (DEBUG) console.log(`  ${meeting.datePart} ${venueName}: ${raceRefs.length} race(s)`);

    for (const ref of raceRefs) {
      try {
        const detailHtml = await fetchHtml(ref.displayErgebnisUrl);
        const entries = parseResultDetail(detailHtml);
        const count = await persistRace(ref, meeting.datePart, meeting.ortCode, racecourseId, entries);
        totalRaces++;
        totalEntries += count;
      } catch (err) {
        console.error(`Failed to process race ${ref.resultId}:`, err);
        skipped++;
      }
      await new Promise(r => setTimeout(r, 400));
    }

    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`scrapeResults: races=${totalRaces} entries=${totalEntries} skipped=${skipped}`);
  return { races: totalRaces, entries: totalEntries, skipped };
}

// ─── CLI entry ────────────────────────────────────────────────────────────────

if (require.main === module) {
  scrapeResults()
    .then(r => { console.log(r); process.exit(0); })
    .catch(e => { console.error(e); process.exit(1); });
}
