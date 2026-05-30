import Link from "next/link";
import { format } from "date-fns";
import { GlassCard } from "@/components/ui";

type Props = {
  race: {
    id: string;
    name: string;
    scheduledAt: Date;
    distance: number;
    raceClass: string | null;
    prize: number | null;
    status: string;
    racecourse: { name: string; city: string };
    entries: { id: string }[];
  };
};

export function RaceCard({ race }: Props) {
  const isCompleted = race.status === "COMPLETED";

  return (
    <Link href={`/races/${race.id}`} className="block group">
      <GlassCard
        variant="default"
        radius="xl"
        padding="lg"
        className="flex flex-col gap-3 transition-shadow duration-200 group-hover:shadow-[var(--glass-shadow-md)]"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-0.5 min-w-0">
            <span
              className="font-semibold text-base leading-snug truncate"
              style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}
            >
              {race.name}
            </span>
            <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
              {race.racecourse.name} · {race.racecourse.city}
            </span>
          </div>

          <StatusBadge status={race.status} />
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <Stat label="Time" value={format(new Date(race.scheduledAt), "HH:mm")} />
          <Stat label="Distance" value={`${race.distance}m`} />
          {race.raceClass && <Stat label="Class" value={race.raceClass} accent />}
          {race.prize != null && (
            <Stat label="Prize" value={`€${(race.prize / 1000).toFixed(0)}k`} />
          )}
          <Stat label="Runners" value={String(race.entries.length)} />
        </div>
      </GlassCard>
    </Link>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex flex-col gap-0">
      <span
        className="text-xs font-medium tracking-wide uppercase"
        style={{ color: "var(--text-tertiary)" }}
      >
        {label}
      </span>
      <span
        className="text-sm font-semibold"
        style={{ color: accent ? "var(--green-700)" : "var(--text-primary)" }}
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
      className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full"
      style={{ background: badge.bg, color: badge.color }}
    >
      {badge.label}
    </span>
  );
}
