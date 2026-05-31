export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { GlassCard } from "@/components/ui";
import { FavoriteButton } from "@/components/FavoriteButton";
import { NoteEditor } from "@/components/NoteEditor";

async function getTrainerBets(userId: string, trainerId: string) {
  return prisma.bet.findMany({
    where: { userId, raceEntry: { horse: { trainerId } } },
    include: {
      raceEntry: {
        include: {
          race: { include: { racecourse: true } },
          horse: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

type TrainerBet = Awaited<ReturnType<typeof getTrainerBets>>[number];

async function getTrainer(id: string) {
  return prisma.trainer.findUnique({
    where: { id },
    include: {
      country: true,
      horses: {
        include: {
          raceEntries: {
            include: {
              race: { include: { racecourse: true } },
              jockey: true,
            },
            orderBy: { race: { scheduledAt: "desc" } },
          },
        },
        orderBy: { name: "asc" },
      },
    },
  });
}

type Trainer = NonNullable<Awaited<ReturnType<typeof getTrainer>>>;
type Horse = Trainer["horses"][number];
type Entry = Horse["raceEntries"][number] & { horse: Horse };

function computeStats(horses: Horse[]) {
  const allEntries = horses.flatMap((h) => h.raceEntries);
  const completed = allEntries.filter((e) => e.finishPos != null);
  const wins = completed.filter((e) => e.finishPos === 1).length;
  const places = completed.filter((e) => e.finishPos != null && e.finishPos <= 3).length;
  return {
    horses: horses.length,
    runs: allEntries.length,
    wins,
    places,
    winRate: completed.length > 0 ? Math.round((wins / completed.length) * 100) : null,
  };
}

function computeTopPerformers(horses: Horse[]) {
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

  return horses
    .map((horse) => {
      const recent = horse.raceEntries.filter(
        (e) =>
          e.race.status === "COMPLETED" &&
          new Date(e.race.scheduledAt) >= twoYearsAgo
      );
      const wins = recent.filter((e) => e.finishPos === 1).length;
      const places = recent.filter((e) => e.finishPos != null && e.finishPos <= 3).length;
      return { horse, wins, places, runs: recent.length };
    })
    .filter((h) => h.runs > 0)
    .sort((a, b) => b.wins - a.wins || b.places - a.places || b.runs - a.runs);
}

export default async function TrainerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [trainer, session] = await Promise.all([getTrainer(id), auth()]);
  if (!trainer) notFound();

  const bets = session?.user?.id ? await getTrainerBets(session.user.id, id) : [];

  const stats = computeStats(trainer.horses);
  const topPerformers = computeTopPerformers(trainer.horses);

  // Flatten all entries across horses, inject horse reference, sort by date
  const allEntries: Entry[] = trainer.horses
    .flatMap((horse) => horse.raceEntries.map((e) => ({ ...e, horse })))
    .sort(
      (a, b) =>
        new Date(b.race.scheduledAt).getTime() - new Date(a.race.scheduledAt).getTime()
    );

  const upcoming = allEntries.filter((e) => e.race.status === "SCHEDULED");
  const past = allEntries.filter((e) => e.race.status === "COMPLETED");

  return (
    <main className="flex flex-col min-h-screen px-6 py-12 max-w-5xl mx-auto gap-8">

      <Link
        href="/"
        className="flex items-center gap-1.5 text-sm w-fit transition-opacity hover:opacity-70"
        style={{ color: "var(--text-secondary)" }}
      >
        ← Back to calendar
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-1">
          <span
            className="text-sm font-medium tracking-widest uppercase"
            style={{ color: "var(--green-600)" }}
          >
            Trainer
          </span>
          <h1
            className="display-xl"
            style={{ color: "var(--green-900)", fontFamily: "var(--font-display)" }}
          >
            {trainer.name}
          </h1>
          <p className="text-base" style={{ color: "var(--text-secondary)" }}>
            {trainer.country.name}
            {trainer.licenseNo && ` · License ${trainer.licenseNo}`}
          </p>
        </div>
        <FavoriteButton trainerId={trainer.id} />
      </div>

      {/* Stats */}
      <GlassCard variant="default" radius="2xl" padding="lg">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-6">
          <StatBox label="Horses" value={String(stats.horses)} />
          <StatBox label="Runs" value={String(stats.runs)} />
          <StatBox label="Wins" value={String(stats.wins)} accent />
          <StatBox label="Places" value={String(stats.places)} />
          <StatBox
            label="Win rate"
            value={stats.winRate != null ? `${stats.winRate}%` : "—"}
          />
        </div>
      </GlassCard>

      {/* Top performers (last 2 years) */}
      {topPerformers.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="display-md" style={{ color: "var(--green-900)" }}>
            Top performers <span style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-body)", fontSize: "0.875rem", fontWeight: 400 }}>last 2 years</span>
          </h2>
          <div className="flex flex-col gap-2">
            <div
              className="hidden sm:grid gap-4 px-4 pb-1 text-xs font-semibold tracking-widest uppercase"
              style={{ color: "var(--text-tertiary)", gridTemplateColumns: "2rem 1fr 3rem 3rem 3rem 4rem" }}
            >
              <span>#</span>
              <span>Horse</span>
              <span className="text-right">Wins</span>
              <span className="text-right">Places</span>
              <span className="text-right">Runs</span>
              <span className="text-right">Win %</span>
            </div>
            {topPerformers.map(({ horse, wins, places, runs }, i) => {
              const winRate = Math.round((wins / runs) * 100);
              const isTop = i === 0 && wins > 0;
              return (
                <Link key={horse.id} href={`/horses/${horse.id}`} className="block group">
                  <GlassCard
                    variant={isTop ? "default" : "subtle"}
                    radius="lg"
                    padding="md"
                    className="relative overflow-hidden transition-shadow duration-200 group-hover:shadow-[var(--glass-shadow-md)]"
                  >
                    {isTop && (
                      <div
                        className="absolute inset-y-0 left-0 w-1 rounded-l-lg"
                        style={{ background: "var(--green-500)" }}
                      />
                    )}

                    {/* Mobile */}
                    <div className="sm:hidden flex items-center gap-3">
                      <span
                        className="text-sm font-bold tabular-nums w-5 shrink-0"
                        style={{ color: isTop ? "var(--green-600)" : "var(--text-tertiary)" }}
                      >
                        {i + 1}
                      </span>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
                          {horse.name}
                        </span>
                        {horse.gender && (
                          <span className="text-xs capitalize" style={{ color: "var(--text-tertiary)" }}>
                            {[horse.gender, horse.color].filter(Boolean).join(" · ")}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-3 shrink-0 text-sm tabular-nums">
                        <span className="font-bold" style={{ color: wins > 0 ? "var(--green-700)" : "var(--text-tertiary)" }}>
                          {wins}W
                        </span>
                        <span style={{ color: "var(--text-secondary)" }}>{places}P</span>
                        <span className="font-semibold" style={{ color: winRate >= 20 ? "var(--green-600)" : "var(--text-secondary)" }}>
                          {winRate}%
                        </span>
                      </div>
                    </div>

                    {/* Desktop */}
                    <div
                      className="hidden sm:grid gap-4 items-center"
                      style={{ gridTemplateColumns: "2rem 1fr 3rem 3rem 3rem 4rem" }}
                    >
                      <span
                        className="text-sm font-bold tabular-nums"
                        style={{ color: isTop ? "var(--green-600)" : "var(--text-tertiary)" }}
                      >
                        {i + 1}
                      </span>
                      <div className="flex flex-col min-w-0">
                        <span
                          className="text-sm font-semibold truncate"
                          style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}
                        >
                          {horse.name}
                        </span>
                        {horse.gender && (
                          <span className="text-xs capitalize" style={{ color: "var(--text-tertiary)" }}>
                            {[horse.gender, horse.color].filter(Boolean).join(" · ")}
                          </span>
                        )}
                      </div>
                      <span
                        className="text-sm font-bold text-right tabular-nums"
                        style={{ color: wins > 0 ? "var(--green-700)" : "var(--text-tertiary)" }}
                      >
                        {wins}
                      </span>
                      <span className="text-sm text-right tabular-nums" style={{ color: "var(--text-secondary)" }}>
                        {places}
                      </span>
                      <span className="text-sm text-right tabular-nums" style={{ color: "var(--text-secondary)" }}>
                        {runs}
                      </span>
                      <span
                        className="text-sm font-semibold text-right tabular-nums"
                        style={{ color: winRate >= 20 ? "var(--green-600)" : "var(--text-secondary)" }}
                      >
                        {winRate}%
                      </span>
                    </div>
                  </GlassCard>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Horses roster */}
      <section className="flex flex-col gap-4">
        <h2 className="display-md" style={{ color: "var(--green-900)" }}>
          Horses in training
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {trainer.horses.map((horse) => {
            const horseEntries = horse.raceEntries;
            const completed = horseEntries.filter((e) => e.finishPos != null);
            const wins = completed.filter((e) => e.finishPos === 1).length;
            const last = horseEntries.find((e) => e.race.status === "COMPLETED");
            return (
              <Link key={horse.id} href={`/horses/${horse.id}`} className="block group">
                <GlassCard
                  variant="subtle"
                  radius="xl"
                  padding="md"
                  className="transition-shadow duration-200 group-hover:shadow-[var(--glass-shadow-md)]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span
                        className="text-sm font-semibold truncate"
                        style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}
                      >
                        {horse.name}
                      </span>
                      <span className="text-xs capitalize" style={{ color: "var(--text-tertiary)" }}>
                        {[horse.gender, horse.color].filter(Boolean).join(" · ")}
                      </span>
                    </div>
                    <div className="flex gap-4 shrink-0">
                      <div className="flex flex-col items-end gap-0">
                        <span className="text-sm font-bold" style={{ color: "var(--green-700)" }}>
                          {wins}
                        </span>
                        <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>wins</span>
                      </div>
                      <div className="flex flex-col items-end gap-0">
                        <span className="text-sm font-bold" style={{ color: "var(--text-secondary)" }}>
                          {horseEntries.length}
                        </span>
                        <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>runs</span>
                      </div>
                    </div>
                  </div>
                  {last && (
                    <p className="text-xs mt-2" style={{ color: "var(--text-tertiary)" }}>
                      Last run: {format(new Date(last.race.scheduledAt), "d MMM yy")} —{" "}
                      {last.race.name}
                      {last.finishPos != null && ` (${last.finishPos}${ordinal(last.finishPos)})`}
                    </p>
                  )}
                </GlassCard>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="display-md" style={{ color: "var(--green-900)" }}>
            Upcoming entries
          </h2>
          <div className="flex flex-col gap-2">
            <TableHeader upcoming />
            {upcoming.map((entry) => (
              <EntryRow key={entry.id} entry={entry} upcoming />
            ))}
          </div>
        </section>
      )}

      {/* Form */}
      <section className="flex flex-col gap-4">
        <h2 className="display-md" style={{ color: "var(--green-900)" }}>
          Recent form
        </h2>
        {past.length === 0 ? (
          <GlassCard variant="subtle" radius="xl" padding="lg">
            <p style={{ color: "var(--text-secondary)" }}>No race history yet.</p>
          </GlassCard>
        ) : (
          <div className="flex flex-col gap-2">
            <TableHeader upcoming={false} />
            {past.map((entry) => (
              <EntryRow key={entry.id} entry={entry} upcoming={false} />
            ))}
          </div>
        )}
      </section>

      {/* My bets */}
      {session?.user?.id && (
        <section className="flex flex-col gap-4">
          <h2 className="display-md" style={{ color: "var(--green-900)" }}>
            My bets
          </h2>
          {bets.length === 0 ? (
            <GlassCard variant="subtle" radius="xl" padding="lg">
              <p style={{ color: "var(--text-secondary)" }}>No bets placed on horses from this trainer.</p>
            </GlassCard>
          ) : (
            <div className="flex flex-col gap-2">
              {bets.map((bet) => <TrainerBetRow key={bet.id} bet={bet} />)}
            </div>
          )}
        </section>
      )}

      <NoteEditor trainerId={trainer.id} />
    </main>
  );
}

function TrainerBetRow({ bet }: { bet: TrainerBet }) {
  const entry = bet.raceEntry;
  const isWon = bet.result === "WON";
  const isLost = bet.result === "LOST";
  const isPending = bet.result == null;

  return (
    <GlassCard variant={isWon ? "default" : "subtle"} radius="lg" padding="md" className="relative overflow-hidden">
      {isWon && <div className="absolute inset-y-0 left-0 w-1 rounded-l-lg" style={{ background: "var(--green-500)" }} />}
      {isLost && <div className="absolute inset-y-0 left-0 w-1 rounded-l-lg" style={{ background: "#EF4444" }} />}

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`/horses/${entry.horse.id}`} className="text-sm font-semibold hover:underline" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
              {entry.horse.name}
            </Link>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--gray-100)", color: "var(--text-secondary)" }}>
              {bet.betType === "EACH_WAY" ? "E/W" : bet.betType}
            </span>
          </div>
          <Link href={`/races/${entry.race.id}`} className="text-xs hover:underline" style={{ color: "var(--text-tertiary)" }}>
            {entry.race.name} · {entry.race.racecourse.name} · {format(new Date(entry.race.scheduledAt), "d MMM yyyy")}
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end gap-0">
            <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>Stake</span>
            <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>€{bet.stake.toFixed(2)}</span>
          </div>
          <div className="flex flex-col items-end gap-0">
            <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>Odds</span>
            <span className="text-sm font-semibold" style={{ color: "var(--navy-800)" }}>{bet.oddsAtBet.toFixed(1)}x</span>
          </div>
          <div className="flex flex-col items-end gap-0">
            <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>Result</span>
            {isPending ? (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: "var(--green-50)", color: "var(--green-700)" }}>Pending</span>
            ) : (
              <span className="text-sm font-bold" style={{ color: isWon ? "var(--green-700)" : "#EF4444" }}>
                {isWon && bet.payout != null ? `+€${(bet.payout - bet.stake).toFixed(2)}` : bet.result}
              </span>
            )}
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

function TableHeader({ upcoming }: { upcoming: boolean }) {
  return (
    <div
      className="hidden sm:grid gap-4 px-4 pb-1 text-xs font-semibold tracking-widest uppercase"
      style={{
        color: "var(--text-tertiary)",
        gridTemplateColumns: upcoming
          ? "1fr 1fr 1fr 4rem 4rem"
          : "6rem 1fr 1fr 1fr 4rem 4rem 3rem",
      }}
    >
      {!upcoming && <span>Date</span>}
      <span>Race</span>
      <span>Horse</span>
      <span>Jockey</span>
      <span className="text-right">Dist</span>
      <span className="text-right">{upcoming ? "Odds" : "Finish"}</span>
      {!upcoming && <span className="text-right">Time</span>}
    </div>
  );
}

function EntryRow({ entry, upcoming }: { entry: Entry; upcoming: boolean }) {
  const isWin = entry.finishPos === 1;
  const isPlace = entry.finishPos != null && entry.finishPos <= 3;
  const posColor = isWin ? "var(--green-700)" : isPlace ? "var(--green-600)" : "var(--text-tertiary)";

  return (
    <GlassCard
      variant={isWin ? "default" : "subtle"}
      radius="lg"
      padding="md"
      className="relative overflow-hidden"
    >
      {isWin && (
        <div
          className="absolute inset-y-0 left-0 w-1 rounded-l-lg"
          style={{ background: "var(--green-500)" }}
        />
      )}

      {/* Mobile */}
      <div className="sm:hidden flex flex-col gap-2">
        {!upcoming && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs tabular-nums" style={{ color: "var(--text-tertiary)" }}>
              {format(new Date(entry.race.scheduledAt), "d MMM yy")}
            </span>
            <span className="text-sm font-bold tabular-nums" style={{ color: posColor }}>
              {entry.finishPos != null ? `${entry.finishPos}.` : "—"}
            </span>
          </div>
        )}
        <Link href={`/races/${entry.race.id}`} className="flex flex-col min-w-0 hover:underline">
          <span className="text-sm font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
            {entry.race.name}
          </span>
          <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            {entry.race.racecourse.name}
          </span>
        </Link>
        <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-xs" style={{ color: "var(--text-secondary)" }}>
          <Link href={`/horses/${entry.horse.id}`} className="hover:underline">{entry.horse.name}</Link>
          {entry.jockey && (
            <>
              <span style={{ color: "var(--text-tertiary)" }}>·</span>
              <span>{entry.jockey.name}</span>
            </>
          )}
          <span style={{ color: "var(--text-tertiary)" }}>·</span>
          <span>{entry.race.distance}m</span>
          {upcoming && entry.odds != null && (
            <>
              <span style={{ color: "var(--text-tertiary)" }}>·</span>
              <span style={{ color: "var(--navy-800)" }}>{entry.odds.toFixed(1)}x</span>
            </>
          )}
          {!upcoming && entry.finishTime != null && (
            <>
              <span style={{ color: "var(--text-tertiary)" }}>·</span>
              <span>{entry.finishTime.toFixed(1)}s</span>
            </>
          )}
        </div>
      </div>

      {/* Desktop */}
      <div
        className="hidden sm:grid gap-4 items-center"
        style={{
          gridTemplateColumns: upcoming
            ? "1fr 1fr 1fr 4rem 4rem"
            : "6rem 1fr 1fr 1fr 4rem 4rem 3rem",
        }}
      >
        {!upcoming && (
          <span className="text-xs tabular-nums" style={{ color: "var(--text-tertiary)" }}>
            {format(new Date(entry.race.scheduledAt), "d MMM yy")}
          </span>
        )}

        <Link href={`/races/${entry.race.id}`} className="flex flex-col min-w-0 hover:underline">
          <span
            className="text-sm font-semibold truncate"
            style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}
          >
            {entry.race.name}
          </span>
          <span className="text-xs truncate" style={{ color: "var(--text-tertiary)" }}>
            {entry.race.racecourse.name}
          </span>
        </Link>

        <Link href={`/horses/${entry.horse.id}`} className="text-sm truncate hover:underline" style={{ color: "var(--text-secondary)" }}>
          {entry.horse.name}
        </Link>

        <span className="text-sm truncate" style={{ color: "var(--text-secondary)" }}>
          {entry.jockey?.name ?? "—"}
        </span>

        <span className="text-sm text-right tabular-nums" style={{ color: "var(--text-secondary)" }}>
          {entry.race.distance}m
        </span>

        {upcoming ? (
          <span className="text-sm font-semibold text-right tabular-nums" style={{ color: "var(--navy-800)" }}>
            {entry.odds != null ? `${entry.odds.toFixed(1)}x` : "—"}
          </span>
        ) : (
          <span className="text-sm font-bold text-right tabular-nums" style={{ color: posColor }}>
            {entry.finishPos != null ? `${entry.finishPos}.` : "—"}
          </span>
        )}

        {!upcoming && (
          <span className="text-xs text-right tabular-nums" style={{ color: "var(--text-tertiary)" }}>
            {entry.finishTime != null ? `${entry.finishTime.toFixed(1)}s` : "—"}
          </span>
        )}
      </div>
    </GlassCard>
  );
}

function StatBox({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="display-lg" style={{ color: accent ? "var(--green-700)" : "var(--green-800)" }}>
        {value}
      </span>
      <span className="text-xs font-medium tracking-wide uppercase" style={{ color: "var(--text-tertiary)" }}>
        {label}
      </span>
    </div>
  );
}

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] ?? s[v] ?? s[0];
}
