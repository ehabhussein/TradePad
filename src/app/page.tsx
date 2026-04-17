import { db } from "@/lib/db";
import { trades, days, accountSnapshots } from "@/lib/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PnLHeatmap } from "@/components/charts/pnl-heatmap";
import { EquityCurve } from "@/components/charts/equity-curve";
import { formatUsd, pnlColor } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { desc, asc } from "drizzle-orm";
import { ArrowDownRight, ArrowUpRight, Flame, Target, TrendingUp, Trophy } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function getData() {
  const allTrades = db.select().from(trades).orderBy(asc(trades.openedAt)).all();
  const allDays = db.select().from(days).orderBy(desc(days.date)).limit(7).all();
  const snapshots = db.select().from(accountSnapshots).orderBy(asc(accountSnapshots.date)).all();

  const dailyPnL = new Map<string, number>();
  for (const t of allTrades) {
    if (!t.dayDate || t.pnl == null) continue;
    dailyPnL.set(t.dayDate, (dailyPnL.get(t.dayDate) ?? 0) + t.pnl);
  }
  const heatmap = Array.from(dailyPnL, ([date, pnl]) => ({ date, pnl }));

  let running = snapshots[0]?.balance ?? 0;
  const equity: { date: string; balance: number }[] = [];
  const sortedDates = [...new Set([...dailyPnL.keys(), ...snapshots.map((s) => s.date)])].sort();
  for (const d of sortedDates) {
    const snap = snapshots.find((s) => s.date === d);
    if (snap) running = snap.balance;
    else running += dailyPnL.get(d) ?? 0;
    equity.push({ date: d, balance: running });
  }

  const closed = allTrades.filter((t) => t.pnl != null);
  const wins = closed.filter((t) => (t.pnl ?? 0) > 0);
  const totalPnL = closed.reduce((s, t) => s + (t.pnl ?? 0), 0);
  const winRate = closed.length ? (wins.length / closed.length) * 100 : 0;

  let curStreak = 0;
  let streakType: "win" | "loss" | null = null;
  for (let i = closed.length - 1; i >= 0; i--) {
    const w = (closed[i].pnl ?? 0) > 0;
    if (streakType == null) { streakType = w ? "win" : "loss"; curStreak = 1; }
    else if ((streakType === "win") === w) curStreak++;
    else break;
  }

  return { heatmap, equity, totalPnL, winRate, closedCount: closed.length, curStreak, streakType, recentDays: allDays, allTradesLen: allTrades.length };
}

export default async function HomePage() {
  const data = await getData();
  const stats = [
    { label: "Total P/L", value: formatUsd(data.totalPnL, { sign: true }), icon: TrendingUp, tone: data.totalPnL >= 0 ? "profit" : "loss" },
    { label: "Win Rate", value: `${data.winRate.toFixed(1)}%`, icon: Target, tone: data.winRate >= 50 ? "profit" : "loss" },
    { label: "Trades", value: data.closedCount.toString(), icon: Trophy, tone: "neutral" },
    { label: `Streak`, value: data.curStreak > 0 ? `${data.curStreak} ${data.streakType}` : "—", icon: Flame, tone: data.streakType === "win" ? "profit" : data.streakType === "loss" ? "loss" : "neutral" },
  ];

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold tracking-tight">
            Welcome back, <span className="bg-gradient-to-r from-primary to-primary/50 bg-clip-text text-transparent">trader</span>
          </h1>
          <p className="text-muted-foreground">Your edge, quantified. Press <kbd className="px-1.5 py-0.5 rounded border text-xs">Ctrl+K</kbd> (or click Quick add) to log anything.</p>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label} className="overflow-hidden">
            <CardContent className="p-5 flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</p>
                <p className={cn("text-2xl font-bold font-mono", s.tone === "profit" ? "text-profit" : s.tone === "loss" ? "text-loss" : "")}>{s.value}</p>
              </div>
              <div className={cn("size-9 rounded-lg flex items-center justify-center", s.tone === "profit" ? "bg-profit/10 text-profit" : s.tone === "loss" ? "bg-loss/10 text-loss" : "bg-primary/10 text-primary")}>
                <s.icon className="size-4" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>P/L Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          <PnLHeatmap data={data.heatmap} />
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Equity Curve</CardTitle>
          </CardHeader>
          <CardContent>
            {data.equity.length > 0 ? <EquityCurve data={data.equity} /> : (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                No trades yet — click "Quick add" in the top-right or press Ctrl+K
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Days</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.recentDays.length === 0 ? (
              <p className="text-sm text-muted-foreground">No entries yet.</p>
            ) : (
              data.recentDays.map((d) => (
                <Link key={d.date} href={`/days/${d.date}`} className="flex items-center justify-between p-2 -mx-2 rounded-md hover:bg-muted transition">
                  <div>
                    <p className="text-sm font-medium">{d.date}</p>
                    <p className="text-xs text-muted-foreground truncate max-w-[180px]">{d.whatHappened || "—"}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {(d.dailyClosePnL ?? 0) >= 0 ? <ArrowUpRight className="size-3 text-profit" /> : <ArrowDownRight className="size-3 text-loss" />}
                    <span className={cn("text-sm font-mono", pnlColor(d.dailyClosePnL))}>
                      {formatUsd(d.dailyClosePnL, { sign: true })}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
