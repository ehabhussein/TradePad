import { AlertOctagon, ShieldX } from "lucide-react";
import { formatUsd } from "@/lib/utils";
import type { TiltReason } from "@/lib/tilt";

/**
 * Visual-only tilt alert (option 'a' from the threshold discussion).
 * No trade-editor gate, no MCP signal yet — those can be added later if desired.
 */
export function TiltBanner({ reasons }: { reasons: TiltReason[] }) {
  if (reasons.length === 0) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-loss/40 bg-gradient-to-br from-loss/20 via-orange-500/10 to-background p-5">
      <div className="absolute -top-8 -right-8 size-32 rounded-full bg-loss/20 blur-3xl" />
      <div className="absolute -bottom-8 -left-8 size-32 rounded-full bg-orange-500/20 blur-2xl" />
      <div className="relative flex items-start gap-4">
        <div className="size-11 rounded-xl bg-loss/20 flex items-center justify-center shrink-0">
          <AlertOctagon className="size-5 text-loss" />
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-loss">You&apos;re on tilt. Step away.</h2>
            <span className="text-[10px] uppercase tracking-widest text-loss/80 font-mono">tilt</span>
          </div>
          <div className="space-y-1">
            {reasons.map((r, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <ShieldX className="size-3.5 text-loss/80 shrink-0" />
                {r.kind === "consecutive_losses" ? (
                  <span>
                    <span className="font-semibold text-loss">{r.count} losses</span> in a row (limit: {r.threshold}).
                    Next trade after a break, not right now.
                  </span>
                ) : (
                  <span>
                    Today: <span className="font-mono font-semibold text-loss">{formatUsd(r.todayPnL, { sign: true })}</span>
                    {" "}= <span className="font-semibold text-loss">-{(r.pct * 100).toFixed(2)}%</span> of {formatUsd(r.balance)} account
                    (daily limit: -{(r.threshold * 100).toFixed(0)}%).
                  </span>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground pt-1">
            This banner clears automatically when the trigger condition resolves —
            take a walk, review the plan, don&apos;t revenge trade.
          </p>
        </div>
      </div>
    </div>
  );
}
