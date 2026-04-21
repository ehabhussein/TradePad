import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { trades, days, accountSnapshots, mistakes, setups as setupsTable } from "@/lib/db/schema";
import { requireApiKey } from "@/lib/auth";
import { desc, asc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const u = new URL(req.url);
  if (u.searchParams.get("health") === "1") return NextResponse.json({ ok: true });
  const auth = requireApiKey(req); if (auth) return auth;

  const allTrades = db.select().from(trades).orderBy(asc(trades.openedAt)).all();
  const allDays = db.select().from(days).orderBy(asc(days.date)).all();
  const snapshots = db.select().from(accountSnapshots).orderBy(asc(accountSnapshots.date)).all();
  const allMistakes = db.select().from(mistakes).orderBy(desc(mistakes.createdAt)).all();

  // Aggregate per-day P/L
  const dailyPnL = new Map<string, number>();
  for (const t of allTrades) {
    if (!t.dayDate || t.pnl == null) continue;
    dailyPnL.set(t.dayDate, (dailyPnL.get(t.dayDate) ?? 0) + t.pnl);
  }
  const heatmap = Array.from(dailyPnL, ([date, pnl]) => ({ date, pnl }));

  // Equity curve
  let running = snapshots[0]?.balance ?? 0;
  const equity: { date: string; balance: number }[] = [];
  const perDay = new Map(heatmap.map((h) => [h.date, h.pnl]));
  const sortedDates = [...new Set([...perDay.keys(), ...snapshots.map((s) => s.date)])].sort();
  for (const d of sortedDates) {
    const snap = snapshots.find((s) => s.date === d);
    if (snap) running = snap.balance;
    else running += perDay.get(d) ?? 0;
    equity.push({ date: d, balance: running });
  }

  // Drawdown
  let peak = -Infinity;
  const dd = equity.map((e) => {
    peak = Math.max(peak, e.balance);
    return { date: e.date, dd: Math.min(0, e.balance - peak) };
  });

  // Totals
  const closed = allTrades.filter((t) => t.pnl != null);
  const wins = closed.filter((t) => (t.pnl ?? 0) > 0);
  const losses = closed.filter((t) => (t.pnl ?? 0) < 0);
  const totalPnL = closed.reduce((s, t) => s + (t.pnl ?? 0), 0);
  const winRate = closed.length ? wins.length / closed.length : 0;
  const avgWin = wins.length ? wins.reduce((s, t) => s + (t.pnl ?? 0), 0) / wins.length : 0;
  const avgLoss = losses.length ? losses.reduce((s, t) => s + (t.pnl ?? 0), 0) / losses.length : 0;
  const expectancy = winRate * avgWin + (1 - winRate) * avgLoss;
  const maxDD = Math.min(0, ...dd.map((d) => d.dd));

  // Streaks
  let curStreak = 0;
  let streakType: "win" | "loss" | null = null;
  for (let i = closed.length - 1; i >= 0; i--) {
    const w = (closed[i].pnl ?? 0) > 0;
    if (streakType == null) {
      streakType = w ? "win" : "loss";
      curStreak = 1;
    } else if ((streakType === "win") === w) {
      curStreak++;
    } else break;
  }

  // R-multiple histogram
  const buckets = [-3, -2, -1, 0, 1, 2, 3, 4];
  const rHist = buckets.map((r, i) => {
    const next = buckets[i + 1];
    const count = closed.filter((t) => t.rMultiple != null && t.rMultiple >= r && (next == null || t.rMultiple < next)).length;
    return { bucket: next == null ? `${r}+R` : `${r}R`, count, r };
  });

  // Setup performance — grouped by setup_id first (canonical name from setups table),
  // trades without an FK fall back to the free-text setup_type string.
  const allSetups = db.select().from(setupsTable).all();
  const setupNameById = new Map(allSetups.map((s) => [s.id, s.name]));
  type SetupAgg = { wins: number; losses: number; pnl: number; rSum: number; rCount: number; bestSessionCounts: Map<string, number> };
  const empty = (): SetupAgg => ({ wins: 0, losses: 0, pnl: 0, rSum: 0, rCount: 0, bestSessionCounts: new Map() });
  const setupMap = new Map<string, SetupAgg>();
  for (const t of closed) {
    const label = (t.setupId != null && setupNameById.has(t.setupId))
      ? setupNameById.get(t.setupId)!
      : (t.setupType || "Unknown");
    const m = setupMap.get(label) ?? empty();
    if ((t.pnl ?? 0) > 0) m.wins++;
    else m.losses++;
    m.pnl += t.pnl ?? 0;
    if (t.rMultiple != null) { m.rSum += t.rMultiple; m.rCount++; }
    if (t.session) m.bestSessionCounts.set(t.session, (m.bestSessionCounts.get(t.session) ?? 0) + 1);
    setupMap.set(label, m);
  }
  const setups = Array.from(setupMap, ([name, v]) => {
    const total = v.wins + v.losses || 1;
    const bestSession = [...v.bestSessionCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    return {
      name,
      wins: v.wins,
      losses: v.losses,
      pnl: v.pnl,
      winRate: v.wins / total,
      avgR: v.rCount ? v.rSum / v.rCount : null,
      avgPnL: v.pnl / total,
      bestSession,
    };
  });

  // Session heatmap (hour UTC)
  const hourMap = new Map<number, { wins: number; total: number }>();
  for (const t of closed) {
    const h = new Date(t.openedAt).getUTCHours();
    const m = hourMap.get(h) ?? { wins: 0, total: 0 };
    m.total++;
    if ((t.pnl ?? 0) > 0) m.wins++;
    hourMap.set(h, m);
  }
  const sessionHours = Array.from(hourMap, ([hour, v]) => ({ hour, trades: v.total, winRate: v.wins / v.total }));

  // Mistake tag cloud
  const mistakeMap = new Map<string, number>();
  for (const m of allMistakes) mistakeMap.set(m.tag, (mistakeMap.get(m.tag) ?? 0) + 1);
  const mistakeTags = Array.from(mistakeMap, ([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count);

  // Mood vs P/L
  const moodScatter = allDays.filter((d) => d.mood != null && d.dailyClosePnL != null).map((d) => ({ mood: d.mood!, pnl: d.dailyClosePnL! }));

  // Rules compliance
  const totalReviewed = closed.filter((t) => t.followedRules != null).length;
  const compliance = totalReviewed ? closed.filter((t) => t.followedRules).length / totalReviewed : 0;

  return NextResponse.json({
    totals: {
      tradeCount: allTrades.length,
      closedCount: closed.length,
      winCount: wins.length,
      lossCount: losses.length,
      totalPnL,
      winRate,
      avgWin,
      avgLoss,
      expectancy,
      maxDD,
      currentStreak: curStreak,
      streakType,
      complianceRate: compliance,
    },
    heatmap,
    equity,
    drawdown: dd,
    rHist,
    setups,
    sessionHours,
    mistakeTags,
    moodScatter,
  });
}
