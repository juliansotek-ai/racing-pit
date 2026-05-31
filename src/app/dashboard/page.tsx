export const dynamic = "force-dynamic";
import { format } from "date-fns";
import Link from "next/link";
import { getUpcomingMeetings, getTopHorses, getTopJockeys, getTopTrainers } from "@/lib/stats";
import { GlassCard, LeaderboardTable, IllustrationSlot } from "@/components/ui";
import type { LeaderboardRow } from "@/components/ui";

type Meeting = Awaited<ReturnType<typeof getUpcomingMeetings>>[number];

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
          <Stat label="First off" value={format(meeting.firstStart, "HH:mm")} />
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

export default async function DashboardPage() {
  const [upcomingMeetings, topHorses, topJockeys, topTrainers] = await Promise.all([
    getUpcomingMeetings(6),
    getTopHorses(10),
    getTopJockeys(10),
    getTopTrainers(10),
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

      {/* ── Upcoming Meetings ──────────────────────────────────────── */}
      <section className="flex flex-col gap-4">
        <SectionHeader title="Upcoming Meetings" href="/races" count={upcomingMeetings.length} />

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
