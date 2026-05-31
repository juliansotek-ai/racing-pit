export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GlassCard } from "@/components/ui";
import { FavoriteButton } from "@/components/FavoriteButton";

type Tab = "horses" | "jockeys" | "trainers";

async function getFavorites(userId: string) {
  const [horses, jockeys, trainers] = await Promise.all([
    prisma.favorite.findMany({
      where: { userId, horseId: { not: null } },
      include: {
        horse: {
          include: {
            trainer: true,
            country: true,
            raceEntries: {
              where: { race: { status: "COMPLETED" } },
              include: { race: { include: { racecourse: true } } },
              orderBy: { race: { scheduledAt: "desc" } },
              take: 5,
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.favorite.findMany({
      where: { userId, jockeyId: { not: null } },
      include: {
        jockey: {
          include: {
            country: true,
            raceEntries: {
              where: { race: { status: "COMPLETED" } },
              include: { race: { include: { racecourse: true } }, horse: true },
              orderBy: { race: { scheduledAt: "desc" } },
              take: 5,
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.favorite.findMany({
      where: { userId, trainerId: { not: null } },
      include: {
        trainer: {
          include: {
            country: true,
            horses: {
              include: {
                raceEntries: {
                  where: { race: { status: "COMPLETED" } },
                  include: { race: true },
                  orderBy: { race: { scheduledAt: "desc" } },
                  take: 20,
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return { horses, jockeys, trainers };
}

function FormBadge({ pos }: { pos: number | null }) {
  if (pos === null) return <span style={{ color: "var(--text-tertiary)" }}>—</span>;
  const color =
    pos === 1 ? "var(--green-700)" : pos <= 3 ? "var(--green-600)" : "var(--text-tertiary)";
  return (
    <span className="text-xs font-bold tabular-nums" style={{ color }}>
      {pos}
    </span>
  );
}

export default async function FavoritesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const { tab: tabParam } = await searchParams;
  const tab: Tab =
    tabParam === "jockeys" ? "jockeys" : tabParam === "trainers" ? "trainers" : "horses";

  const { horses, jockeys, trainers } = await getFavorites(session.user.id);
  const counts = { horses: horses.length, jockeys: jockeys.length, trainers: trainers.length };

  const TABS: { key: Tab; label: string; count: number }[] = [
    { key: "horses", label: "Horses", count: counts.horses },
    { key: "jockeys", label: "Jockeys", count: counts.jockeys },
    { key: "trainers", label: "Trainers", count: counts.trainers },
  ];

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 flex flex-col gap-8">

      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="display-xl" style={{ color: "var(--green-900)" }}>
          Favourites
        </h1>
        <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
          {counts.horses + counts.jockeys + counts.trainers} saved
        </p>
      </div>

      {/* Tab strip */}
      <div
        className="flex gap-1 p-1 rounded-[var(--radius-lg)] w-fit"
        style={{ background: "rgba(255,255,255,0.5)", border: "1px solid var(--glass-border-subtle)" }}
      >
        {TABS.map(({ key, label, count }) => {
          const active = key === tab;
          return (
            <Link
              key={key}
              href={`/favorites?tab=${key}`}
              className="flex items-center gap-1.5 px-4 py-2 rounded-[var(--radius-md)] text-sm font-medium transition-all duration-150"
              style={
                active
                  ? {
                      background: "var(--green-800)",
                      color: "#fff",
                      boxShadow: "0 2px 8px rgba(27,67,50,0.25)",
                    }
                  : { color: "var(--text-secondary)" }
              }
            >
              {label}
              {count > 0 && (
                <span
                  className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
                  style={
                    active
                      ? { background: "rgba(255,255,255,0.2)", color: "#fff" }
                      : { background: "var(--green-50)", color: "var(--green-700)" }
                  }
                >
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* ── Horses tab ──────────────────────────────────────────────── */}
      {tab === "horses" && (
        <>
          {horses.length === 0 ? (
            <EmptyState label="No favourite horses yet" sub="Tap the heart on any horse page to save it here." />
          ) : (
            <div className="flex flex-col gap-3">
              {horses.map(({ horse }) => {
                if (!horse) return null;
                const completed = horse.raceEntries;
                const wins = completed.filter((e) => e.finishPos === 1).length;
                const recentPositions = completed.slice(0, 5).map((e) => e.finishPos);
                const lastRace = completed[0];

                return (
                  <GlassCard key={horse.id} variant="default" radius="xl" padding="lg">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex flex-col gap-3 min-w-0 flex-1">
                        {/* Name + meta */}
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <Link
                            href={`/horses/${horse.id}`}
                            className="font-semibold text-base leading-snug hover:underline truncate"
                            style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}
                          >
                            {horse.name}
                          </Link>
                          <span className="text-xs capitalize" style={{ color: "var(--text-tertiary)" }}>
                            {[horse.country.name, horse.gender, horse.trainer?.name]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        </div>

                        {/* Stats row */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                          <div className="flex flex-col gap-0">
                            <span className="text-xs font-medium tracking-wide uppercase" style={{ color: "var(--text-tertiary)" }}>Wins</span>
                            <span className="text-sm font-bold" style={{ color: "var(--green-700)" }}>{wins}</span>
                          </div>
                          <div className="flex flex-col gap-0">
                            <span className="text-xs font-medium tracking-wide uppercase" style={{ color: "var(--text-tertiary)" }}>Runs</span>
                            <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{completed.length}</span>
                          </div>

                          {/* Form string */}
                          {recentPositions.length > 0 && (
                            <div className="flex flex-col gap-0">
                              <span className="text-xs font-medium tracking-wide uppercase" style={{ color: "var(--text-tertiary)" }}>Recent form</span>
                              <div className="flex items-center gap-1">
                                {recentPositions.map((pos, i) => (
                                  <FormBadge key={i} pos={pos} />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Last run */}
                        {lastRace && (
                          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                            Last run:{" "}
                            <Link
                              href={`/races/${lastRace.race.id}`}
                              className="hover:underline"
                              style={{ color: "var(--text-secondary)" }}
                            >
                              {lastRace.race.name}
                            </Link>
                            {" "}· {format(new Date(lastRace.race.scheduledAt), "d MMM yy")}
                            {lastRace.finishPos != null && ` · ${lastRace.finishPos}${ordinal(lastRace.finishPos)}`}
                          </p>
                        )}
                      </div>

                      <FavoriteButton horseId={horse.id} />
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── Jockeys tab ──────────────────────────────────────────────── */}
      {tab === "jockeys" && (
        <>
          {jockeys.length === 0 ? (
            <EmptyState label="No favourite jockeys yet" sub="Tap the heart on any jockey page to save it here." />
          ) : (
            <div className="flex flex-col gap-3">
              {jockeys.map(({ jockey }) => {
                if (!jockey) return null;
                const completed = jockey.raceEntries;
                const wins = completed.filter((e) => e.finishPos === 1).length;
                const recentPositions = completed.slice(0, 5).map((e) => e.finishPos);
                const lastRide = completed[0];

                return (
                  <GlassCard key={jockey.id} variant="default" radius="xl" padding="lg">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex flex-col gap-3 min-w-0 flex-1">
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <Link
                            href={`/jockeys/${jockey.id}`}
                            className="font-semibold text-base leading-snug hover:underline"
                            style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}
                          >
                            {jockey.name}
                          </Link>
                          <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                            {jockey.country.name}
                            {jockey.weight != null && ` · ${jockey.weight}kg`}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                          <div className="flex flex-col gap-0">
                            <span className="text-xs font-medium tracking-wide uppercase" style={{ color: "var(--text-tertiary)" }}>Wins</span>
                            <span className="text-sm font-bold" style={{ color: "var(--green-700)" }}>{wins}</span>
                          </div>
                          <div className="flex flex-col gap-0">
                            <span className="text-xs font-medium tracking-wide uppercase" style={{ color: "var(--text-tertiary)" }}>Rides</span>
                            <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{completed.length}</span>
                          </div>
                          {completed.length > 0 && (
                            <div className="flex flex-col gap-0">
                              <span className="text-xs font-medium tracking-wide uppercase" style={{ color: "var(--text-tertiary)" }}>Win %</span>
                              <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                                {Math.round((wins / completed.length) * 100)}%
                              </span>
                            </div>
                          )}
                          {recentPositions.length > 0 && (
                            <div className="flex flex-col gap-0">
                              <span className="text-xs font-medium tracking-wide uppercase" style={{ color: "var(--text-tertiary)" }}>Recent form</span>
                              <div className="flex items-center gap-1">
                                {recentPositions.map((pos, i) => (
                                  <FormBadge key={i} pos={pos} />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {lastRide && (
                          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                            Last ride:{" "}
                            <Link href={`/horses/${lastRide.horse.id}`} className="hover:underline" style={{ color: "var(--text-secondary)" }}>
                              {lastRide.horse.name}
                            </Link>
                            {" · "}{format(new Date(lastRide.race.scheduledAt), "d MMM yy")}
                            {lastRide.finishPos != null && ` · ${lastRide.finishPos}${ordinal(lastRide.finishPos)}`}
                          </p>
                        )}
                      </div>

                      <FavoriteButton jockeyId={jockey.id} />
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── Trainers tab ──────────────────────────────────────────────── */}
      {tab === "trainers" && (
        <>
          {trainers.length === 0 ? (
            <EmptyState label="No favourite trainers yet" sub="Tap the heart on any trainer page to save it here." />
          ) : (
            <div className="flex flex-col gap-3">
              {trainers.map(({ trainer }) => {
                if (!trainer) return null;
                const allEntries = trainer.horses.flatMap((h) => h.raceEntries);
                const wins = allEntries.filter((e) => e.finishPos === 1).length;
                const activeHorses = trainer.horses.filter((h) => h.raceEntries.length > 0);

                // Top horse by wins
                const topHorse = trainer.horses
                  .map((h) => ({
                    horse: h,
                    wins: h.raceEntries.filter((e) => e.finishPos === 1).length,
                  }))
                  .sort((a, b) => b.wins - a.wins)[0];

                // Most recent run across all horses
                const mostRecent = allEntries
                  .sort((a, b) => new Date(b.race.scheduledAt).getTime() - new Date(a.race.scheduledAt).getTime())[0];

                return (
                  <GlassCard key={trainer.id} variant="default" radius="xl" padding="lg">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex flex-col gap-3 min-w-0 flex-1">
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <Link
                            href={`/trainers/${trainer.id}`}
                            className="font-semibold text-base leading-snug hover:underline"
                            style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}
                          >
                            {trainer.name}
                          </Link>
                          <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                            {trainer.country.name}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                          <div className="flex flex-col gap-0">
                            <span className="text-xs font-medium tracking-wide uppercase" style={{ color: "var(--text-tertiary)" }}>Horses</span>
                            <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{activeHorses.length}</span>
                          </div>
                          <div className="flex flex-col gap-0">
                            <span className="text-xs font-medium tracking-wide uppercase" style={{ color: "var(--text-tertiary)" }}>Wins</span>
                            <span className="text-sm font-bold" style={{ color: "var(--green-700)" }}>{wins}</span>
                          </div>
                          {allEntries.length > 0 && (
                            <div className="flex flex-col gap-0">
                              <span className="text-xs font-medium tracking-wide uppercase" style={{ color: "var(--text-tertiary)" }}>Runs</span>
                              <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{allEntries.length}</span>
                            </div>
                          )}
                          {topHorse && topHorse.wins > 0 && (
                            <div className="flex flex-col gap-0">
                              <span className="text-xs font-medium tracking-wide uppercase" style={{ color: "var(--text-tertiary)" }}>Top horse</span>
                              <Link
                                href={`/horses/${topHorse.horse.id}`}
                                className="text-sm font-semibold hover:underline"
                                style={{ color: "var(--navy-800)" }}
                              >
                                {topHorse.horse.name} ({topHorse.wins}W)
                              </Link>
                            </div>
                          )}
                        </div>

                        {mostRecent && (
                          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                            Last run: {format(new Date(mostRecent.race.scheduledAt), "d MMM yy")}
                            {mostRecent.finishPos != null && ` · ${mostRecent.finishPos}${ordinal(mostRecent.finishPos)}`}
                          </p>
                        )}
                      </div>

                      <FavoriteButton trainerId={trainer.id} />
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          )}
        </>
      )}

    </main>
  );
}

function EmptyState({ label, sub }: { label: string; sub: string }) {
  return (
    <GlassCard variant="subtle" radius="xl" padding="lg">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>{label}</p>
        <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>{sub}</p>
      </div>
    </GlassCard>
  );
}

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] ?? s[v] ?? s[0];
}
