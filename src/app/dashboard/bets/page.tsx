export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GlassCard } from "@/components/ui";
import { SettleBetButton } from "@/components/SettleBetButton";

async function getBets(userId: string) {
  return prisma.bet.findMany({
    where: { userId },
    include: {
      raceEntry: {
        include: {
          race: { include: { racecourse: true } },
          horse: true,
          jockey: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

type Bet = Awaited<ReturnType<typeof getBets>>[number];

function computeSummary(bets: Bet[]) {
  const settled = bets.filter((b) => b.result != null);
  const won = settled.filter((b) => b.result === "WON");
  const totalStake = settled.reduce((s, b) => s + b.stake, 0);
  const totalPayout = settled.reduce((s, b) => s + (b.payout ?? 0), 0);
  return {
    total: bets.length,
    settled: settled.length,
    wins: won.length,
    winRate: settled.length > 0 ? Math.round((won.length / settled.length) * 100) : null,
    totalStake,
    totalPayout,
    pnl: totalPayout - totalStake,
    roi: totalStake > 0 ? ((totalPayout - totalStake) / totalStake) * 100 : null,
  };
}

export default async function BetsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const bets = await getBets(session.user.id);
  const summary = computeSummary(bets);
  const pending = bets.filter((b) => b.result == null);
  const settled = bets.filter((b) => b.result != null);

  return (
    <main className="flex flex-col min-h-screen px-6 py-12 max-w-5xl mx-auto gap-8">

      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1
            className="display-xl"
            style={{ color: "var(--green-900)", fontFamily: "var(--font-display)" }}
          >
            My Bets
          </h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {bets.length} bet{bets.length !== 1 ? "s" : ""} total
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

      {/* Summary stats */}
      <GlassCard variant="default" radius="2xl" padding="lg">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          <StatBox label="Total bets" value={String(summary.total)} />
          <StatBox
            label="Wins"
            value={summary.settled > 0 ? `${summary.wins}/${summary.settled}` : "—"}
            accent
          />
          <StatBox
            label="Win rate"
            value={summary.winRate != null ? `${summary.winRate}%` : "—"}
          />
          <StatBox
            label="P&L"
            value={
              summary.settled > 0
                ? `${summary.pnl >= 0 ? "+" : ""}€${summary.pnl.toFixed(2)}`
                : "—"
            }
            positive={summary.pnl > 0}
            negative={summary.pnl < 0}
          />
        </div>
        {summary.roi != null && (
          <p className="mt-4 text-xs" style={{ color: "var(--text-tertiary)" }}>
            ROI:{" "}
            <span
              className="font-semibold"
              style={{ color: summary.roi >= 0 ? "var(--green-700)" : "#B91C1C" }}
            >
              {summary.roi >= 0 ? "+" : ""}
              {summary.roi.toFixed(1)}%
            </span>{" "}
            · Staked: €{summary.totalStake.toFixed(2)} · Returned: €
            {summary.totalPayout.toFixed(2)}
          </p>
        )}
      </GlassCard>

      {bets.length === 0 ? (
        <GlassCard variant="subtle" radius="xl" padding="lg">
          <p style={{ color: "var(--text-secondary)" }}>
            No bets yet. Head to a race page to place your first bet.
          </p>
        </GlassCard>
      ) : (
        <>
          {/* Pending */}
          {pending.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="display-md" style={{ color: "var(--green-900)" }}>
                Pending ({pending.length})
              </h2>
              {pending.map((bet) => (
                <BetRow key={bet.id} bet={bet} showSettle />
              ))}
            </section>
          )}

          {/* Settled */}
          {settled.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="display-md" style={{ color: "var(--green-900)" }}>
                Settled ({settled.length})
              </h2>
              {settled.map((bet) => (
                <BetRow key={bet.id} bet={bet} />
              ))}
            </section>
          )}
        </>
      )}
    </main>
  );
}

function BetRow({ bet, showSettle }: { bet: Bet; showSettle?: boolean }) {
  const entry = bet.raceEntry;
  const isWon = bet.result === "WON";
  const isLost = bet.result === "LOST";

  return (
    <GlassCard
      variant={isWon ? "default" : "subtle"}
      radius="xl"
      padding="md"
      className="relative overflow-hidden"
    >
      {isWon && (
        <div
          className="absolute inset-y-0 left-0 w-1 rounded-l-xl"
          style={{ background: "var(--green-500)" }}
        />
      )}
      {isLost && (
        <div
          className="absolute inset-y-0 left-0 w-1 rounded-l-xl"
          style={{ background: "#EF4444" }}
        />
      )}

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/horses/${entry.horse.id}`}
              className="text-sm font-semibold hover:underline"
              style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}
            >
              {entry.horse.name}
            </Link>
            <span className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: "var(--gray-100)", color: "var(--text-secondary)" }}>
              {bet.betType === "EACH_WAY" ? "E/W" : bet.betType}
            </span>
          </div>
          <Link
            href={`/races/${entry.race.id}`}
            className="text-xs hover:underline"
            style={{ color: "var(--text-tertiary)" }}
          >
            {entry.race.name} · {entry.race.racecourse.name} ·{" "}
            {format(new Date(entry.race.scheduledAt), "d MMM yyyy")}
          </Link>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>Stake</span>
            <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              €{bet.stake.toFixed(2)}
            </span>
          </div>
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>Odds</span>
            <span className="text-sm font-semibold" style={{ color: "var(--navy-800)" }}>
              {bet.oddsAtBet.toFixed(1)}x
            </span>
          </div>
          {bet.result != null ? (
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>Result</span>
              <span
                className="text-sm font-bold"
                style={{
                  color: isWon ? "var(--green-700)" : isLost ? "#EF4444" : "var(--text-secondary)",
                }}
              >
                {isWon && bet.payout != null
                  ? `+€${(bet.payout - bet.stake).toFixed(2)}`
                  : bet.result}
              </span>
            </div>
          ) : showSettle ? (
            <SettleBetButton
              betId={bet.id}
              stake={bet.stake}
              oddsAtBet={bet.oddsAtBet}
            />
          ) : (
            <span
              className="text-xs font-medium px-2.5 py-1 rounded-full"
              style={{ background: "var(--green-50)", color: "var(--green-700)" }}
            >
              Pending
            </span>
          )}
        </div>
      </div>
    </GlassCard>
  );
}

function StatBox({
  label,
  value,
  accent,
  positive,
  negative,
}: {
  label: string;
  value: string;
  accent?: boolean;
  positive?: boolean;
  negative?: boolean;
}) {
  const color = positive
    ? "var(--green-700)"
    : negative
    ? "#EF4444"
    : accent
    ? "var(--green-700)"
    : "var(--green-800)";

  return (
    <div className="flex flex-col gap-1">
      <span className="display-lg" style={{ color }}>
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
