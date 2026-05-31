/**
 * One-time cleanup: merge trainer/jockey records that are duplicates because
 * one was ingested with an abbreviated first name ("p.schiergen") and another
 * with the full name ("peter schiergen").
 *
 * The canonical key is {first_initial}{last_name_alphanumeric}, so both forms
 * collapse to the same key (e.g. "pschiergen").
 *
 * For each duplicate group:
 *   - "winner"  = record with the fuller (non-abbreviated) name, or the older one
 *   - "losers"  = all other records in the group
 *   - All relations (RaceEntry, Horse, Favorite, Note) are re-pointed to winner
 *   - Loser records are then deleted
 *
 * Run with:
 *   npx tsx scripts/deduplicate-persons.ts
 *   npx tsx scripts/deduplicate-persons.ts --dry-run
 */

import { PrismaClient } from "@prisma/client";
import { canonicalPersonKey, isAbbreviatedName } from "../src/lib/utils";

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes("--dry-run");

if (DRY_RUN) console.log("[dry-run] No changes will be written.\n");

// ─── helpers ────────────────────────────────────────────────────────────────

function pickWinner<T extends { id: string; name: string; createdAt: Date }>(
  records: T[]
): T {
  // Prefer the one with a non-abbreviated full name; fall back to oldest record.
  const full = records.filter((r) => !isAbbreviatedName(r.name));
  const pool = full.length > 0 ? full : records;
  return pool.reduce((a, b) => (a.createdAt < b.createdAt ? a : b));
}

// ─── trainers ────────────────────────────────────────────────────────────────

async function deduplicateTrainers() {
  const trainers = await prisma.trainer.findMany({
    select: { id: true, name: true, externalId: true, createdAt: true },
  });

  const byKey = new Map<string, typeof trainers>();
  for (const t of trainers) {
    const key = canonicalPersonKey(t.name);
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key)!.push(t);
  }

  let merged = 0;
  for (const [key, group] of byKey) {
    if (group.length < 2) continue;

    const winner = pickWinner(group);
    const losers = group.filter((r) => r.id !== winner.id);

    console.log(
      `Trainer [${key}]: "${winner.name}" wins over ${losers.map((l) => `"${l.name}"`).join(", ")}`
    );

    if (!DRY_RUN) {
      // Re-point relations from losers to winner
      for (const loser of losers) {
        await prisma.horse.updateMany({
          where: { trainerId: loser.id },
          data: { trainerId: winner.id },
        });
        await prisma.favorite.deleteMany({
          where: { trainerId: loser.id },
        });
        await prisma.note.deleteMany({
          where: { trainerId: loser.id },
        });
        await prisma.trainer.delete({ where: { id: loser.id } });
      }

      // Migrate externalId to canonical form
      const canonicalId = `gs-trainer-${key}`;
      if (winner.externalId !== canonicalId) {
        await prisma.trainer.update({
          where: { id: winner.id },
          data: { externalId: canonicalId },
        });
      }
    }
    merged += losers.length;
  }

  console.log(`Trainers: merged ${merged} duplicate(s).`);
}

// ─── jockeys ─────────────────────────────────────────────────────────────────

async function deduplicateJockeys() {
  const jockeys = await prisma.jockey.findMany({
    select: { id: true, name: true, externalId: true, createdAt: true },
  });

  const byKey = new Map<string, typeof jockeys>();
  for (const j of jockeys) {
    const key = canonicalPersonKey(j.name);
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key)!.push(j);
  }

  let merged = 0;
  for (const [key, group] of byKey) {
    if (group.length < 2) continue;

    const winner = pickWinner(group);
    const losers = group.filter((r) => r.id !== winner.id);

    console.log(
      `Jockey  [${key}]: "${winner.name}" wins over ${losers.map((l) => `"${l.name}"`).join(", ")}`
    );

    if (!DRY_RUN) {
      for (const loser of losers) {
        await prisma.raceEntry.updateMany({
          where: { jockeyId: loser.id },
          data: { jockeyId: winner.id },
        });
        await prisma.favorite.deleteMany({
          where: { jockeyId: loser.id },
        });
        await prisma.note.deleteMany({
          where: { jockeyId: loser.id },
        });
        await prisma.jockey.delete({ where: { id: loser.id } });
      }

      const canonicalId = `gs-jockey-${key}`;
      if (winner.externalId !== canonicalId) {
        await prisma.jockey.update({
          where: { id: winner.id },
          data: { externalId: canonicalId },
        });
      }
    }
    merged += losers.length;
  }

  console.log(`Jockeys: merged ${merged} duplicate(s).`);
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  await deduplicateTrainers();
  await deduplicateJockeys();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
