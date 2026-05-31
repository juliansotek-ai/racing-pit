/**
 * Scraper for upcoming races from galopp-statistik.de
 *
 * Flow: RennenMenu.php → UpcomRenntag.php → RennenDetails.php
 *
 * USAGE:
 *   npx tsx src/scrapers/races.ts
 *   DEBUG_SCRAPER=1 npx tsx src/scrapers/races.ts
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
  const n = parseFloat(raw.replace(/[^\d]/g, ""));
  return isNaN(n) || n === 0 ? null : n;
}

function parseWeight(raw: string): number | null {
  const n = parseFloat(raw.replace(",", ".").replace(/[^\d.]/g, ""));
  return isNaN(n) || n === 0 ? null : n;
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

// ─── Step 1: get upcoming meeting URLs from RennenMenu.php ───────────────────

interface MeetingRef {
  url: string;
  datePart: string;
  ortCode: string;
}

async function fetchUpcomingMeetings(): Promise<MeetingRef[]> {
  const html = await fetchHtml(`${BASE_URL}/RennenMenu.php`);
  const $ = cheerio.load(html);
  const meetings: MeetingRef[] = [];
  const seen = new Set<string>();

  $("a[href*='UpcomRenntag.php']").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    const params = new URLSearchParams(href.split("?")[1] ?? "");
    const datePart = params.get("Datum") ?? "";
    const ortCode = decodeURIComponent(params.get("Ort") ?? "");
    if (!datePart || !ortCode) return;
    const key = `${datePart}-${ortCode}`;
    if (seen.has(key)) return;
    seen.add(key);
    const url = href.startsWith("http") ? href : `${BASE_URL}/${href.replace(/^\//, "")}`;
    meetings.push({ url, datePart, ortCode });
  });

  if (DEBUG) console.log(`Found ${meetings.length} upcoming meeting(s)`);
  return meetings;
}

// ─── Step 2: parse race cards from UpcomRenntag.php ──────────────────────────

interface RaceRef {
  detailUrl: string;
  datePart: string;
  ortCode: string;
  raceNum: string; // "Nummer" param
  raceNo: number;
  name: string;
  time: string;
  distanceRaw: string;
  prizeRaw: string;
  kategorie: string;
  klasse: string;
  going: string | null;
}

function parseGoing(html: string): string | null {
  const $ = cheerio.load(html);
  const text = $(".druckversion-oben").first().text();
  const m = text.match(/Boden[:\s]+([^\n<]+)/i);
  return m ? m[1].trim() : null;
}

function parseUpcomingDayPage(html: string, meetingDatePart: string, meetingOrtCode: string): RaceRef[] {
  const $ = cheerio.load(html);
  const going = parseGoing(html);
  const refs: RaceRef[] = [];

  $(".kompletter-kasten-das-rennen").each((_, block) => {
    const $block = $(block);
    const $link = $block.find("a[href*='RennenDetails.php']").first();
    const href = $link.attr("href") ?? "";
    if (!href) return;

    const params = new URLSearchParams(href.split("?")[1] ?? "");
    const datePart = params.get("Datum") ?? meetingDatePart;
    const ortCode = decodeURIComponent(params.get("Ort") ?? meetingOrtCode);
    const raceNum = params.get("Nummer") ?? "";
    if (!raceNum) return;

    const url = href.startsWith("http") ? href : `${BASE_URL}/${href.replace(/^\//, "")}`;
    const raceNo = parseInt(raceNum, 10) || 0;
    const name = $block.find(".titel-des-rennens").first().text().trim();
    const time = $block.find(".uhrzeit").first().text().trim();
    const distanceCash = $block.find(".distance-cash").first().text().trim();
    const [distanceRaw = "", prizeRaw = ""] = distanceCash.split("-").map(s => s.trim());
    const bTags = $block.find(".kat-class b");
    const kategorie = $(bTags[0]).text().trim();
    const klasse = $(bTags[1]).text().trim();

    refs.push({ detailUrl: url, datePart, ortCode, raceNum, raceNo, name, time, distanceRaw, prizeRaw, kategorie, klasse, going });
  });

  return refs;
}

// ─── Step 3: parse entry list from RennenDetails.php ─────────────────────────

interface EntryData {
  nummer: number;
  horseName: string;
  jockeyName: string;
  trainerName: string;
  weight: number | null;
}

function parseRaceDetail(html: string): EntryData[] {
  const $ = cheerio.load(html);
  const entries: EntryData[] = [];

  // Skip the header row (.kopf-uebersicht), process data rows
  $(".uebersicht-row").not(".kopf-uebersicht").each((_, row) => {
    const $row = $(row);

    const nummerText = $row.find(".reihe.nummer").first().text().trim();
    const nummer = parseInt(nummerText, 10) || 0;

    // Horse name: inside <a> link in pferdename div
    const horseName = $row.find(".reihe.pferdename a").first().text().trim();
    if (!horseName) return;

    // Jockey: direct text of .reihe.jockey
    const jockeyName = $row.find(".reihe.jockey").first().text().trim();

    // Trainer: strip .TWechsel span (shows jockey changes)
    const trainerName = $row.find(".reihe.trainer").first()
      .clone().find(".TWechsel").remove().end().text().trim();

    const weight = parseWeight($row.find(".reihe.gewicht").first().text());

    entries.push({ nummer, horseName, jockeyName, trainerName, weight });
  });

  if (DEBUG) console.log(`  Parsed ${entries.length} entries`);
  return entries;
}

// ─── Persist a single upcoming race + entries ─────────────────────────────────

async function persistUpcomingRace(
  ref: RaceRef,
  racecourseId: string,
  entries: EntryData[],
): Promise<number> {
  const externalId = `gs-race-${ref.datePart}-${ref.ortCode.toLowerCase()}-r${ref.raceNum}`;
  const scheduledAt = buildDate(ref.datePart, ref.time);

  await prisma.race.upsert({
    where: { externalId },
    create: {
      externalId,
      name: ref.name || `Rennen ${ref.raceNo}`,
      racecourseId,
      scheduledAt,
      distance: parseDistance(ref.distanceRaw) ?? 0,
      raceClass: ref.klasse || ref.kategorie || null,
      prize: parsePrize(ref.prizeRaw),
      going: ref.going,
      status: "SCHEDULED",
    },
    update: {
      name: ref.name || `Rennen ${ref.raceNo}`,
      scheduledAt,
      distance: parseDistance(ref.distanceRaw) ?? 0,
      raceClass: ref.klasse || ref.kategorie || null,
      prize: parsePrize(ref.prizeRaw),
      ...(ref.going ? { going: ref.going } : {}),
    },
  });

  const race = await prisma.race.findUnique({ where: { externalId } });
  if (!race) return 0;

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
        where: { raceId_horseId: { raceId: race.id, horseId } },
        create: { raceId: race.id, horseId, jockeyId, weight: entry.weight },
        update: { jockeyId, weight: entry.weight },
      });
      persisted++;
    } catch (err) {
      console.error(`Failed to persist entry ${entry.horseName}:`, err);
    }
  }
  return persisted;
}

// ─── Public entry point ───────────────────────────────────────────────────────

export async function scrapeUpcomingRaces(): Promise<{ upserted: number; skipped: number }> {
  let upserted = 0;
  let skipped = 0;

  const meetings = await fetchUpcomingMeetings();

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

    let dayHtml: string;
    try {
      dayHtml = await fetchHtml(meeting.url);
    } catch (err) {
      console.error(`Failed to fetch ${meeting.url}:`, err);
      skipped++;
      continue;
    }

    const raceRefs = parseUpcomingDayPage(dayHtml, meeting.datePart, meeting.ortCode);
    if (DEBUG) console.log(`  ${meeting.datePart} ${venueName}: ${raceRefs.length} race(s)`);

    for (const ref of raceRefs) {
      try {
        const detailHtml = await fetchHtml(ref.detailUrl);
        const entries = parseRaceDetail(detailHtml);
        const count = await persistUpcomingRace(ref, racecourseId, entries);
        upserted++;
        if (DEBUG) console.log(`    Race ${ref.raceNo}: ${ref.name} — ${count} entries`);
      } catch (err) {
        console.error(`Failed to process race ${ref.raceNum} at ${ref.ortCode}:`, err);
        skipped++;
      }
      await new Promise(r => setTimeout(r, 400));
    }

    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`scrapeUpcomingRaces: upserted=${upserted} skipped=${skipped}`);
  return { upserted, skipped };
}

// ─── CLI entry ────────────────────────────────────────────────────────────────

if (require.main === module) {
  scrapeUpcomingRaces()
    .then(r => { console.log(r); process.exit(0); })
    .catch(e => { console.error(e); process.exit(1); });
}
