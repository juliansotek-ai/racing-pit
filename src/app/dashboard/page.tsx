export const dynamic = "force-dynamic";
import { format } from "date-fns";
import Link from "next/link";
import { getUpcomingMeetings, getTopHorses, getTopJockeys, getTopTrainers, getFollowedHorsesRacingToday } from "@/lib/stats";
import { GlassCard, LeaderboardTable, IllustrationSlot } from "@/components/ui";
import type { LeaderboardRow } from "@/components/ui";
import { auth } from "@/lib/auth";

type Meeting = Awaited<ReturnType<typeof getUpcomingMeetings>>[number];

function formatRaceTime(date: Date): string {
  return date.getTime() % 86400000 === 0 ? "N/A" : format(date, "HH:mm");
}

function MeetingCard({ meeting }: { meeting: Meeting }) {
  return (
    <Link href={`/races/${meeting.date}/${meeting.racecourseId}`} className="block group">
      <GlassCard
        variant="default"
        radius="xl"
        padding="lg"
        className="flex flex-col gap-3 h-full transition-shadow duration-200 group-hover:shadow-[var(--glass-shadow-md)]"
      >
        <div className="flex flex-col gap-0.5 min-w-0">
          <span
            className="font-semibold text-base leading-snug"
            style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}
          >
            {format(meeting.firstStart, "EEE, d MMM yyyy")}
          </span>
          <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {meeting.racecourse.name} · {meeting.racecourse.city}
          </span>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <Stat label="Races" value={String(meeting.raceCount)} />
          <Stat label="First off" value={formatRaceTime(meeting.firstStart)} />
          {meeting.totalRunners > 0 && (
            <Stat label="Runners" value={String(meeting.totalRunners)} />
          )}
        </div>
      </GlassCard>
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0">
      <span className="text-xs font-medium tracking-wide uppercase" style={{ color: "var(--text-tertiary)" }}>
        {label}
      </span>
      <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
        {value}
      </span>
    </div>
  );
}

type FollowedEntry = Awaited<ReturnType<typeof getFollowedHorsesRacingToday>>[number];

function FollowedHorseCard({ entry }: { entry: FollowedEntry }) {
  const isCompleted = entry.race.status === "COMPLETED";
  const dateStr = new Date(entry.race.scheduledAt).toISOString().slice(0, 10);

  return (
    <Link href={`/races/${dateStr}/${entry.race.racecourseId}`} className="block group">
      <GlassCard
        variant="default"
        radius="xl"
        padding="lg"
        className="flex flex-col gap-3 h-full transition-shadow duration-200 group-hover:shadow-[var(--glass-shadow-md)]"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-0.5 min-w-0">
            <span
              className="font-semibold text-base leading-snug truncate"
              style={{ color: "var(--green-900)", fontFamily: "var(--font-display)" }}
            >
              {entry.horse.name}
            </span>
            <span className="text-sm truncate" style={{ color: "var(--text-secondary)" }}>
              {entry.race.racecourse.name} · {entry.race.racecourse.city}
            </span>
          </div>
          {isCompleted && entry.finishPos != null ? (
            <span
              className="shrink-0 text-xs font-bold px-2 py-0.5 rounded-full"
              style={{
                background: entry.finishPos === 1 ? "var(--green-100)" : "var(--glass-bg)",
                color: entry.finishPos === 1 ? "var(--green-700)" : "var(--text-secondary)",
                border: "1px solid var(--glass-border)",
              }}
            >
              {entry.finishPos === 1 ? "1st ★" : `${entry.finishPos}${ordinal(entry.finishPos)}`}
            </span>
          ) : (
            <span
              className="shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ background: "var(--green-50)", color: "var(--green-700)" }}
            >
              {format(new Date(entry.race.scheduledAt), "HH:mm")}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <Stat label="Race" value={entry.race.name} />
          {entry.jockey && <Stat label="Jockey" value={entry.jockey.name} />}
          {entry.odds != null && <Stat label="Odds" value={`${entry.odds}`} />}
          {entry.saddleNo != null && <Stat label="No." value={String(entry.saddleNo)} />}
        </div>
      </GlassCard>
    </Link>
  );
}

function ordinal(n: number) {
  if (n === 1) return "st";
  if (n === 2) return "nd";
  if (n === 3) return "rd";
  return "th";
}

export default async function DashboardPage() {
  const session = await auth();
  const userId = session?.user?.id;

  const [upcomingMeetings, topHorses, topJockeys, topTrainers, followedRacing] = await Promise.all([
    getUpcomingMeetings(6),
    getTopHorses(10),
    getTopJockeys(10),
    getTopTrainers(10),
    userId ? getFollowedHorsesRacingToday(userId) : Promise.resolve(null),
  ]);

  const horseRows: LeaderboardRow[] = topHorses.map((h, i) => ({
    id: h.id,
    rank: i + 1,
    name: h.name,
    sub: h.trainer?.name,
    href: `/horses/${h.id}`,
    cols: [
      h.totalRaces,
      h.wins,
      h.avgPosition.toFixed(1),
      h.bestPosition,
    ],
  }));

  const jockeyRows: LeaderboardRow[] = topJockeys.map((j, i) => ({
    id: j.id,
    rank: i + 1,
    name: j.name,
    href: `/jockeys/${j.id}`,
    cols: [
      j.totalRides,
      j.wins,
      j.wins > 0 ? `${((j.wins / j.totalRides) * 100).toFixed(0)}%` : "—",
      j.avgPosition.toFixed(1),
    ],
  }));

  const trainerRows: LeaderboardRow[] = topTrainers.map((t, i) => ({
    id: t.id,
    rank: i + 1,
    name: t.name,
    href: `/trainers/${t.id}`,
    cols: [
      t.totalRunners,
      t.wins,
      t.wins > 0 ? `${((t.wins / t.totalRunners) * 100).toFixed(0)}%` : "—",
      t.avgPosition.toFixed(1),
    ],
  }));

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 flex flex-col gap-10">

      {/* Page title */}
      <div className="flex flex-col gap-1">
        <h1 className="display-xl" style={{ color: "var(--green-900)" }}>
          Dashboard
        </h1>
        <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
          {format(new Date(), "EEEE, d MMMM yyyy")}
        </p>
      </div>

      {/* ── Your Horses Today ─────────────────────────────────────── */}
      {followedRacing !== null && (
        <section className="flex flex-col gap-4">
          <SectionHeader
            title="Your Horses Today"
            href="/horses"
            count={followedRacing.length}
          />
          {followedRacing.length === 0 ? (
            <GlassCard variant="default" radius="xl" padding="lg">
              <p className="text-sm text-center py-2" style={{ color: "var(--text-tertiary)" }}>
                None of your followed horses are running today.
              </p>
            </GlassCard>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {followedRacing.map((entry) => (
                <FollowedHorseCard key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Upcoming Meetings ──────────────────────────────────────── */}
      <section className="flex flex-col gap-4">
        <SectionHeader title="Upcoming Meetings" href="/races/upcoming" count={upcomingMeetings.length} />

        {upcomingMeetings.length === 0 ? (
          <EmptyState label="No upcoming races" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingMeetings.map((m) => (
              <MeetingCard key={`${m.date}:${m.racecourseId}`} meeting={m} />
            ))}
          </div>
        )}
      </section>

      {/* ── Horses + Jockeys ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="flex flex-col gap-4">
          <SectionHeader title="Top Horses" href="/horses" />
          <LeaderboardTable
            title="Horses"
            headers={["Races", "Wins", "Avg", "Best"]}
            rows={horseRows}
            viewAllHref="/horses"
            emptyMessage="No race results recorded yet."
            accentColor="green"
          />
        </section>

        <section className="flex flex-col gap-4">
          <SectionHeader title="Top Jockeys" href="/jockeys" accentColor="navy" />
          <LeaderboardTable
            title="Jockeys"
            headers={["Rides", "Wins", "Win%", "Avg"]}
            rows={jockeyRows}
            viewAllHref="/jockeys"
            emptyMessage="No race results recorded yet."
            accentColor="navy"
          />
        </section>
      </div>

      {/* ── Trainers ───────────────────────────────────────────────── */}
      <section className="flex flex-col gap-4">
        <SectionHeader title="Top Trainers" href="/trainers" />
        <LeaderboardTable
          title="Trainers"
          headers={["Runners", "Wins", "Win%", "Avg Pos"]}
          rows={trainerRows}
          viewAllHref="/trainers"
          emptyMessage="No race results recorded yet."
          accentColor="green"
        />
      </section>

    </main>
  );
}

/* ─── Shared sub-components ────────────────────────────────────── */

function SectionHeader({
  title,
  href,
  count,
  accentColor = "green",
}: {
  title: string;
  href: string;
  count?: number;
  accentColor?: "green" | "navy";
}) {
  const color = accentColor === "green" ? "var(--green-900)" : "var(--navy-800)";
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <h2 className="display-lg" style={{ color }}>{title}</h2>
        {count !== undefined && count > 0 && (
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full"
            style={{ background: "var(--green-50)", color: "var(--green-700)" }}
          >
            {count}
          </span>
        )}
      </div>
      <Link
        href={href}
        className="text-xs font-medium transition-colors hover:underline"
        style={{ color: "var(--text-tertiary)" }}
      >
        View all →
      </Link>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <IllustrationSlot
      alt={label}
      label={label}
      aspectClass="aspect-[3/1]"
      className="w-full"
    />
  );
}
