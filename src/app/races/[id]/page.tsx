import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { GlassCard } from "@/components/ui";
import { BetButton } from "@/components/BetButton";

async function getRace(id: string) {
  const race = await prisma.race.findUnique({
    where: { id },
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
  });
  return race;
}

export default async function RacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const race = await getRace(id);
  if (!race) notFound();

  const isCompleted = race.status === "COMPLETED";
  const meetingDate = new Date(race.scheduledAt).toISOString().slice(0, 10);
  const meetingHref = `/races/${meetingDate}/${race.racecourseId}`;

  return (
    <main className="flex flex-col min-h-screen px-6 py-12 max-w-5xl mx-auto gap-8">

      {/* Back */}
      <Link
        href={meetingHref}
        className="flex items-center gap-1.5 text-sm w-fit transition-opacity hover:opacity-70"
        style={{ color: "var(--text-secondary)" }}
      >
        ← Back to meeting
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex flex-col gap-1">
            <h1
              className="display-xl"
              style={{ color: "var(--green-900)", fontFamily: "var(--font-display)" }}
            >
              {race.name}
            </h1>
            <p className="text-base" style={{ color: "var(--text-secondary)" }}>
              {race.racecourse.name} · {race.racecourse.city},{" "}
              {race.racecourse.country.name}
            </p>
          </div>
          <StatusBadge status={race.status} />
        </div>

        {/* Race meta */}
        <GlassCard variant="subtle" radius="xl" padding="lg">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            <MetaStat
              label="Date"
              value={format(new Date(race.scheduledAt), "EEE d MMM yyyy")}
            />
            <MetaStat
              label="Time"
              value={format(new Date(race.scheduledAt), "HH:mm")}
            />
            <MetaStat label="Distance" value={`${race.distance}m`} />
            {race.raceClass && (
              <MetaStat label="Class" value={race.raceClass} accent />
            )}
            {race.prize != null && (
              <MetaStat
                label="Prize"
                value={`€${race.prize.toLocaleString("de-DE")}`}
              />
            )}
            <MetaStat
              label="Surface"
              value={race.surface ?? race.racecourse.surface ?? "—"}
            />
            <MetaStat label="Runners" value={String(race.entries.length)} />
          </div>
        </GlassCard>
      </div>

      {/* Entry list */}
      <div className="flex flex-col gap-4">
        <h2 className="display-md" style={{ color: "var(--green-900)" }}>
          {isCompleted ? "Results" : "Race card"}
        </h2>

        {race.entries.length === 0 ? (
          <GlassCard variant="subtle" radius="xl" padding="lg">
            <p style={{ color: "var(--text-secondary)" }}>No entries yet.</p>
          </GlassCard>
        ) : (
          <div className="flex flex-col gap-2">
            {/* Table header */}
            <div
              className="hidden sm:grid gap-4 px-4 pb-1 text-xs font-semibold tracking-widest uppercase"
              style={{
                color: "var(--text-tertiary)",
                gridTemplateColumns: isCompleted
                  ? "2rem 2rem 1fr 1fr 1fr 5rem 4rem"
                  : "2rem 1fr 1fr 1fr 5rem",
              }}
            >
              <span>#</span>
              {isCompleted && <span>Pos</span>}
              <span>Horse</span>
              <span>Jockey</span>
              <span>Trainer</span>
              <span className="text-right">Odds</span>
              {isCompleted && <span className="text-right">Time</span>}
            </div>

            {race.entries.map((entry, i) => (
              <EntryRow
                key={entry.id}
                entry={entry}
                isCompleted={isCompleted}
                isFirst={isCompleted && entry.finishPos === 1}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

type Race = NonNullable<Awaited<ReturnType<typeof getRace>>>;
type Entry = Race["entries"][number];

function EntryRow({
  entry,
  isCompleted,
  isFirst,
}: {
  entry: Entry;
  isCompleted: boolean;
  isFirst: boolean;
}) {
  return (
    <GlassCard
      variant={isFirst ? "default" : "subtle"}
      radius="lg"
      padding="md"
      className="relative overflow-hidden flex flex-col"
    >
      {isFirst && (
        <div
          className="absolute inset-y-0 left-0 w-1 rounded-l-lg"
          style={{ background: "var(--green-500)" }}
        />
      )}
      <div
        className="grid gap-3 sm:gap-4 items-center"
        style={{
          gridTemplateColumns: isCompleted
            ? "2rem 2rem 1fr 1fr 1fr auto auto"
            : "2rem 1fr 1fr 1fr auto",
        }}
      >
        {/* Saddle no */}
        <span
          className="text-sm font-bold tabular-nums"
          style={{ color: "var(--text-tertiary)" }}
        >
          {entry.saddleNo ?? "—"}
        </span>

        {/* Finish position */}
        {isCompleted && (
          <span
            className="text-sm font-bold tabular-nums"
            style={{
              color:
                entry.finishPos === 1
                  ? "var(--green-700)"
                  : entry.finishPos != null && entry.finishPos <= 3
                  ? "var(--green-600)"
                  : "var(--text-tertiary)",
            }}
          >
            {entry.finishPos != null ? `${entry.finishPos}.` : "—"}
          </span>
        )}

        {/* Horse */}
        <div className="flex flex-col gap-0 min-w-0">
          <Link
            href={`/horses/${entry.horse.id}`}
            className="text-sm font-semibold truncate hover:underline"
            style={{
              color: "var(--text-primary)",
              fontFamily: "var(--font-display)",
            }}
          >
            {entry.horse.name}
          </Link>
          {entry.horse.gender && (
            <span
              className="text-xs capitalize"
              style={{ color: "var(--text-tertiary)" }}
            >
              {entry.horse.gender}
            </span>
          )}
        </div>

        {/* Jockey */}
        <span className="text-sm truncate" style={{ color: "var(--text-secondary)" }}>
          {entry.jockey?.name ?? "—"}
        </span>

        {/* Trainer */}
        <span className="text-sm truncate" style={{ color: "var(--text-secondary)" }}>
          {entry.horse.trainer?.name ?? "—"}
        </span>

        {/* Odds */}
        <span
          className="text-sm font-semibold tabular-nums text-right"
          style={{ color: "var(--navy-800)" }}
        >
          {entry.odds != null ? `${entry.odds.toFixed(1)}x` : "—"}
        </span>

        {/* Finish time */}
        {isCompleted && (
          <span
            className="text-sm tabular-nums text-right"
            style={{ color: "var(--text-tertiary)" }}
          >
            {entry.finishTime != null
              ? `${entry.finishTime.toFixed(1)}s`
              : "—"}
          </span>
        )}
      </div>

      {!isCompleted && (
        <BetButton
          raceEntryId={entry.id}
          horseName={entry.horse.name}
          defaultOdds={entry.odds}
        />
      )}
    </GlassCard>
  );
}

function MetaStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span
        className="text-xs font-medium tracking-widest uppercase"
        style={{ color: "var(--text-tertiary)" }}
      >
        {label}
      </span>
      <span
        className="text-sm font-semibold"
        style={{
          color: accent ? "var(--green-700)" : "var(--text-primary)",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    SCHEDULED: { label: "Upcoming", bg: "var(--green-50)", color: "var(--green-700)" },
    COMPLETED: { label: "Completed", bg: "var(--gray-100)", color: "var(--gray-500)" },
    CANCELLED: { label: "Cancelled", bg: "#FEF2F2", color: "#B91C1C" },
    POSTPONED: { label: "Postponed", bg: "#FFFBEB", color: "#B45309" },
  };
  const badge = map[status] ?? map.SCHEDULED;
  return (
    <span
      className="shrink-0 text-sm font-semibold px-3 py-1.5 rounded-full"
      style={{ background: badge.bg, color: badge.color }}
    >
      {badge.label}
    </span>
  );
}
