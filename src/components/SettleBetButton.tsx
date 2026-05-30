"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";

type Phase = "idle" | "won" | "settling";

export function SettleBetButton({
  betId,
  stake,
  oddsAtBet,
}: {
  betId: string;
  stake: number;
  oddsAtBet: number;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [payout, setPayout] = useState(() =>
    (stake * oddsAtBet).toFixed(2)
  );

  const settle = trpc.bets.settle.useMutation({
    onSuccess: () => {
      setPhase("idle");
      router.refresh();
    },
  });

  const doSettle = (result: "WON" | "LOST", payoutAmount?: number) => {
    setPhase("settling");
    settle.mutate({ betId, result, payout: payoutAmount });
  };

  if (phase === "won") {
    return (
      <div className="flex items-center gap-2 flex-wrap justify-end">
        <div className="flex items-center gap-1">
          <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            Payout €
          </span>
          <input
            type="number"
            min={0}
            step={0.01}
            value={payout}
            onChange={(e) => setPayout(e.target.value)}
            className="w-20 text-sm text-right px-2 py-1 rounded-[var(--radius-sm)] border outline-none focus:ring-1"
            style={{
              background: "var(--green-50)",
              borderColor: "var(--green-200)",
              color: "var(--text-primary)",
              fontFamily: "var(--font-display)",
            }}
            autoFocus
          />
        </div>
        <button
          onClick={() => doSettle("WON", parseFloat(payout) || 0)}
          disabled={settle.isPending}
          className="text-xs font-semibold px-3 py-1.5 rounded-[var(--radius-pill)] transition-opacity hover:opacity-80 disabled:opacity-50"
          style={{ background: "var(--green-800)", color: "#fff" }}
        >
          Confirm Won
        </button>
        <button
          onClick={() => setPhase("idle")}
          disabled={settle.isPending}
          className="text-xs px-2 py-1.5 rounded-[var(--radius-pill)] transition-opacity hover:opacity-70"
          style={{ color: "var(--text-tertiary)" }}
        >
          Cancel
        </button>
      </div>
    );
  }

  if (phase === "settling") {
    return (
      <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
        Settling…
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setPhase("won")}
        className="text-xs font-semibold px-3 py-1.5 rounded-[var(--radius-pill)] transition-opacity hover:opacity-80"
        style={{ background: "var(--green-800)", color: "#fff" }}
      >
        Won
      </button>
      <button
        onClick={() => doSettle("LOST")}
        className="text-xs font-medium px-3 py-1.5 rounded-[var(--radius-pill)] border transition-opacity hover:opacity-70"
        style={{
          borderColor: "#EF4444",
          color: "#EF4444",
        }}
      >
        Lost
      </button>
    </div>
  );
}
