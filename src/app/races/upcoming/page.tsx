export const dynamic = "force-dynamic";
import { Suspense } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { GlassCard } from "@/components/ui";
import { getUpcomingMeetingsAll, getUpcomingDateRange } from "@/lib/stats";
import { DateRangeFilter } from "./DateRangeFilter";

type Meeting = Awaited<ReturnType<typeof getUpcomingMeetingsAll>>[number];

function formatRaceTime(date: Date): string {
  return date.getTime() % 86400000 === 0 ? "N/A" : format(date, "HH:mm");
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0">
      <span
        className="text-xs font-medium tracking-wide uppercase"
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

function MeetingCard({ meeting }: { meeting: Meeting }) {
  return (
    <Link
      href={`/races/${meeting.date}/${meeting.racecourseId}`}
      className="block group"
    >
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

export default async function UpcomingRacesPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from, to } = await searchParams;

  const [dateRange, meetings] = await Promise.all([
    getUpcomingDateRange(),
    getUpcomingMeetingsAll(
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined
    ),
  ]);

  const hasFilter = from || to;

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 flex flex-col gap-8">

      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="display-xl" style={{ color: "var(--green-900)" }}>
            Upcoming Races
          </h1>
          <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
            {meetings.length} meeting{meetings.length !== 1 ? "s" : ""}
            {hasFilter ? " in selected range" : ""}
          </p>
        </div>
        <Link
          href="/races"
          className="text-sm transition-opacity hover:opacity-70 shrink-0"
          style={{ color: "var(--text-secondary)" }}
        >
          ← All Races
        </Link>
      </div>

      <GlassCard variant="default" radius="xl" padding="lg">
        <div className="flex flex-col gap-3">
          <p
            className="text-xs font-medium tracking-wide uppercase"
            style={{ color: "var(--text-tertiary)" }}
          >
            Filter by date range
          </p>
          <Suspense fallback={null}>
            <DateRangeFilter
              min={dateRange.min}
              max={dateRange.max}
              from={from ?? ""}
              to={to ?? ""}
            />
          </Suspense>
          {dateRange.min && dateRange.max && (
            <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
              Races available from {format(new Date(dateRange.min), "d MMM yyyy")} to{" "}
              {format(new Date(dateRange.max), "d MMM yyyy")}
            </p>
          )}
        </div>
      </GlassCard>

      {meetings.length === 0 ? (
        <GlassCard variant="subtle" radius="xl" padding="lg">
          <p className="text-sm text-center py-2" style={{ color: "var(--text-secondary)" }}>
            No upcoming races{hasFilter ? " in the selected date range" : ""}.
          </p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {meetings.map((m) => (
            <MeetingCard key={`${m.date}:${m.racecourseId}`} meeting={m} />
          ))}
        </div>
      )}

    </main>
  );
}
