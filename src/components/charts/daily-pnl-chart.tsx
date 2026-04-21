"use client";
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatUsd } from "@/lib/utils";
import { useMemo } from "react";

type DayPnL = { date: string; pnl: number };

export function DailyPnLChart({ data, days = 60 }: { data: DayPnL[]; days?: number }) {
  const { rows, total, wins, losses } = useMemo(() => {
    const sorted = [...data].filter((d) => d.pnl !== 0).sort((a, b) => a.date.localeCompare(b.date));
    const rows = sorted.slice(-days).map((d) => ({
      date: d.date,
      short: d.date.slice(5), // MM-DD
      pnl: Number(d.pnl.toFixed(2)),
    }));
    const total = rows.reduce((s, r) => s + r.pnl, 0);
    const wins = rows.filter((r) => r.pnl > 0).length;
    const losses = rows.filter((r) => r.pnl < 0).length;
    return { rows, total, wins, losses };
  }, [data, days]);

  if (rows.length === 0) {
    return (
      <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">
        No P/L days yet — close a trade and it'll show here.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm text-muted-foreground">Last {rows.length} trading days</p>
          <p className={`text-2xl font-bold font-mono ${total >= 0 ? "text-profit" : "text-loss"}`}>
            {formatUsd(total, { sign: true })}
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-profit" /> {wins} up</span>
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-loss" /> {losses} down</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={rows} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="short" fontSize={10} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={12} />
          <YAxis fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
          <ReferenceLine y={0} stroke="hsl(var(--border))" />
          <Tooltip
            cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
            labelFormatter={(_, payload) => payload?.[0]?.payload?.date ?? ""}
            formatter={(v: number) => [formatUsd(v, { sign: true }), "P/L"]}
            contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
          />
          <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
            {rows.map((r, i) => (
              <Cell key={i} fill={r.pnl >= 0 ? "hsl(var(--profit))" : "hsl(var(--loss))"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
