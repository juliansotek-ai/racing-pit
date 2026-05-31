export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { GlassCard } from "@/components/ui";

async function getMeeting(date: string, racecourseId: string) {
  // Validate the date param
  const dayStart = new Date(`${date}T00:00:00.000Z`);
  if (isNaN(dayStart.getTime())) return null;
  const dayEnd = new Date(`${date}T23:59:59.999Z`);

  const races = await prisma.race.findMany({
    where: {
      racecourseId,
      scheduledAt: { gte: dayStart, lte: dayEnd },
    },
    include: {
      racecourse: { include: { country: true } },
      entries: {
        include: {
          horse: { include: { trainer: true } },
          jockey: true,
        },
        orderBy: [
          { finishPos: { sort: "asc", nulls: "last" } },
          { saddleNo: "asc" },
        ],
      },
    },
    orderBy: { scheduledAt: "asc" },
  });

  return races.length > 0 ? races : null;
}

type Races = NonNullable<Awaited<ReturnType<typeof getMeeting>>>;
type Race = Races[number];
type Entry = Race["entries"][number];

function getMeetingStatus(races: Race[]): string {
  const statuses = races.map((r) => r.status);
  if (statuses.every((s) => s === "COMPLETED")) return "COMPLETED";
  if (statuses.every((s) => s === "CANCELLED")) return "CANCELLED";
  if (statuses.every((s) => s === "POSTPONED")) return "POSTPONED";
  return "SCHEDULED";
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    SCHEDULED: { label: "Upcoming", bg: "var(--green-50)", color: "var(--green-700)" },
    COMPLETED: { label: "Completed", bg: "var(--gray-100, #f3f4f6)", color: "var(--gray-500, #6b7280)" },
    CANCELLED: { label: "Cancelled", bg: "#FEF2F2", color: "#B91C1C" },
    POSTPONED: { label: "Postponed", bg: "#FFFBEB", color: "#B45309" },
  };
  const b = map[status] ?? map.SCHEDULED;
  return (
    <span
      className="shrink-0 text-sm font-semibold px-3 py-1.5 rounded-full"
      style={{ background: b.bg, color: b.color }}
    >
      {b.label}
    </span>
  );
}

function EntryRow({ entry, isCompleted }: { entry: Entry; isCompleted: boolean }) {
  const isWinner = entry.finishPos === 1;
  const isPlaced = entry.finishPos != null && entry.finishPos <= 3;
  return (
    <div
      className="relative grid items-center gap-3 px-4 py-2.5"
      style={{
        gridTemplateColumns: isCompleted
          ? "2rem 2rem 1fr 1fr 1fr 4rem"
          : "2rem 1fr 1fr 1fr 4rem",
        borderTop: "1px solid var(--glass-border-subtle)",
      }}
    >
      {isWinner && (
        <div
          className="absolute inset-y-0 left-0 w-0.5 rounded-full"
          style={{ background: "var(--green-500)" }}
        />
      )}

      {/* Saddle no */}
      <span className="text-sm font-bold tabular-nums" style={{ color: "var(--text-tertiary)" }}>
        {entry.saddleNo ?? "—"}
      </span>

      {/* Finish position */}
      {isCompleted && (
        <span
          className="text-sm font-bold tabular-nums"
          style={{
            color: isWinner
              ? "var(--green-700)"
              : isPlaced
              ? "var(--green-600)"
              : "var(--text-tertiary)",
          }}
        >
          {entry.finishPos != null ? `${entry.finishPos}.` : "—"}
        </span>
      )}

      {/* Horse */}
      <div className="min-w-0">
        <Link
          href={`/horses/${entry.horse.id}`}
          className="text-sm font-semibold truncate hover:underline block"
          style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}
        >
          {entry.horse.name}
        </Link>
        {entry.horse.gender && (
          <span className="text-xs capitalize" style={{ color: "var(--text-tertiary)" }}>
            {entry.horse.gender}
          </span>
        )}
      </div>

      {/* Jockey */}
      <span className="text-sm truncate hidden sm:block" style={{ color: "var(--text-secondary)" }}>
        {entry.jockey ? (
          <Link href={`/jockeys/${entry.jockey.id}`} className="hover:underline">
            {entry.jockey.name}
          </Link>
        ) : "—"}
      </span>

      {/* Trainer */}
      <span className="text-sm truncate hidden sm:block" style={{ color: "var(--text-secondary)" }}>
        {entry.horse.trainer ? (
          <Link href={`/trainers/${entry.horse.trainer.id}`} className="hover:underline">
            {entry.horse.trainer.name}
          </Link>
        ) : "—"}
      </span>

      {/* Odds */}
      <span
        className="text-sm font-semibold tabular-nums text-right"
        style={{ color: "var(--navy-800, #1e3a5f)" }}
      >
        {entry.odds != null ? `${entry.odds.toFixed(1)}x` : "—"}
      </span>
    </div>
  );
}

function RaceSection({ race, raceNumber }: { race: Race; raceNumber: number }) {
  const isCompleted = race.status === "COMPLETED";
  const surface = race.surface ?? race.racecourse.surface;

  return (
    <div className="glass rounded-[var(--radius-xl)] overflow-hidden flex flex-col">
      {/* Race header */}
      <div className="flex items-start justify-between gap-4 px-5 py-4">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span
              className="text-xs font-semibold tracking-widest uppercase"
              style={{ color: "var(--text-tertiary)" }}
            >
              Race {raceNumber}
            </span>
            <span
              className="text-sm font-semibold tabular-nums"
              style={{ color: "var(--green-700)" }}
            >
              {format(new Date(race.scheduledAt), "HH:mm")}
            </span>
          </div>
          <h3
            className="font-semibold text-base leading-snug truncate"
            style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}
          >
            {race.name}
          </h3>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5">
            <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
              {race.distance}m
            </span>
            {surface && (
              <span className="text-xs capitalize" style={{ color: "var(--text-tertiary)" }}>
                {surface}
              </span>
            )}
            {race.raceClass && (
              <span className="text-xs font-semibold" style={{ color: "var(--green-700)" }}>
                {race.raceClass}
              </span>
            )}
            {race.prize != null && (
              <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                €{(race.prize / 1000).toFixed(0)}k prize
              </span>
            )}
            <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
              {race.entries.length} runners
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={race.status} />
          <Link
            href={`/races/${race.id}`}
            className="text-xs font-medium transition-opacity hover:opacity-70 whitespace-nowrap"
            style={{ color: "var(--text-secondary)" }}
          >
            Full card →
          </Link>
        </div>
      </div>

      {/* Column headers */}
      {race.entries.length > 0 && (
        <>
          <div
            className="grid gap-3 px-4 py-1.5 text-[10px] font-semibold tracking-widest uppercase"
            style={{
              color: "var(--text-tertiary)",
              background: "var(--glass-bg-subtle, rgba(0,0,0,0.02))",
              borderTop: "1px solid var(--glass-border-subtle)",
              gridTemplateColumns: isCompleted
                ? "2rem 2rem 1fr 1fr 1fr 4rem"
                : "2rem 1fr 1fr 1fr 4rem",
            }}
          >
            <span>#</span>
            {isCompleted && <span>Pos</span>}
            <span>Horse</span>
            <span className="hidden sm:block">Jockey</span>
            <span className="hidden sm:block">Trainer</span>
            <span className="text-right">Odds</span>
          </div>

          {race.entries.map((entry) => (
            <EntryRow key={entry.id} entry={entry} isCompleted={isCompleted} />
          ))}
        </>
      )}

      {race.entries.length === 0 && (
        <p className="px-5 py-3 text-sm" style={{ color: "var(--text-tertiary)", borderTop: "1px solid var(--glass-border-subtle)" }}>
          No runners declared yet.
        </p>
      )}
    </div>
  );
}

export default async function MeetingPage({
  params,
}: {
  params: Promise<{ date: string; racecourseId: string }>;
}) {
  const { date, racecourseId } = await params;
  const races = await getMeeting(date, racecourseId);
  if (!races) notFound();

  const venue = races[0].racecourse;
  const firstStart = races[0].scheduledAt;
  const status = getMeetingStatus(races);
  const totalRunners = races.reduce((sum, r) => sum + r.entries.length, 0);

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 flex flex-col gap-8">

      {/* Back */}
      <Link
        href="/races"
        className="flex items-center gap-1.5 text-sm w-fit transition-opacity hover:opacity-70"
        style={{ color: "var(--text-secondary)" }}
      >
        ← Races
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex flex-col gap-1">
            <h1
              className="display-xl"
              style={{ color: "var(--green-900)", fontFamily: "var(--font-display)" }}
            >
              {format(new Date(firstStart), "EEEE, d MMMM yyyy")}
            </h1>
            <p className="text-base" style={{ color: "var(--text-secondary)" }}>
              {venue.name} · {venue.city}, {venue.country.name}
            </p>
          </div>
          <StatusBadge status={status} />
        </div>

        <GlassCard variant="subtle" radius="xl" padding="lg">
          <div className="flex flex-wrap gap-8">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-medium tracking-widest uppercase" style={{ color: "var(--text-tertiary)" }}>
                Races
              </span>
              <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                {races.length}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-medium tracking-widest uppercase" style={{ color: "var(--text-tertiary)" }}>
                First off
              </span>
              <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                {format(new Date(firstStart), "HH:mm")}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-medium tracking-widest uppercase" style={{ color: "var(--text-tertiary)" }}>
                Last off
              </span>
              <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                {format(new Date(races[races.length - 1].scheduledAt), "HH:mm")}
              </span>
            </div>
            {totalRunners > 0 && (
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-medium tracking-widest uppercase" style={{ color: "var(--text-tertiary)" }}>
                  Total runners
                </span>
                <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  {totalRunners}
                </span>
              </div>
            )}
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-medium tracking-widest uppercase" style={{ color: "var(--text-tertiary)" }}>
                Surface
              </span>
              <span className="text-sm font-semibold capitalize" style={{ color: "var(--text-primary)" }}>
                {venue.surface ?? "—"}
              </span>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Race list */}
      <div className="flex flex-col gap-4">
        {races.map((race, i) => (
          <RaceSection key={race.id} race={race} raceNumber={i + 1} />
        ))}
      </div>

    </main>
  );
}
