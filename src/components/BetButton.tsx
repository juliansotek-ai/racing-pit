"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";

type BetType = "WIN" | "PLACE" | "EACH_WAY";

interface Props {
  raceEntryId: string;
  horseName: string;
  defaultOdds: number | null;
}

export function BetButton({ raceEntryId, horseName, defaultOdds }: Props) {
  const { status } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [betType, setBetType] = useState<BetType>("WIN");
  const [stake, setStake] = useState("");
  const [odds, setOdds] = useState(defaultOdds?.toFixed(2) ?? "");
  const [placed, setPlaced] = useState(false);

  const place = trpc.bets.place.useMutation({
    onSuccess: () => {
      setPlaced(true);
      setOpen(false);
      setStake("");
      router.refresh();
    },
  });

  function handleOpen() {
    if (status !== "authenticated") {
      router.push("/auth/signin");
      return;
    }
    setPlaced(false);
    setOpen((v) => !v);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const stakeNum = parseFloat(stake);
    const oddsNum = parseFloat(odds);
    if (!stakeNum || !oddsNum) return;
    place.mutate({ raceEntryId, betType, stake: stakeNum, oddsAtBet: oddsNum });
  }

  if (placed) {
    return (
      <div className="flex items-center gap-2 pt-2 text-sm" style={{ color: "var(--green-700)" }}>
        <CheckIcon />
        <span className="font-medium">Bet placed on {horseName}</span>
      </div>
    );
  }

  return (
    <div className="pt-2">
      <button
        onClick={handleOpen}
        className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-[var(--radius-md)] transition-all hover:bg-black/5"
        style={{ color: open ? "var(--green-700)" : "var(--text-tertiary)" }}
      >
        <TicketIcon />
        {open ? "Cancel" : "Place bet"}
      </button>

      {open && (
        <form
          onSubmit={handleSubmit}
          className="mt-3 flex flex-wrap items-end gap-3 p-4 rounded-[var(--radius-lg)]"
          style={{
            background: "rgba(255,255,255,0.5)",
            border: "1px solid var(--glass-border)",
          }}
        >
          {/* Bet type */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium tracking-wide uppercase" style={{ color: "var(--text-tertiary)" }}>
              Type
            </label>
            <div className="flex rounded-[var(--radius-md)] overflow-hidden" style={{ border: "1px solid var(--glass-border)" }}>
              {(["WIN", "PLACE", "EACH_WAY"] as BetType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setBetType(t)}
                  className="px-3 py-1.5 text-xs font-semibold transition-colors"
                  style={{
                    background: betType === t ? "var(--green-800)" : "transparent",
                    color: betType === t ? "white" : "var(--text-secondary)",
                  }}
                >
                  {t === "EACH_WAY" ? "E/W" : t}
                </button>
              ))}
            </div>
          </div>

          {/* Odds */}
          <Field label="Odds" prefix="@">
            <input
              type="number"
              step="0.01"
              min="1"
              required
              value={odds}
              onChange={(e) => setOdds(e.target.value)}
              className="w-20 bg-transparent outline-none text-sm font-semibold tabular-nums"
              style={{ color: "var(--navy-800)" }}
              placeholder="2.50"
            />
          </Field>

          {/* Stake */}
          <Field label="Stake" prefix="€">
            <input
              type="number"
              step="0.50"
              min="0.50"
              required
              value={stake}
              onChange={(e) => setStake(e.target.value)}
              className="w-24 bg-transparent outline-none text-sm font-semibold tabular-nums"
              style={{ color: "var(--text-primary)" }}
              placeholder="10.00"
            />
          </Field>

          {/* Potential return */}
          {stake && odds && (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium tracking-wide uppercase" style={{ color: "var(--text-tertiary)" }}>
                Returns
              </span>
              <span className="text-sm font-bold" style={{ color: "var(--green-700)" }}>
                €{(parseFloat(stake) * parseFloat(odds)).toFixed(2)}
              </span>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={place.isPending || !stake || !odds}
            className="ml-auto px-4 py-2 rounded-[var(--radius-md)] text-sm font-semibold text-white transition-opacity disabled:opacity-50"
            style={{ background: "var(--green-800)" }}
          >
            {place.isPending ? "Placing…" : "Confirm bet"}
          </button>

          {place.isError && (
            <p className="w-full text-xs" style={{ color: "#B91C1C" }}>
              {place.error.message}
            </p>
          )}
        </form>
      )}
    </div>
  );
}

function Field({ label, prefix, children }: { label: string; prefix: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium tracking-wide uppercase" style={{ color: "var(--text-tertiary)" }}>
        {label}
      </label>
      <div
        className="flex items-center gap-1 px-3 py-1.5 rounded-[var(--radius-md)]"
        style={{ background: "rgba(255,255,255,0.7)", border: "1px solid var(--glass-border)" }}
      >
        <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>{prefix}</span>
        {children}
      </div>
    </div>
  );
}

function TicketIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 9a3 3 0 010 6v2a2 2 0 002 2h16a2 2 0 002-2v-2a3 3 0 010-6V7a2 2 0 00-2-2H4a2 2 0 00-2 2v2z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}
