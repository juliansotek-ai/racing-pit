export const dynamic = "force-dynamic";
import Link from "next/link";
import { format, startOfDay, endOfDay } from "date-fns";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GlassCard } from "@/components/ui";
import { SettleBetButton } from "@/components/SettleBetButton";
import { BetsTabStrip } from "@/components/BetsTabStrip";

async function getTodayBets(userId: string) {
  const now = new Date();
  return prisma.bet.findMany({
    where: {
      userId,
      raceEntry: {
        race: { scheduledAt: { gte: startOfDay(now), lte: endOfDay(now) } },
      },
    },
    include: {
      raceEntry: {
        include: {
          race: { include: { racecourse: true } },
          horse: true,
          jockey: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

async function countPastUnsettled(userId: string) {
  const now = new Date();
  return prisma.bet.count({
    where: {
      userId,
      result: null,
      raceEntry: { race: { scheduledAt: { lt: startOfDay(now) } } },
    },
  });
}

type Bet = Awaited<ReturnType<typeof getTodayBets>>[number];
type Race = Bet["raceEntry"]["race"];

function groupByRace(bets: Bet[]) {
  const map = new Map<string, { race: Race; bets: Bet[] }>();
  for (const bet of bets) {
    const race = bet.raceEntry.race;
    if (!map.has(race.id)) map.set(race.id, { race, bets: [] });
    map.get(race.id)!.bets.push(bet);
  }
  return Array.from(map.values()).sort(
    (a, b) =>
      new Date(a.race.scheduledAt).getTime() -
      new Date(b.race.scheduledAt).getTime()
  );
}

export default async function BetsTodayPage() {
  const session = await auth();
  if (!session?.user?.id) {
    return (
      <main className="flex flex-col min-h-screen px-6 py-12 max-w-5xl mx-auto gap-8">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--text-tertiary)" }}>
            {format(new Date(), "EEEE, d MMMM yyyy")}
          </p>
          <h1 className="display-xl" style={{ color: "var(--green-900)", fontFamily: "var(--font-display)" }}>
            Race Day
          </h1>
        </div>
        <BetsTabStrip />
        <GlassCard variant="subtle" radius="xl" padding="lg">
          <div className="flex flex-col gap-3 items-center text-center py-6">
            <p className="text-base font-medium" style={{ color: "var(--text-primary)" }}>
              Sign in to view your Race Day
            </p>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              See all your bets for today&apos;s races once you&apos;re logged in.
            </p>
            <Link
              href="/auth/signin"
              className="mt-2 px-5 py-2.5 rounded-[var(--radius-md)] text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: "var(--green-800)" }}
            >
              Sign in
            </Link>
          </div>
        </GlassCard>
      </main>
    );
  }

  const [bets, pastUnsettledCount] = await Promise.all([
    getTodayBets(session.user.id),
    countPastUnsettled(session.user.id),
  ]);

  const groups = groupByRace(bets);
  const openBets = bets.filter((b) => b.result == null);
  const settledToday = bets.filter((b) => b.result != null);
  const stakeAtRisk = openBets.reduce((s, b) => s + b.stake, 0);
  const potentialReturn = openBets.reduce(
    (s, b) => s + b.stake * b.oddsAtBet,
    0
  );

  return (
    <main className="flex flex-col min-h-screen px-6 py-12 max-w-5xl mx-auto gap-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p
            className="text-xs font-medium uppercase tracking-widest"
            style={{ color: "var(--text-tertiary)" }}
          >
            {format(new Date(), "EEEE, d MMMM yyyy")}
          </p>
          <h1
            className="display-xl"
            style={{
              color: "var(--green-900)",
              fontFamily: "var(--font-display)",
            }}
          >
            Race Day
          </h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {openBets.length} open · {settledToday.length} settled
          </p>
        </div>
        <Link
          href="/dashboard"
          className="text-sm mt-1 transition-opacity hover:opacity-70 shrink-0"
          style={{ color: "var(--text-secondary)" }}
        >
          ← Dashboard
        </Link>
      </div>

      <BetsTabStrip />

      {/* Unsettled past bets banner */}
      {pastUnsettledCount > 0 && (
        <div
          className="flex items-center justify-between gap-4 px-4 py-3 rounded-[var(--radius-md)]"
          style={{
            background: "rgba(217, 119, 6, 0.08)",
            border: "1px solid rgba(217, 119, 6, 0.2)",
          }}
        >
          <p className="text-sm" style={{ color: "#92400E" }}>
            {pastUnsettledCount} unsettled bet
            {pastUnsettledCount !== 1 ? "s" : ""} from previous races
          </p>
          <Link
            href="/dashboard/bets"
            className="text-sm font-semibold shrink-0 transition-opacity hover:opacity-70"
            style={{ color: "#92400E" }}
          >
            View all →
          </Link>
        </div>
      )}

      {bets.length === 0 ? (
        <GlassCard variant="subtle" radius="xl" padding="lg">
          <div className="flex flex-col gap-3 items-center text-center py-8">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: "var(--green-50)" }}
            >
              <TicketIcon />
            </div>
            <p
              className="display-md"
              style={{ color: "var(--green-900)", fontFamily: "var(--font-display)" }}
            >
              No bets today
            </p>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Head to a race to place your first bet on today&apos;s card.
            </p>
            <Link
              href="/races"
              className="text-sm font-medium mt-1 transition-opacity hover:opacity-70"
              style={{ color: "var(--green-700)" }}
            >
              View today&apos;s races →
            </Link>
          </div>
        </GlassCard>
      ) : (
        <>
          {/* Summary strip */}
          {openBets.length > 0 && (
            <GlassCard variant="default" radius="2xl" padding="lg">
              <div className="grid grid-cols-3 gap-6">
                <SummaryBox label="Open bets" value={String(openBets.length)} />
                <SummaryBox
                  label="Stake at risk"
                  value={`€${stakeAtRisk.toFixed(2)}`}
                />
                <SummaryBox
                  label="Potential return"
                  value={`€${potentialReturn.toFixed(2)}`}
                  accent
                />
              </div>
            </GlassCard>
          )}

          {/* Race groups */}
          <div className="flex flex-col gap-4">
            {groups.map(({ race, bets: raceBets }) => (
              <RaceGroup key={race.id} race={race} bets={raceBets} />
            ))}
          </div>
        </>
      )}
    </main>
  );
}

/* ─── Race group card ────────────────────────────────────────────── */

function RaceGroup({ race, bets }: { race: Race; bets: Bet[] }) {
  const hasPending = bets.some((b) => b.result == null);
  const isCompleted = race.status === "COMPLETED";
  const needsSettlement = isCompleted && hasPending;

  return (
    <GlassCard
      variant={needsSettlement ? "default" : "subtle"}
      radius="xl"
      padding="md"
      className="relative overflow-hidden"
    >
      {/* Left accent: amber = needs settlement, green = upcoming */}
      {needsSettlement && (
        <div
          className="absolute inset-y-0 left-0 w-1 rounded-l-xl"
          style={{ background: "#D97706" }}
        />
      )}
      {!isCompleted && (
        <div
          className="absolute inset-y-0 left-0 w-1 rounded-l-xl"
          style={{ background: "var(--green-600)" }}
        />
      )}

      {/* Race header */}
      <div className="flex items-start justify-between gap-4 mb-4 pl-2">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-lg font-bold tabular-nums"
              style={{
                color: "var(--green-900)",
                fontFamily: "var(--font-display)",
              }}
            >
              {format(new Date(race.scheduledAt), "HH:mm")}
            </span>
            <span style={{ color: "var(--text-tertiary)" }}>·</span>
            <Link
              href={`/races/${race.id}`}
              className="text-sm font-semibold hover:underline"
              style={{ color: "var(--text-primary)" }}
            >
              {race.name}
            </Link>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className="text-xs font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              {race.racecourse.name}
            </span>
            <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
              · {race.distance}m
            </span>
            {race.surface && (
              <span
                className="text-xs"
                style={{ color: "var(--text-tertiary)" }}
              >
                · {race.surface}
              </span>
            )}
            {race.going && (
              <span
                className="text-xs"
                style={{ color: "var(--text-tertiary)" }}
              >
                · {race.going}
              </span>
            )}
          </div>
        </div>
        <RaceStatusBadge status={race.status} needsSettlement={needsSettlement} />
      </div>

      {/* Divider */}
      <div
        className="mb-3 pl-2"
        style={{ borderTop: "1px solid var(--glass-border-subtle)" }}
      />

      {/* Bet rows */}
      <div className="flex flex-col divide-y" style={{ "--tw-divide-opacity": 1 } as React.CSSProperties}>
        {bets.map((bet, i) => (
          <BetRow key={bet.id} bet={bet} first={i === 0} />
        ))}
      </div>
    </GlassCard>
  );
}

function BetRow({ bet, first }: { bet: Bet; first: boolean }) {
  const entry = bet.raceEntry;
  const isPending = bet.result == null;
  const isWon = bet.result === "WON";
  const isLost = bet.result === "LOST";

  return (
    <div
      className={`flex items-center gap-3 justify-between flex-wrap pl-2 ${first ? "pb-2" : "py-2"}`}
    >
      {/* Left: horse + bet type */}
      <div className="flex items-center gap-2 min-w-0">
        <Link
          href={`/horses/${entry.horse.id}`}
          className="text-sm font-semibold hover:underline truncate"
          style={{
            color: "var(--text-primary)",
            fontFamily: "var(--font-display)",
          }}
        >
          {entry.horse.name}
        </Link>
        <span
          className="text-xs px-2 py-0.5 rounded-full shrink-0"
          style={{
            background: "var(--navy-50)",
            color: "var(--navy-600)",
          }}
        >
          {bet.betType === "EACH_WAY" ? "E/W" : bet.betType}
        </span>
      </div>

      {/* Right: stake · odds · action */}
      <div className="flex items-center gap-4 shrink-0">
        <div className="flex items-center gap-1.5 text-sm">
          <span style={{ color: "var(--text-primary)" }}>
            €{bet.stake.toFixed(2)}
          </span>
          <span style={{ color: "var(--text-tertiary)" }}>@</span>
          <span
            className="font-medium"
            style={{ color: "var(--navy-800)" }}
          >
            {bet.oddsAtBet.toFixed(1)}x
          </span>
        </div>

        {isPending ? (
          <SettleBetButton
            betId={bet.id}
            stake={bet.stake}
            oddsAtBet={bet.oddsAtBet}
          />
        ) : isWon ? (
          <span
            className="text-sm font-bold"
            style={{ color: "var(--green-700)" }}
          >
            +€{((bet.payout ?? 0) - bet.stake).toFixed(2)}
          </span>
        ) : isLost ? (
          <span className="text-sm font-semibold" style={{ color: "#EF4444" }}>
            Lost
          </span>
        ) : (
          <span
            className="text-xs px-2.5 py-1 rounded-full"
            style={{
              background: "rgba(74, 96, 88, 0.1)",
              color: "var(--text-secondary)",
            }}
          >
            Void
          </span>
        )}
      </div>
    </div>
  );
}

/* ─── Supporting components ─────────────────────────────────────── */

function RaceStatusBadge({
  status,
  needsSettlement,
}: {
  status: string;
  needsSettlement: boolean;
}) {
  if (needsSettlement) {
    return (
      <span
        className="text-xs font-semibold px-2.5 py-1 rounded-full shrink-0"
        style={{ background: "rgba(217, 119, 6, 0.12)", color: "#92400E" }}
      >
        Settle now
      </span>
    );
  }
  if (status === "COMPLETED") {
    return (
      <span
        className="text-xs font-medium px-2.5 py-1 rounded-full shrink-0"
        style={{
          background: "rgba(74, 96, 88, 0.1)",
          color: "var(--text-secondary)",
        }}
      >
        Completed
      </span>
    );
  }
  if (status === "CANCELLED") {
    return (
      <span
        className="text-xs font-medium px-2.5 py-1 rounded-full shrink-0"
        style={{ background: "rgba(239, 68, 68, 0.08)", color: "#EF4444" }}
      >
        Cancelled
      </span>
    );
  }
  if (status === "POSTPONED") {
    return (
      <span
        className="text-xs font-medium px-2.5 py-1 rounded-full shrink-0"
        style={{ background: "rgba(239, 68, 68, 0.08)", color: "#EF4444" }}
      >
        Postponed
      </span>
    );
  }
  return (
    <span
      className="text-xs font-medium px-2.5 py-1 rounded-full shrink-0"
      style={{ background: "var(--green-50)", color: "var(--green-700)" }}
    >
      Upcoming
    </span>
  );
}

function SummaryBox({
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

function TicketIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--green-600)"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 9a3 3 0 010 6v2a2 2 0 002 2h16a2 2 0 002-2v-2a3 3 0 010-6V7a2 2 0 00-2-2H4a2 2 0 00-2 2v2z" />
    </svg>
  );
}
