import { notFound } from "next/navigation";
import Link from "next/link";
import { format, differenceInYears } from "date-fns";
import { prisma } from "@/lib/prisma";
import { GlassCard } from "@/components/ui";
import { FavoriteButton } from "@/components/FavoriteButton";
import { NoteEditor } from "@/components/NoteEditor";

async function getHorse(id: string) {
  return prisma.horse.findUnique({
    where: { id },
    include: {
      trainer: true,
      country: true,
      raceEntries: {
        include: {
          race: { include: { racecourse: true } },
          jockey: true,
        },
        orderBy: { race: { scheduledAt: "desc" } },
      },
    },
  });
}

function computeStats(entries: NonNullable<Awaited<ReturnType<typeof getHorse>>>["raceEntries"]) {
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

export default async function HorsePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const horse = await getHorse(id);
  if (!horse) notFound();

  const stats = computeStats(horse.raceEntries);
  const age = horse.dateOfBirth
    ? differenceInYears(new Date(), new Date(horse.dateOfBirth))
    : null;

  const upcomingEntries = horse.raceEntries.filter(
    (e) => e.race.status === "SCHEDULED"
  );
  const pastEntries = horse.raceEntries.filter(
    (e) => e.race.status === "COMPLETED"
  );

  return (
    <main className="flex flex-col min-h-screen px-6 py-12 max-w-5xl mx-auto gap-8">

      {/* Back */}
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
            <h1
              className="display-xl"
              style={{ color: "var(--green-900)", fontFamily: "var(--font-display)" }}
            >
              {horse.name}
            </h1>
            <p className="text-base" style={{ color: "var(--text-secondary)" }}>
              {[
                horse.gender && capitalize(horse.gender),
                age != null && `${age}yo`,
                horse.color,
                horse.country.name,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <FavoriteButton horseId={horse.id} />
        </div>

        {/* Meta */}
        <GlassCard variant="subtle" radius="xl" padding="lg">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {horse.trainer && (
              <MetaStat label="Trainer" value={horse.trainer.name} />
            )}
            {horse.sire && <MetaStat label="Sire" value={horse.sire} />}
            {horse.dam && <MetaStat label="Dam" value={horse.dam} />}
            {horse.dateOfBirth && (
              <MetaStat
                label="Born"
                value={format(new Date(horse.dateOfBirth), "d MMM yyyy")}
              />
            )}
          </div>
        </GlassCard>
      </div>

      {/* Stats */}
      <GlassCard variant="default" radius="2xl" padding="lg">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          <StatBox label="Runs" value={String(stats.runs)} />
          <StatBox label="Wins" value={String(stats.wins)} accent />
          <StatBox label="Places" value={String(stats.places)} />
          <StatBox
            label="Win rate"
            value={stats.winRate != null ? `${stats.winRate}%` : "—"}
          />
        </div>
      </GlassCard>

      {/* Upcoming entries */}
      {upcomingEntries.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="display-md" style={{ color: "var(--green-900)" }}>
            Upcoming races
          </h2>
          <div className="flex flex-col gap-2">
            <div
              className="hidden sm:grid gap-4 px-4 pb-1 text-xs font-semibold tracking-widest uppercase"
              style={{ color: "var(--text-tertiary)", gridTemplateColumns: "1fr 1fr 5rem 4rem 4rem" }}
            >
              <span>Race</span>
              <span>Jockey</span>
              <span>Conditions</span>
              <span className="text-right">Dist</span>
              <span className="text-right">Saddle</span>
            </div>
            {upcomingEntries.map((entry) => {
              const conditions = [entry.race.raceClass, entry.race.surface ? capitalize(entry.race.surface) : null]
                .filter(Boolean).join(" · ") || "—";
              return (
                <GlassCard key={entry.id} variant="subtle" radius="lg" padding="md">
                  <div className="grid gap-3 sm:gap-4 items-center" style={{ gridTemplateColumns: "1fr 1fr 5rem 4rem 4rem" }}>
                    <Link href={`/races/${entry.race.id}`} className="flex flex-col min-w-0 hover:underline">
                      <span className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
                        {entry.race.name}
                      </span>
                      <span className="text-xs truncate" style={{ color: "var(--text-tertiary)" }}>{entry.race.racecourse.name}</span>
                    </Link>
                    <span className="text-sm truncate" style={{ color: "var(--text-secondary)" }}>{entry.jockey?.name ?? "—"}</span>
                    <span className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>{conditions}</span>
                    <span className="text-sm text-right tabular-nums" style={{ color: "var(--text-secondary)" }}>{entry.race.distance}m</span>
                    <span className="text-sm text-right tabular-nums" style={{ color: "var(--text-secondary)" }}>
                      {entry.saddleNo != null ? `#${entry.saddleNo}` : "—"}
                    </span>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        </section>
      )}

      {/* Recent activity */}
      <section className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between">
          <h2 className="display-md" style={{ color: "var(--green-900)" }}>
            Recent activity
          </h2>
          {pastEntries.length > 5 && (
            <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
              Last 5 of {pastEntries.length} races
            </span>
          )}
        </div>

        {pastEntries.length === 0 ? (
          <GlassCard variant="subtle" radius="xl" padding="lg">
            <p style={{ color: "var(--text-secondary)" }}>No race history yet.</p>
          </GlassCard>
        ) : (
          <div className="flex flex-col gap-2">
            <FormHeader />
            {pastEntries.slice(0, 5).map((entry) => (
              <FormRow key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </section>

      <NoteEditor horseId={horse.id} />
    </main>
  );
}

type Entry = NonNullable<Awaited<ReturnType<typeof getHorse>>>["raceEntries"][number];

function FormHeader() {
  return (
    <div
      className="hidden sm:grid gap-4 px-4 pb-1 text-xs font-semibold tracking-widest uppercase"
      style={{ color: "var(--text-tertiary)", gridTemplateColumns: "5rem 1fr 1fr 5rem 4rem 3rem" }}
    >
      <span>Date</span>
      <span>Race</span>
      <span>Jockey</span>
      <span>Conditions</span>
      <span className="text-right">Dist</span>
      <span className="text-right">Pos</span>
    </div>
  );
}

function FormRow({ entry }: { entry: Entry }) {
  const isWin = entry.finishPos === 1;
  const isPlace = entry.finishPos != null && entry.finishPos <= 3;
  const conditions = [entry.race.raceClass, entry.race.surface ? capitalize(entry.race.surface) : null]
    .filter(Boolean)
    .join(" · ") || "—";

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
        style={{ gridTemplateColumns: "5rem 1fr 1fr 5rem 4rem 3rem" }}
      >
        <span className="text-xs tabular-nums" style={{ color: "var(--text-tertiary)" }}>
          {format(new Date(entry.race.scheduledAt), "d MMM yy")}
        </span>

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

        <span className="text-sm truncate" style={{ color: "var(--text-secondary)" }}>
          {entry.jockey?.name ?? "—"}
        </span>

        <span className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>
          {conditions}
        </span>

        <span className="text-sm text-right tabular-nums" style={{ color: "var(--text-secondary)" }}>
          {entry.race.distance}m
        </span>

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
      </div>
    </GlassCard>
  );
}

function MetaStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span
        className="text-xs font-medium tracking-widest uppercase"
        style={{ color: "var(--text-tertiary)" }}
      >
        {label}
      </span>
      <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
        {value}
      </span>
    </div>
  );
}

function StatBox({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span
        className="display-lg"
        style={{ color: accent ? "var(--green-700)" : "var(--green-800)" }}
      >
        {value}
      </span>
      <span
        className="text-xs font-medium tracking-wide uppercase"
        style={{ color: "var(--text-tertiary)" }}
      >
        {label}
      </span>
    </div>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
