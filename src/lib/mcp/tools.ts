/**
 * MCP tool definitions + handlers.
 * Each handler uses the db directly — no HTTP round trip.
 */
import { db } from "@/lib/db";
import { trades, days, lessons, rules, checklistItems, mistakes, accountSnapshots, goals, screenshots, setups, codeSnippets } from "@/lib/db/schema";
import { desc, asc, eq, like, or } from "drizzle-orm";
import { calcRMultiple } from "@/lib/utils";

export const TOOL_DEFINITIONS = [
  // ── TRADES ────────────────────────────────────────────
  {
    name: "add_trade",
    description: "Add a new trade to the Tradepad journal. Use this when the user closes a trade or asks you to log one. Automatically calculates R-multiple if SL+exit provided.",
    inputSchema: {
      type: "object",
      properties: {
        symbol: { type: "string", description: "e.g. XAUUSD" },
        direction: { type: "string", enum: ["BUY", "SELL"] },
        entryPrice: { type: "number" },
        exitPrice: { type: "number" },
        stopLoss: { type: "number" },
        takeProfit: { type: "number" },
        quantity: { type: "number", description: "Lot size, e.g. 0.01" },
        pnl: { type: "number", description: "Realized P/L in USD" },
        setupType: { type: "string", description: "e.g. 'Pivot Bounce BUY'" },
        session: { type: "string", description: "Asian / London / Overlap / NY" },
        confluenceScore: { type: "number", description: "0-14 confluence score" },
        notesEntry: { type: "string" },
        notesReview: { type: "string" },
        followedRules: { type: "boolean" },
        mood: { type: "number", description: "1-10 mood at time of trade" },
        openedAt: { type: "string", description: "ISO 8601 datetime" },
        closedAt: { type: "string", description: "ISO 8601 datetime" },
        dayDate: { type: "string", description: "YYYY-MM-DD — auto-derived from openedAt if omitted" },
      },
      required: ["symbol", "direction", "entryPrice", "quantity", "openedAt"],
    },
  },
  {
    name: "update_trade",
    description: "Update an existing trade by id",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "number" },
        patch: { type: "object", description: "Partial trade fields to update" },
      },
      required: ["id", "patch"],
    },
  },
  {
    name: "list_trades",
    description: "List recent trades (optionally filter by day)",
    inputSchema: {
      type: "object",
      properties: { day: { type: "string" }, limit: { type: "number", default: 100 } },
    },
  },
  {
    name: "get_trade",
    description: "Fetch a single trade by id",
    inputSchema: { type: "object", properties: { id: { type: "number" } }, required: ["id"] },
  },
  // ── DAYS ──────────────────────────────────────────────
  {
    name: "upsert_day",
    description: "Create or update a daily journal entry. Upserts on date. Include what happened, wins, mistakes, lessons, mood, day close balance & P/L.",
    inputSchema: {
      type: "object",
      properties: {
        date: { type: "string", description: "YYYY-MM-DD" },
        whatHappened: { type: "string" },
        marketContext: { type: "string" },
        mood: { type: "number", description: "1-10" },
        wins: { type: "string" },
        mistakes: { type: "string" },
        lessons: { type: "string" },
        dailyCloseBalance: { type: "number" },
        dailyClosePnL: { type: "number" },
        disciplineScore: { type: "number", description: "0-100" },
        tags: { type: "string", description: "comma-separated" },
      },
      required: ["date"],
    },
  },
  {
    name: "get_day",
    description: "Get a day's journal entry",
    inputSchema: { type: "object", properties: { date: { type: "string" } }, required: ["date"] },
  },
  {
    name: "list_days",
    description: "List all days (most recent first)",
    inputSchema: { type: "object", properties: {} },
  },
  // ── LESSONS ───────────────────────────────────────────
  {
    name: "add_lesson",
    description: "Save a lesson to the knowledge base",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        body: { type: "string" },
        tags: { type: "string" },
        severity: { type: "string", enum: ["info", "warning", "critical"] },
        sourceDate: { type: "string" },
        sourceTradeId: { type: "number" },
      },
      required: ["title", "body"],
    },
  },
  {
    name: "search_lessons",
    description: "Search the lessons library by title/body/tags",
    inputSchema: { type: "object", properties: { q: { type: "string" } } },
  },
  // ── MISTAKES ──────────────────────────────────────────
  {
    name: "log_mistake",
    description: "Log a trading mistake with a categorization tag. Use when user identifies they broke a rule.",
    inputSchema: {
      type: "object",
      properties: {
        tag: { type: "string", description: "e.g. chased_entry, revenge_trade, no_sl_set, oversized, moved_sl_against_me, fomo_entry" },
        tradeId: { type: "number" },
        dayDate: { type: "string" },
        notes: { type: "string" },
      },
      required: ["tag"],
    },
  },
  {
    name: "list_mistakes",
    description: "List all logged mistakes",
    inputSchema: { type: "object", properties: {} },
  },
  // ── RULES ─────────────────────────────────────────────
  {
    name: "add_rule",
    description: "Add a trading rule",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string" },
        category: { type: "string", enum: ["risk", "entry", "exit", "timing", "psychology"] },
        orderNum: { type: "number" },
        active: { type: "boolean" },
      },
      required: ["text"],
    },
  },
  {
    name: "list_rules",
    description: "List all trading rules",
    inputSchema: { type: "object", properties: {} },
  },
  // ── CHECKLIST ─────────────────────────────────────────
  {
    name: "add_checklist_item",
    description: "Add a pre-trade checklist item",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string" },
        category: { type: "string", enum: ["analysis", "risk", "timing", "confirmation"] },
        orderNum: { type: "number" },
      },
      required: ["text"],
    },
  },
  {
    name: "list_checklist",
    description: "List all pre-trade checklist items",
    inputSchema: { type: "object", properties: {} },
  },
  // ── SNAPSHOTS ─────────────────────────────────────────
  {
    name: "add_snapshot",
    description: "Record an end-of-day account balance snapshot (for equity curve)",
    inputSchema: {
      type: "object",
      properties: {
        date: { type: "string" },
        balance: { type: "number" },
        equity: { type: "number" },
        withdrawn: { type: "number" },
        deposited: { type: "number" },
        notes: { type: "string" },
      },
      required: ["date", "balance"],
    },
  },
  // ── GOALS ─────────────────────────────────────────────
  {
    name: "add_goal",
    description: "Add a trading goal",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        targetValue: { type: "number" },
        currentValue: { type: "number" },
        unit: { type: "string" },
        deadline: { type: "string" },
      },
      required: ["title", "targetValue"],
    },
  },
  // ── SCREENSHOTS ───────────────────────────────────────
  {
    name: "list_screenshots",
    description: "List screenshots (optionally filter by day or trade)",
    inputSchema: {
      type: "object",
      properties: { day: { type: "string" }, tradeId: { type: "number" } },
    },
  },
  // ── SETUPS ────────────────────────────────────────────
  {
    name: "add_setup",
    description: "Create a new trade setup (reusable strategy template). Conditions are stored as JSON arrays — each condition can be {indicator, operator, value, note}. Direction is BUY / SELL / BOTH.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        description: { type: "string" },
        direction: { type: "string", enum: ["BUY", "SELL", "BOTH"] },
        category: { type: "string", description: "e.g. breakout / reversal / trend / mean-reversion / ICT / scalp / exit" },
        timeframe: { type: "string", description: "e.g. 5m, 15m, 1H, 4H, D" },
        bestSession: { type: "string", description: "Asian / London / Overlap / NY / Any" },
        entryConditionsJson: { type: "string", description: "JSON array of {indicator, operator, value, note}" },
        exitConditionsJson: { type: "string", description: "JSON array of exit conditions" },
        slRule: { type: "string" },
        tpRule: { type: "string" },
        invalidationRule: { type: "string" },
        confluenceNotes: { type: "string", description: "Extra A+ confluences to look for" },
        tags: { type: "string", description: "comma-separated" },
        active: { type: "boolean" },
      },
      required: ["name", "direction"],
    },
  },
  {
    name: "update_setup",
    description: "Update an existing setup by id",
    inputSchema: {
      type: "object",
      properties: { id: { type: "number" }, patch: { type: "object" } },
      required: ["id", "patch"],
    },
  },
  {
    name: "list_setups",
    description: "List all trade setups (optionally search with q)",
    inputSchema: { type: "object", properties: { q: { type: "string" } } },
  },
  {
    name: "get_setup",
    description: "Fetch a single setup by id",
    inputSchema: { type: "object", properties: { id: { type: "number" } }, required: ["id"] },
  },
  {
    name: "delete_setup",
    description: "Delete a setup by id",
    inputSchema: { type: "object", properties: { id: { type: "number" } }, required: ["id"] },
  },
  // ── CODE LIBRARY ──────────────────────────────────────
  {
    name: "add_code",
    description: "Save a code snippet (Pine / MQL4 / MQL5 / Python / JavaScript / JSON / anything). Use for your Pine Script library, MT4/5 Experts, webhook JSON templates, automation scripts.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        description: { type: "string" },
        code: { type: "string", description: "The full source code. Preserve newlines." },
        language: { type: "string", description: "pine / mql4 / mql5 / python / javascript / typescript / json / bash / other" },
        kind: { type: "string", description: "indicator / strategy / EA / utility / library / webhook" },
        platform: { type: "string", description: "TradingView / MT4 / MT5 / NinjaTrader / custom" },
        pineVersion: { type: "string", description: "v5 / v6 — when language=pine" },
        symbol: { type: "string" },
        timeframe: { type: "string" },
        tags: { type: "string", description: "comma-separated" },
        source: { type: "string", description: "Original URL or author credit" },
        active: { type: "boolean" },
      },
      required: ["name", "code", "language"],
    },
  },
  {
    name: "update_code",
    description: "Update a code snippet by id",
    inputSchema: {
      type: "object",
      properties: { id: { type: "number" }, patch: { type: "object" } },
      required: ["id", "patch"],
    },
  },
  {
    name: "list_code",
    description: "List code snippets. Optional search (q) and language filter.",
    inputSchema: {
      type: "object",
      properties: {
        q: { type: "string" },
        language: { type: "string" },
      },
    },
  },
  {
    name: "get_code",
    description: "Fetch a single code snippet by id (returns full code)",
    inputSchema: { type: "object", properties: { id: { type: "number" } }, required: ["id"] },
  },
  {
    name: "delete_code",
    description: "Delete a code snippet by id",
    inputSchema: { type: "object", properties: { id: { type: "number" } }, required: ["id"] },
  },

  // ── STATS / SUMMARIES ─────────────────────────────────
  {
    name: "stats",
    description: "Get full analytics payload (totals, equity curve, drawdown, setup perf, session heatmap, R-distribution, mistake tags)",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "journal_summary",
    description: "Human-readable one-screen summary: total P/L, win rate, streak, best setup, top mistake, rules compliance",
    inputSchema: { type: "object", properties: {} },
  },
];

// Response helper — MCP expects content array
function textResult(data: unknown) {
  const text = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  return { content: [{ type: "text", text }] };
}

function formatUsd(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return sign + "$" + n.toFixed(2);
}

/**
 * Ensure a day row exists for the given YYYY-MM-DD.
 * Called before inserting anything that FKs to days.date.
 */
function ensureDay(date: string | null | undefined) {
  if (!date) return;
  const existing = db.select().from(days).where(eq(days.date, date)).get();
  if (!existing) {
    const now = new Date();
    db.insert(days).values({ date, createdAt: now, updatedAt: now } as any).run();
  }
}

export async function callTool(name: string, args: Record<string, any> = {}) {
  switch (name) {
    // TRADES
    case "add_trade": {
      const openedAt = new Date(args.openedAt);
      const closedAt = args.closedAt ? new Date(args.closedAt) : undefined;
      let rMultiple: number | undefined;
      if (args.exitPrice && args.stopLoss) {
        rMultiple = calcRMultiple(args.entryPrice, args.exitPrice, args.stopLoss, args.direction);
      }
      const dayDate = args.dayDate ?? openedAt.toISOString().slice(0, 10);
      ensureDay(dayDate);
      const now = new Date();
      const { openedAt: _a, closedAt: _b, ...rest } = args;
      const row = db.insert(trades).values({
        symbol: rest.symbol, direction: rest.direction, entryPrice: rest.entryPrice, quantity: rest.quantity,
        exitPrice: rest.exitPrice, stopLoss: rest.stopLoss, takeProfit: rest.takeProfit,
        pnl: rest.pnl, setupType: rest.setupType, session: rest.session, confluenceScore: rest.confluenceScore,
        notesEntry: rest.notesEntry, notesReview: rest.notesReview,
        followedRules: rest.followedRules, mood: rest.mood,
        dayDate, openedAt, closedAt, rMultiple, createdAt: now, updatedAt: now,
      }).returning().get();
      return textResult(row);
    }
    case "update_trade": {
      const patch: Record<string, unknown> = { ...args.patch, updatedAt: new Date() };
      if (args.patch?.openedAt) patch.openedAt = new Date(args.patch.openedAt);
      if (args.patch?.closedAt) patch.closedAt = new Date(args.patch.closedAt);
      db.update(trades).set(patch).where(eq(trades.id, args.id)).run();
      return textResult(db.select().from(trades).where(eq(trades.id, args.id)).get());
    }
    case "list_trades": {
      const limit = args.limit ?? 100;
      const rows = args.day
        ? db.select().from(trades).where(eq(trades.dayDate, args.day)).orderBy(desc(trades.openedAt)).limit(limit).all()
        : db.select().from(trades).orderBy(desc(trades.openedAt)).limit(limit).all();
      return textResult(rows);
    }
    case "get_trade":
      return textResult(db.select().from(trades).where(eq(trades.id, args.id)).get() ?? null);

    // DAYS
    case "upsert_day": {
      const existing = db.select().from(days).where(eq(days.date, args.date)).get();
      const now = new Date();
      const payload: any = { ...args };
      if (existing) db.update(days).set({ ...payload, updatedAt: now }).where(eq(days.date, args.date)).run();
      else db.insert(days).values({ ...payload, createdAt: now, updatedAt: now } as any).run();
      return textResult(db.select().from(days).where(eq(days.date, args.date)).get());
    }
    case "get_day":
      return textResult(db.select().from(days).where(eq(days.date, args.date)).get() ?? null);
    case "list_days":
      return textResult(db.select().from(days).orderBy(desc(days.date)).all());

    // LESSONS
    case "add_lesson": {
      const now = new Date();
      const row = db.insert(lessons).values({ ...(args as any), createdAt: now, updatedAt: now } as any).returning().get();
      return textResult(row);
    }
    case "search_lessons": {
      const q = args.q;
      const rows = q
        ? db.select().from(lessons).where(or(like(lessons.title, `%${q}%`), like(lessons.body, `%${q}%`), like(lessons.tags, `%${q}%`))).orderBy(desc(lessons.updatedAt)).all()
        : db.select().from(lessons).orderBy(desc(lessons.updatedAt)).all();
      return textResult(rows);
    }

    // MISTAKES
    case "log_mistake": {
      ensureDay(args.dayDate);
      return textResult(db.insert(mistakes).values(args as any).returning().get());
    }
    case "list_mistakes":
      return textResult(db.select().from(mistakes).orderBy(desc(mistakes.createdAt)).all());

    // RULES
    case "add_rule":
      return textResult(db.insert(rules).values(args as any).returning().get());
    case "list_rules":
      return textResult(db.select().from(rules).orderBy(asc(rules.orderNum), asc(rules.id)).all());

    // CHECKLIST
    case "add_checklist_item":
      return textResult(db.insert(checklistItems).values(args as any).returning().get());
    case "list_checklist":
      return textResult(db.select().from(checklistItems).orderBy(asc(checklistItems.orderNum), asc(checklistItems.id)).all());

    // SNAPSHOTS
    case "add_snapshot":
      return textResult(db.insert(accountSnapshots).values(args as any).returning().get());

    // GOALS
    case "add_goal":
      return textResult(db.insert(goals).values(args as any).returning().get());

    // SCREENSHOTS
    case "list_screenshots": {
      let rows;
      if (args.tradeId) rows = db.select().from(screenshots).where(eq(screenshots.tradeId, args.tradeId)).all();
      else if (args.day) rows = db.select().from(screenshots).where(eq(screenshots.dayDate, args.day)).all();
      else rows = db.select().from(screenshots).orderBy(desc(screenshots.uploadedAt)).limit(200).all();
      return textResult(rows);
    }

    // SETUPS
    case "add_setup": {
      const now = new Date();
      const row = db.insert(setups).values({ ...(args as any), createdAt: now, updatedAt: now } as any).returning().get();
      return textResult(row);
    }
    case "update_setup":
      db.update(setups).set({ ...(args as any).patch, updatedAt: new Date() }).where(eq(setups.id, args.id)).run();
      return textResult(db.select().from(setups).where(eq(setups.id, args.id)).get());
    case "list_setups": {
      const q = args.q;
      const rows = q
        ? db.select().from(setups).where(or(like(setups.name, `%${q}%`), like(setups.description, `%${q}%`), like(setups.tags, `%${q}%`))).all()
        : db.select().from(setups).all();
      return textResult(rows);
    }
    case "get_setup":
      return textResult(db.select().from(setups).where(eq(setups.id, args.id)).get() ?? null);
    case "delete_setup":
      db.delete(setups).where(eq(setups.id, args.id)).run();
      return textResult({ ok: true });

    // CODE LIBRARY
    case "add_code": {
      const now = new Date();
      const row = db.insert(codeSnippets).values({ ...(args as any), createdAt: now, updatedAt: now } as any).returning().get();
      return textResult(row);
    }
    case "update_code":
      db.update(codeSnippets).set({ ...(args as any).patch, updatedAt: new Date() }).where(eq(codeSnippets.id, args.id)).run();
      return textResult(db.select().from(codeSnippets).where(eq(codeSnippets.id, args.id)).get());
    case "list_code": {
      let rows;
      if (args.q) {
        rows = db.select().from(codeSnippets).where(or(
          like(codeSnippets.name, `%${args.q}%`),
          like(codeSnippets.description, `%${args.q}%`),
          like(codeSnippets.tags, `%${args.q}%`),
          like(codeSnippets.code, `%${args.q}%`)
        )).all();
      } else if (args.language) {
        rows = db.select().from(codeSnippets).where(eq(codeSnippets.language, args.language)).all();
      } else {
        rows = db.select().from(codeSnippets).orderBy(desc(codeSnippets.updatedAt)).all();
      }
      return textResult(rows);
    }
    case "get_code":
      return textResult(db.select().from(codeSnippets).where(eq(codeSnippets.id, args.id)).get() ?? null);
    case "delete_code":
      db.delete(codeSnippets).where(eq(codeSnippets.id, args.id)).run();
      return textResult({ ok: true });

    // STATS / SUMMARY
    case "stats":
    case "journal_summary": {
      const allTrades = db.select().from(trades).orderBy(asc(trades.openedAt)).all();
      const allDays = db.select().from(days).orderBy(asc(days.date)).all();
      const snapshots = db.select().from(accountSnapshots).orderBy(asc(accountSnapshots.date)).all();
      const allMistakes = db.select().from(mistakes).orderBy(desc(mistakes.createdAt)).all();

      const closed = allTrades.filter((t) => t.pnl != null);
      const wins = closed.filter((t) => (t.pnl ?? 0) > 0);
      const losses = closed.filter((t) => (t.pnl ?? 0) < 0);
      const totalPnL = closed.reduce((s, t) => s + (t.pnl ?? 0), 0);
      const winRate = closed.length ? wins.length / closed.length : 0;
      const avgWin = wins.length ? wins.reduce((s, t) => s + (t.pnl ?? 0), 0) / wins.length : 0;
      const avgLoss = losses.length ? losses.reduce((s, t) => s + (t.pnl ?? 0), 0) / losses.length : 0;
      const expectancy = winRate * avgWin + (1 - winRate) * avgLoss;

      // setup perf
      const setupMap = new Map<string, { wins: number; losses: number; pnl: number }>();
      for (const t of closed) {
        const k = t.setupType || "Unknown";
        const m = setupMap.get(k) ?? { wins: 0, losses: 0, pnl: 0 };
        if ((t.pnl ?? 0) > 0) m.wins++; else m.losses++;
        m.pnl += t.pnl ?? 0;
        setupMap.set(k, m);
      }
      const setups = [...setupMap].map(([name, v]) => ({ name, ...v, winRate: v.wins / (v.wins + v.losses || 1) }));

      const mistakeMap = new Map<string, number>();
      for (const m of allMistakes) mistakeMap.set(m.tag, (mistakeMap.get(m.tag) ?? 0) + 1);
      const mistakeTags = [...mistakeMap].map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count);

      // streak
      let curStreak = 0;
      let streakType: "win" | "loss" | null = null;
      for (let i = closed.length - 1; i >= 0; i--) {
        const w = (closed[i].pnl ?? 0) > 0;
        if (streakType == null) { streakType = w ? "win" : "loss"; curStreak = 1; }
        else if ((streakType === "win") === w) curStreak++;
        else break;
      }

      const complianceRate = (() => {
        const reviewed = closed.filter((t) => t.followedRules != null);
        return reviewed.length ? reviewed.filter((t) => t.followedRules).length / reviewed.length : 0;
      })();

      if (name === "journal_summary") {
        const topSetup = [...setups].sort((a, b) => b.pnl - a.pnl)[0];
        const topMistake = mistakeTags[0];
        const lines = [
          `📊 Tradepad journal summary`,
          `─────────────────────────`,
          `Total P/L:      ${formatUsd(totalPnL)}`,
          `Win rate:       ${(winRate * 100).toFixed(1)}%  (${wins.length}W / ${losses.length}L)`,
          `Expectancy:     ${formatUsd(expectancy)} per trade`,
          `Rules follow:   ${(complianceRate * 100).toFixed(0)}%`,
          `Current streak: ${curStreak} ${streakType ?? ""}`.trim(),
          topSetup ? `Best setup:     ${topSetup.name} → ${formatUsd(topSetup.pnl)} (${(topSetup.winRate * 100).toFixed(0)}% WR)` : "",
          topMistake ? `Top mistake:    ${topMistake.tag} (×${topMistake.count})` : "",
          `Days journaled: ${allDays.length}`,
          `Trades logged:  ${allTrades.length}`,
        ].filter(Boolean).join("\n");
        return textResult(lines);
      }

      return textResult({
        totals: {
          tradeCount: allTrades.length, closedCount: closed.length,
          winCount: wins.length, lossCount: losses.length,
          totalPnL, winRate, avgWin, avgLoss, expectancy,
          currentStreak: curStreak, streakType, complianceRate,
          days: allDays.length, snapshots: snapshots.length,
        },
        setups, mistakeTags,
      });
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
