export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { GlassCard } from "@/components/ui";
import { FavoriteButton } from "@/components/FavoriteButton";
import { NoteEditor } from "@/components/NoteEditor";

async function getJockeyBets(userId: string, jockeyId: string) {
  return prisma.bet.findMany({
    where: { userId, raceEntry: { jockeyId } },
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

type JockeyBet = Awaited<ReturnType<typeof getJockeyBets>>[number];

async function getJockey(id: string) {
  return prisma.jockey.findUnique({
    where: { id },
    include: {
      country: true,
      raceEntries: {
        include: {
          race: { include: { racecourse: true } },
          horse: { include: { trainer: true } },
        },
        orderBy: { race: { scheduledAt: "desc" } },
      },
    },
  });
}

type Jockey = NonNullable<Awaited<ReturnType<typeof getJockey>>>;
type Entry = Jockey["raceEntries"][number];

function computeStats(entries: Entry[]) {
  const completed = entries.filter((e) => e.finishPos != null);
  const wins = completed.filter((e) => e.finishPos === 1).length;
  const places = completed.filter((e) => e.finishPos != null && e.finishPos <= 3).length;
  return {
    runs: entries.length,
    wins,
    places,
    winRate: completed.length > 0 ? Math.round((wins / completed.length) * 100) : null,
  };
}

export default async function JockeyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [jockey, session] = await Promise.all([getJockey(id), auth()]);
  if (!jockey) notFound();

  const bets = session?.user?.id ? await getJockeyBets(session.user.id, id) : [];

  const stats = computeStats(jockey.raceEntries);
  const upcoming = jockey.raceEntries.filter((e) => e.race.status === "SCHEDULED");
  const past = jockey.raceEntries.filter((e) => e.race.status === "COMPLETED");

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
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex flex-col gap-1">
            <span
              className="text-sm font-medium tracking-widest uppercase"
              style={{ color: "var(--green-600)" }}
            >
              Jockey
            </span>
            <h1
              className="display-xl"
              style={{ color: "var(--green-900)", fontFamily: "var(--font-display)" }}
            >
              {jockey.name}
            </h1>
            <p className="text-base" style={{ color: "var(--text-secondary)" }}>
              {jockey.country.name}
              {jockey.weight != null && ` · ${jockey.weight}kg`}
            </p>
          </div>
          <FavoriteButton jockeyId={jockey.id} />
        </div>

        {jockey.licenseNo && (
          <GlassCard variant="subtle" radius="xl" padding="lg">
            <MetaStat label="License" value={jockey.licenseNo} />
          </GlassCard>
        )}
      </div>

      {/* Stats */}
      <GlassCard variant="default" radius="2xl" padding="lg">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          <StatBox label="Rides" value={String(stats.runs)} />
          <StatBox label="Wins" value={String(stats.wins)} accent />
          <StatBox label="Places" value={String(stats.places)} />
          <StatBox
            label="Win rate"
            value={stats.winRate != null ? `${stats.winRate}%` : "—"}
          />
        </div>
      </GlassCard>

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="display-md" style={{ color: "var(--green-900)" }}>
            Upcoming rides
          </h2>
          <div className="flex flex-col gap-2">
            <TableHeader upcoming />
            {upcoming.map((entry) => (
              <EntryRow key={entry.id} entry={entry} upcoming />
            ))}
          </div>
        </section>
      )}

      {/* Recent rides */}
      <section className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between">
          <h2 className="display-md" style={{ color: "var(--green-900)" }}>
            Recent rides
          </h2>
          {past.length > 10 && (
            <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
              Last 10 of {past.length} rides
            </span>
          )}
        </div>
        {past.length === 0 ? (
          <GlassCard variant="subtle" radius="xl" padding="lg">
            <p style={{ color: "var(--text-secondary)" }}>No race history yet.</p>
          </GlassCard>
        ) : (
          <div className="flex flex-col gap-2">
            <TableHeader upcoming={false} />
            {past.slice(0, 10).map((entry) => (
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
              <p style={{ color: "var(--text-secondary)" }}>No bets placed on this jockey.</p>
            </GlassCard>
          ) : (
            <div className="flex flex-col gap-2">
              {bets.map((bet) => <JockeyBetRow key={bet.id} bet={bet} />)}
            </div>
          )}
        </section>
      )}

      <NoteEditor jockeyId={jockey.id} />
    </main>
  );
}

function TableHeader({ upcoming }: { upcoming: boolean }) {
  return (
    <div
      className="hidden sm:grid gap-4 px-4 pb-1 text-xs font-semibold tracking-widest uppercase"
      style={{
        color: "var(--text-tertiary)",
        gridTemplateColumns: upcoming ? "1fr 1fr 5rem 4rem 4rem" : "5rem 1fr 1fr 5rem 4rem 3rem",
      }}
    >
      {!upcoming && <span>Date</span>}
      <span>Race</span>
      <span>Horse</span>
      <span>Conditions</span>
      <span className="text-right">Dist</span>
      <span className="text-right">{upcoming ? "Saddle" : "Pos"}</span>
    </div>
  );
}

function EntryRow({ entry, upcoming }: { entry: Entry; upcoming: boolean }) {
  const isWin = entry.finishPos === 1;
  const isPlace = entry.finishPos != null && entry.finishPos <= 3;
  const conditions = [
    entry.race.raceClass,
    entry.race.surface
      ? entry.race.surface.charAt(0).toUpperCase() + entry.race.surface.slice(1)
      : null,
  ]
    .filter(Boolean)
    .join(" · ");
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
          <span style={{ color: "var(--text-tertiary)" }}>·</span>
          <span>{entry.race.distance}m</span>
          {upcoming && entry.saddleNo != null && (
            <>
              <span style={{ color: "var(--text-tertiary)" }}>·</span>
              <span>#{entry.saddleNo}</span>
            </>
          )}
          {conditions && (
            <>
              <span style={{ color: "var(--text-tertiary)" }}>·</span>
              <span>{conditions}</span>
            </>
          )}
        </div>
      </div>

      {/* Desktop */}
      <div
        className="hidden sm:grid gap-4 items-center"
        style={{
          gridTemplateColumns: upcoming ? "1fr 1fr 5rem 4rem 4rem" : "5rem 1fr 1fr 5rem 4rem 3rem",
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

        <span className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>
          {conditions || "—"}
        </span>

        <span className="text-sm text-right tabular-nums" style={{ color: "var(--text-secondary)" }}>
          {entry.race.distance}m
        </span>

        {upcoming ? (
          <span className="text-sm text-right tabular-nums" style={{ color: "var(--text-secondary)" }}>
            {entry.saddleNo != null ? `#${entry.saddleNo}` : "—"}
          </span>
        ) : (
          <span className="text-sm font-bold text-right tabular-nums" style={{ color: posColor }}>
            {entry.finishPos != null ? `${entry.finishPos}.` : "—"}
          </span>
        )}
      </div>
    </GlassCard>
  );
}

function JockeyBetRow({ bet }: { bet: JockeyBet }) {
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

function MetaStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium tracking-widest uppercase" style={{ color: "var(--text-tertiary)" }}>
        {label}
      </span>
      <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
        {value}
      </span>
    </div>
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
