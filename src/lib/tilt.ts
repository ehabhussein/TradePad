/**
 * Tilt detection — catches the "you're about to do something you'll regret" moments.
 *
 * A trader is on TILT when at least one condition is true:
 *   - 3 consecutive losses (configurable via CONSECUTIVE_LOSS_THRESHOLD)
 *   - Today's P/L ≤ -2% of latest account balance (configurable via DAILY_LOSS_PCT)
 *
 * Banner-only (no trade-editor gate). User dismisses manually for the rest
 * of the session by acknowledging; state isn't persisted across refresh so
 * the check remains live — you can't just click-away and pretend.
 */

import type { Trade, AccountSnapshot } from "./db/schema";

export const CONSECUTIVE_LOSS_THRESHOLD = 3;
export const DAILY_LOSS_PCT = 0.02; // -2%

export type TiltReason =
  | { kind: "consecutive_losses"; count: number; threshold: number }
  | { kind: "daily_loss_pct"; todayPnL: number; balance: number; pct: number; threshold: number };

export type TiltState = {
  active: boolean;
  reasons: TiltReason[];
  /** Plain-text summary, one line. */
  summary: string;
};

export function computeTiltState(args: {
  trades: Trade[];
  snapshots: AccountSnapshot[];
  todayKey: string; // YYYY-MM-DD UTC
}): TiltState {
  const reasons: TiltReason[] = [];

  // 1) Consecutive losses — walk backwards through closed trades.
  const closedOrdered = [...args.trades]
    .filter((t) => t.pnl != null)
    .sort((a, b) => {
      const ao = typeof a.openedAt === "number" ? a.openedAt * 1000 : new Date(a.openedAt as any).getTime();
      const bo = typeof b.openedAt === "number" ? b.openedAt * 1000 : new Date(b.openedAt as any).getTime();
      return ao - bo;
    });
  let streak = 0;
  for (let i = closedOrdered.length - 1; i >= 0; i--) {
    const t = closedOrdered[i];
    if ((t.pnl ?? 0) < 0) streak++;
    else break;
  }
  if (streak >= CONSECUTIVE_LOSS_THRESHOLD) {
    reasons.push({ kind: "consecutive_losses", count: streak, threshold: CONSECUTIVE_LOSS_THRESHOLD });
  }

  // 2) Today's P/L vs latest account balance.
  const todayPnL = args.trades
    .filter((t) => t.dayDate === args.todayKey && t.pnl != null)
    .reduce((s, t) => s + (t.pnl ?? 0), 0);

  const latestBalance = args.snapshots.length ? args.snapshots[args.snapshots.length - 1].balance : null;
  if (latestBalance && latestBalance > 0 && todayPnL < 0) {
    const pct = Math.abs(todayPnL) / latestBalance;
    if (pct >= DAILY_LOSS_PCT) {
      reasons.push({
        kind: "daily_loss_pct",
        todayPnL,
        balance: latestBalance,
        pct,
        threshold: DAILY_LOSS_PCT,
      });
    }
  }

  const active = reasons.length > 0;
  const summary = reasons.length === 0
    ? "Clean — keep trading your plan."
    : reasons
        .map((r) => {
          if (r.kind === "consecutive_losses") return `${r.count} losses in a row`;
          return `Today ${(r.pct * 100).toFixed(1)}% down on account (≥ ${(r.threshold * 100).toFixed(0)}% limit)`;
        })
        .join(" · ");

  return { active, reasons, summary };
}
