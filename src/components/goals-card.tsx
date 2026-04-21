import Link from "next/link";
import { Target, TrendingUp, Calendar, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatUsd } from "@/lib/utils";
import type { Goal } from "@/lib/db/schema";

function daysBetween(from: Date, toISODate: string): number {
  const to = new Date(toISODate + "T00:00:00Z");
  return Math.ceil((to.getTime() - from.getTime()) / (24 * 3600 * 1000));
}

function formatValue(v: number, unit: string | null): string {
  if (!unit || unit === "$") return formatUsd(v);
  return `${v.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${unit}`;
}

export function GoalsCard({ goals, accountBalance }: { goals: Goal[]; accountBalance: number | null }) {
  const active = goals.filter((g) => !g.achieved);
  const now = new Date();

  return (
    <div className="rounded-2xl border bg-card/60 backdrop-blur-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Target className="size-4 text-primary" />
          </div>
          <p className="text-sm font-semibold">Active goals</p>
        </div>
        <Link href="/goals" className="text-[11px] text-muted-foreground hover:text-foreground transition inline-flex items-center gap-1">
          <Plus className="size-3" /> Manage
        </Link>
      </div>

      {active.length === 0 ? (
        <Link
          href="/goals"
          className="block rounded-xl border border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 px-4 py-6 text-center transition"
        >
          <p className="text-sm font-medium text-primary">Set a target</p>
          <p className="text-[11px] text-muted-foreground mt-1">
            E.g. "Account to $1,000 by end of May" — compounding is boring without a finish line.
          </p>
        </Link>
      ) : (
        <div className="space-y-3">
          {active.slice(0, 3).map((g) => {
            // For $-unit goals with no currentValue, fall back to the latest account balance.
            const current = g.currentValue ?? (g.unit === "$" && accountBalance != null ? accountBalance : 0);
            const pct = g.targetValue ? Math.max(0, Math.min(1, current / g.targetValue)) : 0;
            const remaining = Math.max(0, g.targetValue - current);
            const daysLeft = g.deadline ? daysBetween(now, g.deadline) : null;
            const perDay = daysLeft && daysLeft > 0 ? remaining / daysLeft : null;
            const overdue = daysLeft != null && daysLeft < 0;

            return (
              <div key={g.id} className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-medium truncate flex-1">{g.title}</span>
                  <span className="text-[11px] font-mono text-muted-foreground tabular-nums">
                    {formatValue(current, g.unit)} / {formatValue(g.targetValue, g.unit)}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      pct >= 1 ? "bg-profit" : overdue ? "bg-loss" : "bg-gradient-to-r from-primary to-primary/60"
                    )}
                    style={{ width: `${pct * 100}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <TrendingUp className="size-2.5" />
                    {pct >= 1 ? "Hit!" : `${(pct * 100).toFixed(1)}%`}
                  </span>
                  {daysLeft != null && (
                    <span className={cn("inline-flex items-center gap-1", overdue && "text-loss")}>
                      <Calendar className="size-2.5" />
                      {overdue ? `${-daysLeft}d overdue` : `${daysLeft}d left`}
                      {perDay != null && g.unit === "$" && ` · ${formatUsd(perDay)}/day`}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
          {active.length > 3 && (
            <p className="text-[10px] text-muted-foreground text-center">
              +{active.length - 3} more active
            </p>
          )}
        </div>
      )}
    </div>
  );
}
