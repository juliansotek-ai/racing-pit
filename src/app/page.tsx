import { format, isToday, isTomorrow, startOfDay } from "date-fns";
import { prisma } from "@/lib/prisma";
import { GlassCard, Button } from "@/components/ui";
import { RaceCard } from "@/components/RaceCard";

async function getRaces() {
  const [upcoming, recent] = await Promise.all([
    prisma.race.findMany({
      where: { status: "SCHEDULED", scheduledAt: { gte: new Date() } },
      include: {
        racecourse: true,
        entries: { select: { id: true } },
      },
      orderBy: { scheduledAt: "asc" },
      take: 20,
    }),
    prisma.race.findMany({
      where: { status: "COMPLETED" },
      include: {
        racecourse: true,
        entries: { select: { id: true } },
      },
      orderBy: { scheduledAt: "desc" },
      take: 5,
    }),
  ]);
  return { upcoming, recent };
}

function groupByDate(races: Awaited<ReturnType<typeof getRaces>>["upcoming"]) {
  const groups = new Map<string, typeof races>();
  for (const race of races) {
    const key = startOfDay(new Date(race.scheduledAt)).toISOString();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(race);
  }
  return groups;
}

function dateLabel(iso: string) {
  const d = new Date(iso);
  if (isToday(d)) return "Today";
  if (isTomorrow(d)) return "Tomorrow";
  return format(d, "EEEE, d MMMM");
}

export default async function Home() {
  const { upcoming, recent } = await getRaces();
  const grouped = groupByDate(upcoming);

  return (
    <main className="flex flex-col min-h-screen px-6 py-12 max-w-5xl mx-auto gap-14">

      {/* Hero */}
      <section className="flex flex-col gap-6 pt-8">
        <div className="flex flex-col gap-3">
          <span
            className="text-sm font-medium tracking-widest uppercase"
            style={{ color: "var(--green-600)" }}
          >
            Racing Pit
          </span>
          <h1 className="display-2xl" style={{ color: "var(--green-900)" }}>
            Track every<br />
            <em>race, bet &amp; form.</em>
          </h1>
          <p className="text-lg leading-relaxed max-w-md" style={{ color: "var(--text-secondary)" }}>
            Your personal racing intelligence. Follow horses, trainers and
            jockeys — and log every bet with full context.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button size="lg">Get started</Button>
          <Button size="lg" variant="glass">View all races</Button>
        </div>
      </section>

      {/* Upcoming races */}
      <section className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h2 className="display-lg" style={{ color: "var(--green-900)" }}>
            Upcoming races
          </h2>
          {upcoming.length > 0 && (
            <span className="text-sm" style={{ color: "var(--text-tertiary)" }}>
              {upcoming.length} race{upcoming.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {upcoming.length === 0 ? (
          <GlassCard variant="subtle" radius="xl" padding="lg">
            <p style={{ color: "var(--text-secondary)" }}>No upcoming races scheduled.</p>
          </GlassCard>
        ) : (
          <div className="flex flex-col gap-8">
            {Array.from(grouped.entries()).map(([isoDate, races]) => (
              <div key={isoDate} className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <span
                    className="text-sm font-semibold tracking-wide"
                    style={{ color: "var(--green-700)" }}
                  >
                    {dateLabel(isoDate)}
                  </span>
                  <div className="flex-1 h-px" style={{ background: "var(--glass-border-subtle)" }} />
                  <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                    {format(new Date(isoDate), "d MMM yyyy")}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {races.map((race) => (
                    <RaceCard key={race.id} race={race} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recent results */}
      {recent.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="display-lg" style={{ color: "var(--green-900)" }}>
            Recent results
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {recent.map((race) => (
              <RaceCard key={race.id} race={race} />
            ))}
          </div>
        </section>
      )}

      {/* Stats row */}
      <GlassCard variant="subtle" radius="2xl" padding="lg">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          {[
            { label: "Upcoming races", value: String(upcoming.length) },
            { label: "Completed races", value: String(recent.length) },
            { label: "Bets placed", value: "—" },
            { label: "ROI", value: "—" },
          ].map(({ label, value }) => (
            <div key={label} className="flex flex-col gap-1">
              <span className="display-lg" style={{ color: "var(--green-800)" }}>{value}</span>
              <span className="text-xs font-medium tracking-wide uppercase" style={{ color: "var(--text-tertiary)" }}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </GlassCard>

    </main>
  );
}
