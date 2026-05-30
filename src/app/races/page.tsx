export const dynamic = "force-dynamic";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { RaceCard } from "@/components/RaceCard";
import { GlassCard } from "@/components/ui";

async function getRaces() {
  return prisma.race.findMany({
    include: {
      racecourse: { select: { name: true, city: true } },
      entries: { select: { id: true } },
    },
    orderBy: { scheduledAt: "asc" },
  });
}

export default async function RacesPage() {
  const all = await getRaces();
  const upcoming = all.filter((r) => r.status === "SCHEDULED" || r.status === "POSTPONED");
  const past = all.filter((r) => r.status === "COMPLETED" || r.status === "CANCELLED").reverse();

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 flex flex-col gap-10">

      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="display-xl" style={{ color: "var(--green-900)" }}>Races</h1>
          <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
            {upcoming.length} upcoming · {past.length} completed
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

      {all.length === 0 && (
        <GlassCard variant="subtle" radius="xl" padding="lg">
          <p style={{ color: "var(--text-secondary)" }}>No races yet.</p>
        </GlassCard>
      )}

      {upcoming.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="display-md" style={{ color: "var(--green-900)" }}>Upcoming</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcoming.map((race) => (
              <RaceCard key={race.id} race={race} />
            ))}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="display-md" style={{ color: "var(--green-900)" }}>Past Races</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {past.map((race) => (
              <RaceCard key={race.id} race={race} />
            ))}
          </div>
        </section>
      )}

    </main>
  );
}
