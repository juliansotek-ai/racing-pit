import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { GlassCard } from "@/components/ui";
import { FavoriteButton } from "@/components/FavoriteButton";
import { NoteEditor } from "@/components/NoteEditor";

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
  const jockey = await getJockey(id);
  if (!jockey) notFound();

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

      {/* Form */}
      <section className="flex flex-col gap-4">
        <h2 className="display-md" style={{ color: "var(--green-900)" }}>
          Form
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
        gridTemplateColumns: upcoming
          ? "1fr 1fr 4rem 4rem 4rem"
          : "6rem 1fr 1fr 4rem 4rem 4rem 3rem",
      }}
    >
      {!upcoming && <span>Date</span>}
      <span>Race</span>
      <span>Horse</span>
      <span className="text-right">Dist</span>
      <span className="text-right">Odds</span>
      <span className="text-right">{upcoming ? "Saddle" : "Finish"}</span>
      {!upcoming && <span className="text-right">Time</span>}
    </div>
  );
}

function EntryRow({ entry, upcoming }: { entry: Entry; upcoming: boolean }) {
  const isWin = entry.finishPos === 1;
  const isPlace = entry.finishPos != null && entry.finishPos <= 3;

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
      <div
        className="grid gap-3 sm:gap-4 items-center"
        style={{
          gridTemplateColumns: upcoming
            ? "1fr 1fr 4rem 4rem 4rem"
            : "6rem 1fr 1fr 4rem 4rem 4rem 3rem",
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

        <span className="text-sm text-right tabular-nums" style={{ color: "var(--text-secondary)" }}>
          {entry.race.distance}m
        </span>

        <span className="text-sm font-semibold text-right tabular-nums" style={{ color: "var(--navy-800)" }}>
          {entry.odds != null ? `${entry.odds.toFixed(1)}x` : "—"}
        </span>

        {upcoming ? (
          <span className="text-sm text-right tabular-nums" style={{ color: "var(--text-secondary)" }}>
            {entry.saddleNo != null ? `#${entry.saddleNo}` : "—"}
          </span>
        ) : (
          <span
            className="text-sm font-bold text-right tabular-nums"
            style={{
              color: isWin
                ? "var(--green-700)"
                : isPlace
                ? "var(--green-600)"
                : "var(--text-tertiary)",
            }}
          >
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
