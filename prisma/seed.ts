import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // ── Country ───────────────────────────────────────────────────────────────
  const germany = await prisma.country.upsert({
    where: { code: "DE" },
    update: {},
    create: { code: "DE", name: "Germany" },
  });

  // ── Racecourses ───────────────────────────────────────────────────────────
  const [hamburg, munich, badenBaden, cologne] = await Promise.all([
    prisma.racecourse.upsert({
      where: { externalId: "rc-hamburg" },
      update: {},
      create: {
        name: "Hamburg-Horn",
        city: "Hamburg",
        surface: "turf",
        countryId: germany.id,
        externalId: "rc-hamburg",
      },
    }),
    prisma.racecourse.upsert({
      where: { externalId: "rc-munich" },
      update: {},
      create: {
        name: "München-Riem",
        city: "München",
        surface: "turf",
        countryId: germany.id,
        externalId: "rc-munich",
      },
    }),
    prisma.racecourse.upsert({
      where: { externalId: "rc-badenbaden" },
      update: {},
      create: {
        name: "Baden-Baden",
        city: "Baden-Baden",
        surface: "turf",
        countryId: germany.id,
        externalId: "rc-badenbaden",
      },
    }),
    prisma.racecourse.upsert({
      where: { externalId: "rc-cologne" },
      update: {},
      create: {
        name: "Köln-Weidenpesch",
        city: "Köln",
        surface: "turf",
        countryId: germany.id,
        externalId: "rc-cologne",
      },
    }),
  ]);

  // ── Trainers ──────────────────────────────────────────────────────────────
  const [woehler, grewe, schiergen, klug] = await Promise.all([
    prisma.trainer.upsert({
      where: { externalId: "tr-woehler" },
      update: {},
      create: {
        name: "Andreas Wöhler",
        countryId: germany.id,
        externalId: "tr-woehler",
      },
    }),
    prisma.trainer.upsert({
      where: { externalId: "tr-grewe" },
      update: {},
      create: {
        name: "Henk Grewe",
        countryId: germany.id,
        externalId: "tr-grewe",
      },
    }),
    prisma.trainer.upsert({
      where: { externalId: "tr-schiergen" },
      update: {},
      create: {
        name: "Peter Schiergen",
        countryId: germany.id,
        externalId: "tr-schiergen",
      },
    }),
    prisma.trainer.upsert({
      where: { externalId: "tr-klug" },
      update: {},
      create: {
        name: "Markus Klug",
        countryId: germany.id,
        externalId: "tr-klug",
      },
    }),
  ]);

  // ── Jockeys ───────────────────────────────────────────────────────────────
  const [starke, pedroza, murzabayev, bojko, vogt] = await Promise.all([
    prisma.jockey.upsert({
      where: { externalId: "jk-starke" },
      update: {},
      create: {
        name: "Andrasch Starke",
        countryId: germany.id,
        weight: 54,
        externalId: "jk-starke",
      },
    }),
    prisma.jockey.upsert({
      where: { externalId: "jk-pedroza" },
      update: {},
      create: {
        name: "Eduardo Pedroza",
        countryId: germany.id,
        weight: 53,
        externalId: "jk-pedroza",
      },
    }),
    prisma.jockey.upsert({
      where: { externalId: "jk-murzabayev" },
      update: {},
      create: {
        name: "Bauyrzhan Murzabayev",
        countryId: germany.id,
        weight: 54,
        externalId: "jk-murzabayev",
      },
    }),
    prisma.jockey.upsert({
      where: { externalId: "jk-bojko" },
      update: {},
      create: {
        name: "Jozef Bojko",
        countryId: germany.id,
        weight: 55,
        externalId: "jk-bojko",
      },
    }),
    prisma.jockey.upsert({
      where: { externalId: "jk-vogt" },
      update: {},
      create: {
        name: "Sibylle Vogt",
        countryId: germany.id,
        weight: 52,
        externalId: "jk-vogt",
      },
    }),
  ]);

  // ── Horses ────────────────────────────────────────────────────────────────
  const horses = await Promise.all([
    prisma.horse.upsert({
      where: { externalId: "h-koenigsadler" },
      update: {},
      create: {
        name: "Königsadler",
        gender: "stallion",
        color: "bay",
        sire: "Galileo",
        dam: "Königin",
        dateOfBirth: new Date("2020-03-15"),
        countryId: germany.id,
        trainerId: woehler.id,
        externalId: "h-koenigsadler",
      },
    }),
    prisma.horse.upsert({
      where: { externalId: "h-schwarzwald" },
      update: {},
      create: {
        name: "Schwarzwald Star",
        gender: "gelding",
        color: "dark bay",
        sire: "Frankel",
        dam: "Schwarze Rose",
        dateOfBirth: new Date("2019-04-02"),
        countryId: germany.id,
        trainerId: grewe.id,
        externalId: "h-schwarzwald",
      },
    }),
    prisma.horse.upsert({
      where: { externalId: "h-rheingold" },
      update: {},
      create: {
        name: "Rheingold Express",
        gender: "colt",
        color: "chestnut",
        sire: "Sea The Stars",
        dam: "Rheinperle",
        dateOfBirth: new Date("2021-02-20"),
        countryId: germany.id,
        trainerId: schiergen.id,
        externalId: "h-rheingold",
      },
    }),
    prisma.horse.upsert({
      where: { externalId: "h-bayernblitz" },
      update: {},
      create: {
        name: "Bayern Blitz",
        gender: "mare",
        color: "grey",
        sire: "Dubawi",
        dam: "Bayernkönigin",
        dateOfBirth: new Date("2020-05-10"),
        countryId: germany.id,
        trainerId: klug.id,
        externalId: "h-bayernblitz",
      },
    }),
    prisma.horse.upsert({
      where: { externalId: "h-heidelberg" },
      update: {},
      create: {
        name: "Heidelberg Rose",
        gender: "filly",
        color: "bay",
        sire: "Kingman",
        dam: "Heidelberger Blume",
        dateOfBirth: new Date("2021-03-08"),
        countryId: germany.id,
        trainerId: woehler.id,
        externalId: "h-heidelberg",
      },
    }),
    prisma.horse.upsert({
      where: { externalId: "h-moselmagic" },
      update: {},
      create: {
        name: "Mosel Magic",
        gender: "gelding",
        color: "brown",
        sire: "Monsun",
        dam: "Moselwein",
        dateOfBirth: new Date("2019-06-14"),
        countryId: germany.id,
        trainerId: grewe.id,
        externalId: "h-moselmagic",
      },
    }),
    prisma.horse.upsert({
      where: { externalId: "h-hamburgerheld" },
      update: {},
      create: {
        name: "Hamburger Held",
        gender: "stallion",
        color: "bay",
        sire: "Adlerflug",
        dam: "Hafenkönigin",
        dateOfBirth: new Date("2018-04-22"),
        countryId: germany.id,
        trainerId: schiergen.id,
        externalId: "h-hamburgerheld",
      },
    }),
    prisma.horse.upsert({
      where: { externalId: "h-rhinerunner" },
      update: {},
      create: {
        name: "Rhine Runner",
        gender: "gelding",
        color: "chestnut",
        sire: "Soldier Hollow",
        dam: "Rheinläuferin",
        dateOfBirth: new Date("2020-02-28"),
        countryId: germany.id,
        trainerId: klug.id,
        externalId: "h-rhinerunner",
      },
    }),
  ]);

  const [
    koenigsadler,
    schwarzwald,
    rheingold,
    bayernblitz,
    heidelberg,
    moselmagic,
    hamburgerheld,
    rhinerunner,
  ] = horses;

  // ── Races ─────────────────────────────────────────────────────────────────
  const now = new Date();
  const day = (offset: number) =>
    new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, 14, 30);

  // 2 completed races
  const [pastRace1, pastRace2] = await Promise.all([
    prisma.race.upsert({
      where: { externalId: "race-hh-2026-001" },
      update: {},
      create: {
        name: "Hamburger Meilen-Preis",
        racecourseId: hamburg.id,
        scheduledAt: day(-7),
        distance: 1600,
        surface: "turf",
        raceClass: "Listed",
        prize: 40000,
        status: "COMPLETED",
        externalId: "race-hh-2026-001",
      },
    }),
    prisma.race.upsert({
      where: { externalId: "race-bb-2026-001" },
      update: {},
      create: {
        name: "Baden-Baden Sprint Cup",
        racecourseId: badenBaden.id,
        scheduledAt: day(-3),
        distance: 1200,
        surface: "turf",
        raceClass: "Handicap",
        prize: 25000,
        status: "COMPLETED",
        externalId: "race-bb-2026-001",
      },
    }),
  ]);

  // 3 upcoming races
  const [upcomingRace1, upcomingRace2, upcomingRace3] = await Promise.all([
    prisma.race.upsert({
      where: { externalId: "race-mc-2026-001" },
      update: {},
      create: {
        name: "Münchner Sommer-Preis",
        racecourseId: munich.id,
        scheduledAt: day(2),
        distance: 2000,
        surface: "turf",
        raceClass: "G3",
        prize: 75000,
        status: "SCHEDULED",
        externalId: "race-mc-2026-001",
      },
    }),
    prisma.race.upsert({
      where: { externalId: "race-hh-2026-002" },
      update: {},
      create: {
        name: "Großer Preis von Hamburg",
        racecourseId: hamburg.id,
        scheduledAt: day(5),
        distance: 2400,
        surface: "turf",
        raceClass: "G1",
        prize: 300000,
        status: "SCHEDULED",
        externalId: "race-hh-2026-002",
      },
    }),
    prisma.race.upsert({
      where: { externalId: "race-ko-2026-001" },
      update: {},
      create: {
        name: "Kölner Frühjahrs-Preis",
        racecourseId: cologne.id,
        scheduledAt: day(9),
        distance: 1800,
        surface: "turf",
        raceClass: "Listed",
        prize: 50000,
        status: "SCHEDULED",
        externalId: "race-ko-2026-001",
      },
    }),
  ]);

  // ── Race Entries ──────────────────────────────────────────────────────────

  // Past race 1 — Hamburger Meilen-Preis (completed, with results)
  await Promise.all([
    prisma.raceEntry.upsert({
      where: { raceId_horseId: { raceId: pastRace1.id, horseId: koenigsadler.id } },
      update: {},
      create: {
        raceId: pastRace1.id,
        horseId: koenigsadler.id,
        jockeyId: starke.id,
        saddleNo: 1,
        odds: 2.5,
        finishPos: 1,
        finishTime: 96.4,
        weight: 58,
      },
    }),
    prisma.raceEntry.upsert({
      where: { raceId_horseId: { raceId: pastRace1.id, horseId: schwarzwald.id } },
      update: {},
      create: {
        raceId: pastRace1.id,
        horseId: schwarzwald.id,
        jockeyId: pedroza.id,
        saddleNo: 2,
        odds: 4.0,
        finishPos: 2,
        finishTime: 96.8,
        weight: 57,
      },
    }),
    prisma.raceEntry.upsert({
      where: { raceId_horseId: { raceId: pastRace1.id, horseId: hamburgerheld.id } },
      update: {},
      create: {
        raceId: pastRace1.id,
        horseId: hamburgerheld.id,
        jockeyId: murzabayev.id,
        saddleNo: 3,
        odds: 6.0,
        finishPos: 3,
        finishTime: 97.1,
        weight: 59,
      },
    }),
    prisma.raceEntry.upsert({
      where: { raceId_horseId: { raceId: pastRace1.id, horseId: moselmagic.id } },
      update: {},
      create: {
        raceId: pastRace1.id,
        horseId: moselmagic.id,
        jockeyId: bojko.id,
        saddleNo: 4,
        odds: 12.0,
        finishPos: 4,
        finishTime: 97.8,
        weight: 56,
      },
    }),
  ]);

  // Past race 2 — Baden-Baden Sprint Cup (completed, with results)
  await Promise.all([
    prisma.raceEntry.upsert({
      where: { raceId_horseId: { raceId: pastRace2.id, horseId: bayernblitz.id } },
      update: {},
      create: {
        raceId: pastRace2.id,
        horseId: bayernblitz.id,
        jockeyId: vogt.id,
        saddleNo: 1,
        odds: 3.5,
        finishPos: 1,
        finishTime: 70.2,
        weight: 55,
      },
    }),
    prisma.raceEntry.upsert({
      where: { raceId_horseId: { raceId: pastRace2.id, horseId: heidelberg.id } },
      update: {},
      create: {
        raceId: pastRace2.id,
        horseId: heidelberg.id,
        jockeyId: starke.id,
        saddleNo: 2,
        odds: 2.8,
        finishPos: 2,
        finishTime: 70.6,
        weight: 54,
      },
    }),
    prisma.raceEntry.upsert({
      where: { raceId_horseId: { raceId: pastRace2.id, horseId: rhinerunner.id } },
      update: {},
      create: {
        raceId: pastRace2.id,
        horseId: rhinerunner.id,
        jockeyId: pedroza.id,
        saddleNo: 3,
        odds: 5.0,
        finishPos: 3,
        finishTime: 71.0,
        weight: 56,
      },
    }),
  ]);

  // Upcoming race 1 — Münchner Sommer-Preis
  await Promise.all([
    prisma.raceEntry.upsert({
      where: { raceId_horseId: { raceId: upcomingRace1.id, horseId: koenigsadler.id } },
      update: {},
      create: { raceId: upcomingRace1.id, horseId: koenigsadler.id, jockeyId: starke.id, saddleNo: 1, odds: 2.2, weight: 58 },
    }),
    prisma.raceEntry.upsert({
      where: { raceId_horseId: { raceId: upcomingRace1.id, horseId: rheingold.id } },
      update: {},
      create: { raceId: upcomingRace1.id, horseId: rheingold.id, jockeyId: murzabayev.id, saddleNo: 2, odds: 5.5, weight: 56 },
    }),
    prisma.raceEntry.upsert({
      where: { raceId_horseId: { raceId: upcomingRace1.id, horseId: bayernblitz.id } },
      update: {},
      create: { raceId: upcomingRace1.id, horseId: bayernblitz.id, jockeyId: vogt.id, saddleNo: 3, odds: 4.0, weight: 55 },
    }),
    prisma.raceEntry.upsert({
      where: { raceId_horseId: { raceId: upcomingRace1.id, horseId: moselmagic.id } },
      update: {},
      create: { raceId: upcomingRace1.id, horseId: moselmagic.id, jockeyId: bojko.id, saddleNo: 4, odds: 9.0, weight: 57 },
    }),
  ]);

  // Upcoming race 2 — Großer Preis von Hamburg (G1)
  await Promise.all([
    prisma.raceEntry.upsert({
      where: { raceId_horseId: { raceId: upcomingRace2.id, horseId: koenigsadler.id } },
      update: {},
      create: { raceId: upcomingRace2.id, horseId: koenigsadler.id, jockeyId: starke.id, saddleNo: 1, odds: 3.0, weight: 59 },
    }),
    prisma.raceEntry.upsert({
      where: { raceId_horseId: { raceId: upcomingRace2.id, horseId: schwarzwald.id } },
      update: {},
      create: { raceId: upcomingRace2.id, horseId: schwarzwald.id, jockeyId: pedroza.id, saddleNo: 2, odds: 6.0, weight: 58 },
    }),
    prisma.raceEntry.upsert({
      where: { raceId_horseId: { raceId: upcomingRace2.id, horseId: hamburgerheld.id } },
      update: {},
      create: { raceId: upcomingRace2.id, horseId: hamburgerheld.id, jockeyId: murzabayev.id, saddleNo: 3, odds: 4.5, weight: 59 },
    }),
    prisma.raceEntry.upsert({
      where: { raceId_horseId: { raceId: upcomingRace2.id, horseId: rheingold.id } },
      update: {},
      create: { raceId: upcomingRace2.id, horseId: rheingold.id, jockeyId: bojko.id, saddleNo: 4, odds: 8.0, weight: 56 },
    }),
    prisma.raceEntry.upsert({
      where: { raceId_horseId: { raceId: upcomingRace2.id, horseId: heidelberg.id } },
      update: {},
      create: { raceId: upcomingRace2.id, horseId: heidelberg.id, jockeyId: vogt.id, saddleNo: 5, odds: 11.0, weight: 54 },
    }),
  ]);

  // Upcoming race 3 — Kölner Frühjahrs-Preis
  await Promise.all([
    prisma.raceEntry.upsert({
      where: { raceId_horseId: { raceId: upcomingRace3.id, horseId: rhinerunner.id } },
      update: {},
      create: { raceId: upcomingRace3.id, horseId: rhinerunner.id, jockeyId: pedroza.id, saddleNo: 1, odds: 4.5, weight: 56 },
    }),
    prisma.raceEntry.upsert({
      where: { raceId_horseId: { raceId: upcomingRace3.id, horseId: bayernblitz.id } },
      update: {},
      create: { raceId: upcomingRace3.id, horseId: bayernblitz.id, jockeyId: vogt.id, saddleNo: 2, odds: 3.2, weight: 55 },
    }),
    prisma.raceEntry.upsert({
      where: { raceId_horseId: { raceId: upcomingRace3.id, horseId: moselmagic.id } },
      update: {},
      create: { raceId: upcomingRace3.id, horseId: moselmagic.id, jockeyId: starke.id, saddleNo: 3, odds: 7.0, weight: 57 },
    }),
    prisma.raceEntry.upsert({
      where: { raceId_horseId: { raceId: upcomingRace3.id, horseId: schwarzwald.id } },
      update: {},
      create: { raceId: upcomingRace3.id, horseId: schwarzwald.id, jockeyId: murzabayev.id, saddleNo: 4, odds: 5.0, weight: 58 },
    }),
  ]);

  console.log("Seed complete:");
  console.log("  1 country, 4 racecourses");
  console.log("  4 trainers, 5 jockeys, 8 horses");
  console.log("  5 races (2 completed, 3 upcoming), 20 race entries");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
