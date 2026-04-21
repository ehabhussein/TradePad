import { db } from "@/lib/db";
import { trades, days, accountSnapshots, mistakes, goals } from "@/lib/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DailyPnLChart } from "@/components/charts/daily-pnl-chart";
import { EquityCurve } from "@/components/charts/equity-curve";
import { SessionStatus } from "@/components/session-status";
import { GoalsCard } from "@/components/goals-card";
import { TiltBanner } from "@/components/tilt-banner";
import { computeTiltState } from "@/lib/tilt";
import { formatUsd, pnlColor } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { desc, asc } from "drizzle-orm";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, CalendarDays, Flame, Skull, Target, TrendingUp, Trophy, Zap } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function getData() {
  const allTrades = db.select().from(trades).orderBy(asc(trades.openedAt)).all();
  const allDays = db.select().from(days).orderBy(desc(days.date)).limit(7).all();
  const snapshots = db.select().from(accountSnapshots).orderBy(asc(accountSnapshots.date)).all();
  const allMistakes = db.select().from(mistakes).orderBy(desc(mistakes.createdAt)).all();
  const allGoals = db.select().from(goals).orderBy(desc(goals.createdAt)).all();

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

  // Mistakes aggregations
  const tagCounts = new Map<string, number>();
  allMistakes.forEach((m) => tagCounts.set(m.tag, (tagCounts.get(m.tag) ?? 0) + 1));
  const rankedTags = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxTagCount = Math.max(1, ...rankedTags.map(([, c]) => c));
  const lastSevenDaysMistakes = allMistakes.filter((m) => {
    const t = (m.createdAt as unknown as number) * 1000;
    return Date.now() - t < 7 * 24 * 60 * 60 * 1000;
  }).length;
  const recentMistakes = allMistakes.slice(0, 3);

  // Today's UTC day key, matches the day_date stored for trades.
  const todayKey = new Date().toISOString().slice(0, 10);
  const todayPnL = dailyPnL.get(todayKey) ?? 0;
  const todayTradeCount = allTrades.filter((t) => t.dayDate === todayKey).length;

  // For the Recent Days panel: prefer the manually-closed daily_close_pnl
  // when set, else fall back to the sum of the day's trade P/L so days
  // without an explicit close still show a meaningful number.
  const recentDaysWithPnL = allDays.map((d) => ({
    ...d,
    effectivePnL: d.dailyClosePnL ?? dailyPnL.get(d.date) ?? 0,
    hasExplicitClose: d.dailyClosePnL != null,
  }));

  const latestBalance = snapshots.length ? snapshots[snapshots.length - 1].balance : null;

  const tilt = computeTiltState({ trades: allTrades, snapshots, todayKey });

  return {
    tilt,
    heatmap, equity, totalPnL, winRate, closedCount: closed.length, curStreak, streakType,
    recentDays: recentDaysWithPnL, allTradesLen: allTrades.length,
    todayPnL, todayTradeCount, todayKey,
    goals: allGoals, latestBalance,
    mistakes: {
      total: allMistakes.length,
      uniqueTags: tagCounts.size,
      lastSevenDays: lastSevenDaysMistakes,
      topOffender: rankedTags[0] ? { tag: rankedTags[0][0], count: rankedTags[0][1] } : null,
      ranked: rankedTags,
      maxCount: maxTagCount,
      recent: recentMistakes,
    },
  };
}

export default async function HomePage() {
  const data = await getData();
  const stats = [
    {
      label: `Today (${data.todayTradeCount} ${data.todayTradeCount === 1 ? "trade" : "trades"})`,
      value: data.todayTradeCount ? formatUsd(data.todayPnL, { sign: true }) : "—",
      icon: CalendarDays,
      tone: data.todayTradeCount === 0 ? "neutral" : data.todayPnL >= 0 ? "profit" : "loss",
    },
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

      {data.tilt.active && <TiltBanner reasons={data.tilt.reasons} />}

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
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

      <SessionStatus />

      <Card>
        <CardHeader>
          <CardTitle>Daily P/L</CardTitle>
        </CardHeader>
        <CardContent>
          <DailyPnLChart data={data.heatmap} />
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

        <GoalsCard goals={data.goals} accountBalance={data.latestBalance} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-3">
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
                  <div className="flex items-center gap-1" title={d.hasExplicitClose ? "Manually-entered close" : "Sum of trades on this day"}>
                    {d.effectivePnL >= 0 ? <ArrowUpRight className="size-3 text-profit" /> : <ArrowDownRight className="size-3 text-loss" />}
                    <span className={cn("text-sm font-mono", pnlColor(d.effectivePnL))}>
                      {formatUsd(d.effectivePnL, { sign: true })}
                    </span>
                    {!d.hasExplicitClose && d.effectivePnL !== 0 && (
                      <span className="text-[9px] text-muted-foreground uppercase tracking-wider">calc</span>
                    )}
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Mistakes were made — dramatic section */}
      <Link href="/mistakes" className="block group">
        <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-loss/10 via-orange-500/5 to-background transition hover:border-loss/40">
          <div className="absolute -top-12 -right-12 size-48 rounded-full bg-loss/10 blur-3xl" />
          <div className="absolute -bottom-12 -left-12 size-48 rounded-full bg-orange-500/10 blur-3xl" />
          <div className="relative p-6 md:p-8 space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="size-11 rounded-xl bg-loss/20 flex items-center justify-center">
                  <Skull className="size-5 text-loss" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">Mistakes were made.</h2>
                  <p className="text-sm text-muted-foreground">Every mistake is a paid lesson. Don't pay twice.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total</p>
                  <p className="text-xl font-bold font-mono text-loss">{data.mistakes.total}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">7 days</p>
                  <p className={cn("text-xl font-bold font-mono", data.mistakes.lastSevenDays > 3 ? "text-loss" : "text-orange-400")}>
                    {data.mistakes.lastSevenDays}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Patterns</p>
                  <p className="text-xl font-bold font-mono">{data.mistakes.uniqueTags}</p>
                </div>
              </div>
            </div>

            {data.mistakes.total === 0 ? (
              <div className="py-4 text-center text-muted-foreground text-sm">
                <p>No mistakes logged yet.</p>
                <p className="text-xs mt-1">That's either perfection… or denial. 😉</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {/* Repeat offenders */}
                <div>
                  <div className="flex items-center gap-1.5 mb-3">
                    <Zap className="size-3.5 text-loss" />
                    <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Repeat Offenders</h3>
                  </div>
                  <div className="space-y-2.5">
                    {data.mistakes.ranked.map(([tag, count]) => {
                      const intensity = count / data.mistakes.maxCount;
                      const barColor = intensity > 0.7
                        ? "bg-loss/30 border-loss/50"
                        : intensity > 0.4
                        ? "bg-orange-500/20 border-orange-500/40"
                        : "bg-yellow-500/10 border-yellow-500/30";
                      return (
                        <div key={tag} className="space-y-1">
                          <div className="flex items-baseline justify-between">
                            <span className="font-mono text-xs">{tag}</span>
                            <span className="text-[10px] text-muted-foreground">×{count}</span>
                          </div>
                          <div className="h-5 rounded bg-muted/30 overflow-hidden">
                            <div className={cn("h-full rounded border", barColor)} style={{ width: `${intensity * 100}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Recent mistakes */}
                <div>
                  <div className="flex items-center gap-1.5 mb-3">
                    <AlertTriangle className="size-3.5 text-loss" />
                    <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Recent</h3>
                  </div>
                  <div className="space-y-2">
                    {data.mistakes.recent.map((m) => (
                      <div key={m.id} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-background/40 border border-border/50">
                        <div className="size-7 rounded-md bg-loss/15 flex items-center justify-center flex-shrink-0">
                          <AlertTriangle className="size-3 text-loss" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2">
                            <span className="font-mono text-xs text-loss">{m.tag}</span>
                            {m.dayDate && <span className="text-[10px] text-muted-foreground">{m.dayDate}</span>}
                          </div>
                          {m.notes && <p className="text-xs text-muted-foreground truncate mt-0.5">{m.notes}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}
