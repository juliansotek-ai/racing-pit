export const dynamic = "force-dynamic";
import Link from "next/link";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { GlassCard } from "@/components/ui";

async function getRaces() {
  return prisma.race.findMany({
    include: {
      racecourse: { select: { id: true, name: true, city: true } },
      entries: { select: { id: true } },
    },
    orderBy: { scheduledAt: "asc" },
  });
}

type Race = Awaited<ReturnType<typeof getRaces>>[number];

type Meeting = {
  key: string;
  date: string;
  racecourseId: string;
  racecourse: { name: string; city: string };
  races: Race[];
  firstStart: Date;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED" | "POSTPONED";
};

function groupIntoMeetings(races: Race[]): Meeting[] {
  const map = new Map<string, Meeting>();

  for (const race of races) {
    const dateStr = new Date(race.scheduledAt).toISOString().slice(0, 10);
    const key = `${dateStr}:${race.racecourseId}`;

    if (!map.has(key)) {
      map.set(key, {
        key,
        date: dateStr,
        racecourseId: race.racecourseId,
        racecourse: race.racecourse,
        races: [],
        firstStart: new Date(race.scheduledAt),
        status: "SCHEDULED",
      });
    }

    const m = map.get(key)!;
    m.races.push(race);
    if (new Date(race.scheduledAt) < m.firstStart) {
      m.firstStart = new Date(race.scheduledAt);
    }
  }

  for (const m of map.values()) {
    const statuses = m.races.map((r) => r.status);
    if (statuses.every((s) => s === "COMPLETED")) m.status = "COMPLETED";
    else if (statuses.every((s) => s === "CANCELLED")) m.status = "CANCELLED";
    else if (statuses.every((s) => s === "POSTPONED")) m.status = "POSTPONED";
    else m.status = "SCHEDULED";
  }

  return Array.from(map.values());
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
      className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full"
      style={{ background: b.bg, color: b.color }}
    >
      {b.label}
    </span>
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

function formatRaceTime(date: Date): string {
  return date.getTime() % 86400000 === 0 ? "N/A" : format(date, "HH:mm");
}

function MeetingCard({ meeting }: { meeting: Meeting }) {
  const totalRunners = meeting.races.reduce((sum, r) => sum + r.entries.length, 0);
  return (
    <Link href={`/races/${meeting.date}/${meeting.racecourseId}`} className="block group">
      <GlassCard
        variant="default"
        radius="xl"
        padding="lg"
        className="flex flex-col gap-3 h-full transition-shadow duration-200 group-hover:shadow-[var(--glass-shadow-md)]"
      >
        <div className="flex items-start justify-between gap-3">
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
          <StatusBadge status={meeting.status} />
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <Stat label="Races" value={String(meeting.races.length)} />
          <Stat label="First off" value={formatRaceTime(meeting.firstStart)} />
          {totalRunners > 0 && <Stat label="Runners" value={String(totalRunners)} />}
        </div>
      </GlassCard>
    </Link>
  );
}

export default async function RacesPage() {
  const all = await getRaces();
  const meetings = groupIntoMeetings(all);

  const now = new Date();

  const upcoming = meetings
    .filter((m) => (m.status === "SCHEDULED" || m.status === "POSTPONED") && m.firstStart >= now)
    .sort((a, b) => a.firstStart.getTime() - b.firstStart.getTime());

  const past = meetings
    .filter((m) => m.status === "COMPLETED" || m.status === "CANCELLED" ||
      ((m.status === "SCHEDULED" || m.status === "POSTPONED") && m.firstStart < now))
    .sort((a, b) => b.firstStart.getTime() - a.firstStart.getTime());

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 flex flex-col gap-10">

      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="display-xl" style={{ color: "var(--green-900)" }}>Races</h1>
          <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
            {upcoming.length} upcoming · {past.length} past
          </p>
        </div>
        <Link
          href="/dashboard"
          className="text-sm transition-opacity hover:opacity-70"
          style={{ color: "var(--text-secondary)" }}
        >
          ← Dashboard
        </Link>
      </div>

      {meetings.length === 0 && (
        <GlassCard variant="subtle" radius="xl" padding="lg">
          <p style={{ color: "var(--text-secondary)" }}>No races yet.</p>
        </GlassCard>
      )}

      {upcoming.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="display-md" style={{ color: "var(--green-900)" }}>Upcoming</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {upcoming.map((m) => <MeetingCard key={m.key} meeting={m} />)}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="display-md" style={{ color: "var(--green-900)" }}>Past Meetings</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {past.map((m) => <MeetingCard key={m.key} meeting={m} />)}
          </div>
        </section>
      )}

    </main>
  );
}
