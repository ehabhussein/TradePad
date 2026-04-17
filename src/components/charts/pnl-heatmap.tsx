"use client";
import { useMemo } from "react";
import { formatUsd } from "@/lib/utils";
import { cn } from "@/lib/utils";

type DayPnL = { date: string; pnl: number };

function intensityClass(pnl: number, maxAbs: number): string {
  if (pnl === 0) return "bg-muted/30";
  const level = Math.ceil((Math.abs(pnl) / maxAbs) * 4);
  if (pnl > 0) {
    return ["bg-profit/20", "bg-profit/40", "bg-profit/60", "bg-profit/90"][Math.min(3, level - 1)];
  }
  return ["bg-loss/20", "bg-loss/40", "bg-loss/60", "bg-loss/90"][Math.min(3, level - 1)];
}

export function PnLHeatmap({ data, weeks = 26 }: { data: DayPnL[]; weeks?: number }) {
  const { grid, maxAbs, total } = useMemo(() => {
    const map = new Map(data.map((d) => [d.date, d.pnl]));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(today);
    start.setDate(today.getDate() - weeks * 7 - today.getDay());
    const grid: { date: string; pnl: number }[][] = [];
    for (let w = 0; w < weeks; w++) {
      const col: { date: string; pnl: number }[] = [];
      for (let d = 0; d < 7; d++) {
        const cur = new Date(start);
        cur.setDate(start.getDate() + w * 7 + d);
        const iso = cur.toISOString().slice(0, 10);
        col.push({ date: iso, pnl: map.get(iso) ?? 0 });
      }
      grid.push(col);
    }
    const maxAbs = Math.max(1, ...data.map((d) => Math.abs(d.pnl)));
    const total = data.reduce((a, b) => a + b.pnl, 0);
    return { grid, maxAbs, total };
  }, [data, weeks]);

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Last {weeks} weeks</p>
          <p className={cn("text-2xl font-bold font-mono", total >= 0 ? "text-profit" : "text-loss")}>
            {formatUsd(total, { sign: true })}
          </p>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span>less</span>
          <div className="size-3 rounded-sm bg-loss/90" />
          <div className="size-3 rounded-sm bg-loss/40" />
          <div className="size-3 rounded-sm bg-muted/30" />
          <div className="size-3 rounded-sm bg-profit/40" />
          <div className="size-3 rounded-sm bg-profit/90" />
          <span>more</span>
        </div>
      </div>
      <div className="overflow-x-auto scrollbar-thin -mx-2 px-2">
        <div className="flex gap-1 w-max">
          {grid.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1">
              {week.map(({ date, pnl }) => (
                <div
                  key={date}
                  title={`${date} · ${formatUsd(pnl, { sign: true })}`}
                  className={cn(
                    "size-3.5 rounded-sm transition-all hover:scale-125 hover:ring-2 hover:ring-primary/50 cursor-pointer",
                    intensityClass(pnl, maxAbs)
                  )}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
