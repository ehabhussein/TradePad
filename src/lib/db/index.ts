import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "node:path";
import fs from "node:fs";
import * as schema from "./schema";

const dbPath = process.env.DATABASE_URL || path.resolve(process.cwd(), "data/journal.db");
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });

// Run migrations on boot
const migrationsFolder = path.resolve(process.cwd(), "drizzle");
if (fs.existsSync(migrationsFolder)) {
  try {
    migrate(db, { migrationsFolder });
  } catch (e) {
    console.error("[db] migration error", e);
  }
}

// Seed defaults if empty
const ruleCount = sqlite.prepare("SELECT COUNT(*) as c FROM rules").get() as { c: number } | undefined;
if (ruleCount?.c === 0) {
  const insert = sqlite.prepare("INSERT INTO rules (text, category, order_num, active) VALUES (?, ?, ?, 1)");
  // The Scalping Manifesto — 12 classic trader's discipline rules
  const defaultRules: Array<[string, string, number]> = [
    ["Know where you will exit before you enter (Profit & Loss)", "entry", 1],
    ["When you see profit, take it", "exit", 2],
    ["Proper money management", "risk", 3],
    ["Enter slowly", "entry", 4],
    ["Don't overtrade", "psychology", 5],
    ["Watch 70% / trade 30% — spend more time analyzing than trading", "psychology", 6],
    ["Don't overtrade × 2 (seriously, don't)", "psychology", 7],
    ["Don't revenge trade", "psychology", 8],
    ["Be patient and sit on your hands", "psychology", 9],
    ["Don't trade against the trend", "entry", 10],
    ["Spend time preparing your entry setup", "entry", 11],
    ["Do not touch your stoploss once set", "risk", 12],
  ];
  const tx = sqlite.transaction(() => defaultRules.forEach((r) => insert.run(...r)));
  tx();
}

// Ensure setups table exists (for DBs created before this feature)
sqlite.exec(`CREATE TABLE IF NOT EXISTS setups (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  name text NOT NULL,
  description text,
  direction text NOT NULL,
  category text,
  timeframe text,
  best_session text,
  entry_conditions_json text,
  exit_conditions_json text,
  sl_rule text,
  tp_rule text,
  invalidation_rule text,
  confluence_notes text,
  tags text,
  active integer DEFAULT 1 NOT NULL,
  created_at integer DEFAULT (unixepoch()) NOT NULL,
  updated_at integer DEFAULT (unixepoch()) NOT NULL
)`);

const setupCount = sqlite.prepare("SELECT COUNT(*) as c FROM setups").get() as { c: number } | undefined;
if (setupCount?.c === 0) {
  const insertSetup = sqlite.prepare(`INSERT INTO setups
    (name, description, direction, category, timeframe, best_session, entry_conditions_json, exit_conditions_json, sl_rule, tp_rule, invalidation_rule, confluence_notes, tags, active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`);

  // Strategies derived from our live TradingView indicators:
  //   - Gold Winner v1 Dashboard (Donchian + EMA + RSI + Chandelier)
  //   - ScalperX Steep Moves (early ignition + confirmed follow-through)
  //   - Claude Edge v1 (ATR, vol regime, MTF EMAs, Asian H/L, confluence score, candle rejection)
  type Cond = { indicator: string; operator: string; value: string; note?: string };
  const j = (arr: Cond[]) => JSON.stringify(arr);

  // Seeded with YOUR 4 proven strategies from the Gold Winner v1 / ScalperX / Claude Edge v1
  // indicator stack on TradingView. Users can add any other strategy via the UI or MCP.
  const presets: any[] = [
    {
      name: "Gold Winner v1 — Donchian Breakout",
      description: "The core GW strategy. Donchian 20-bar break in the direction of the EMA trend stack, filtered by RSI. Works both BUY and SELL.",
      direction: "BOTH", category: "breakout", timeframe: "1H", bestSession: "London",
      entry: [
        { indicator: "EMA21/50/200 stack", operator: "aligned", value: "bullish (BUY) or bearish (SELL)", note: "EMA21>EMA50, close>EMA200 for BUY; inverse for SELL" },
        { indicator: "price", operator: "breaks", value: "Donchian(20)[1] high (BUY) or low (SELL)" },
        { indicator: "RSI(14)", operator: "in range", value: "45–80 for BUY / 20–55 for SELL" },
        { indicator: "GW Dashboard Signal", operator: "=", value: "BUY_NOW or SELL_NOW", note: "The dashboard fires the final trigger" },
      ],
      exit: [
        { indicator: "Chandelier stop", operator: "hit", value: "chandHigh for longs / chandLow for shorts", note: "Dynamic trail" },
      ],
      sl: "2× ATR(14) from entry (1× for sub-$100 accounts to stay under $2 risk)",
      tp: "Partial at 1R, runner trailed by Chandelier — often exits between 1.5R and 3R",
      invalidation: "Price closes back across EMA200 on the entry TF",
      confluence: "DXY direction opposite to gold, BF Flow ≥ 60 (BULL) or ≤ 40 (BEAR), Claude Edge score ≥ 6",
      tags: "gold-winner,donchian,breakout,trend",
    },
    {
      name: "Pivot Bounce BUY (April 15 playbook)",
      description: "The +$93.35 winning setup. Price pulls back to the daily pivot during a weak-DXY regime, institutional flow confirms, then bounce. Scale SL to BE at +$5.",
      direction: "BUY", category: "reversal", timeframe: "1H", bestSession: "London",
      entry: [
        { indicator: "price", operator: "touches", value: "FxPro Pivot P (daily)" },
        { indicator: "DXY", operator: "trending", value: "down (≥ 3 consecutive closes)" },
        { indicator: "BF Flow", operator: ">", value: "60", note: "STRONG_BULL threshold — institutional buying" },
        { indicator: "Claude Edge buyScore", operator: "≥", value: "6/11" },
        { indicator: "Claude Edge tooFast", operator: "=", value: "false" },
        { indicator: "price", operator: ">", value: "Claude Edge dEma200" },
        { indicator: "session", operator: "=", value: "post-manipulation (08:00+ UTC)" },
      ],
      exit: [
        { indicator: "price", operator: "hits", value: "Pivot R1 (first TP)" },
        { indicator: "SL", operator: "moved to", value: "BE once +$5 unrealized" },
      ],
      sl: "Just below the pivot (~20 pips on 0.01 lot = $2 max risk)",
      tp: "R1 for main, runner to R2 with trailed SL",
      invalidation: "1H close below pivot, or BF Flow crashes below 50",
      confluence: "ScalperX EARLY_UP or CONF_UP preferred, Gold Winner HOLD_LONG or BUY_NOW",
      tags: "pivot,reversal,high-conviction,winning-playbook",
    },
    {
      name: "ScalperX — Confirmed Steep Move",
      description: "Ride a confirmed steep momentum move after early-ignition prints. Overrides tooFast filter — when direction is confirmed, trade with it.",
      direction: "BOTH", category: "momentum", timeframe: "5m", bestSession: "London/Overlap",
      entry: [
        { indicator: "ScalperX signal", operator: "=", value: "CONF_UP (BUY) or CONF_DOWN (SELL)", note: "Teal/red marker printed" },
        { indicator: "ScalperX prior bar", operator: "=", value: "EARLY_UP / EARLY_DOWN", note: "Yellow/orange ignition preceded" },
        { indicator: "Claude Edge ROC", operator: ">", value: "0.3%", note: "Expansion confirmed — tooFast is a GO here, not a STOP" },
        { indicator: "close", operator: "relative to", value: "VWAP (above for BUY, below for SELL)" },
      ],
      exit: [
        { indicator: "ScalperX", operator: "=", value: "NONE", note: "Steepness fades → take profit" },
        { indicator: "first opposite swing", operator: "breaks", value: "prior bar structure" },
      ],
      sl: "Prior 5m swing low/high (tight — typically 8–12 pips on gold)",
      tp: "Scalp 1R–1.5R fast. Don't hold past 3 bars after the confirmed-signal bar.",
      invalidation: "Two consecutive opposite-color 5m closes after CONF signal",
      confluence: "BF Flow aligned (≥ 60 bull / ≤ 40 bear), Claude Edge score ≥ 6 in direction",
      tags: "scalperx,momentum,scalp,fast",
    },
    {
      name: "Asian Liquidity Sweep Reversal (AMD)",
      description: "ICT power-of-three model. London open sweeps Asian High or Low, rejection candle prints, price reverses back into the range. Textbook liquidity grab.",
      direction: "BOTH", category: "ICT", timeframe: "15m", bestSession: "London open",
      entry: [
        { indicator: "session", operator: "=", value: "London (07:00–09:00 UTC)" },
        { indicator: "price", operator: "swept", value: "ce.asianHigh OR ce.asianLow" },
        { indicator: "Claude Edge wickBody", operator: ">", value: "2.0", note: "Sharp rejection wick on the sweep bar" },
        { indicator: "close", operator: "reverses into", value: "Asian range" },
      ],
      exit: [
        { indicator: "price", operator: "hits", value: "opposite side of Asian range", note: "Main target" },
        { indicator: "any H1 close", operator: "goes against", value: "the reversal — cut" },
      ],
      sl: "Just beyond the sweep extreme (tight — 1× ATR typical)",
      tp: "Opposite Asian range edge → usually 2R+",
      invalidation: "Two consecutive 15m closes outside the range on the sweep side (acceptance, not sweep)",
      confluence: "DXY diverging from gold, Gold Winner ≠ WAIT, BF Flow flipping with reversal direction",
      tags: "ICT,AMD,claude-edge,liquidity-sweep,london-open",
    },
  ];

  const tx = sqlite.transaction(() => {
    for (const s of presets) {
      insertSetup.run(
        s.name, s.description, s.direction, s.category, s.timeframe, s.bestSession,
        j(s.entry), j(s.exit), s.sl, s.tp, s.invalidation, s.confluence, s.tags
      );
    }
  });
  tx();
}

const checklistCount = sqlite.prepare("SELECT COUNT(*) as c FROM checklist_items").get() as { c: number } | undefined;
if (checklistCount?.c === 0) {
  const insert = sqlite.prepare("INSERT INTO checklist_items (text, category, order_num, active) VALUES (?, ?, ?, 1)");
  const defaults: Array<[string, string, number]> = [
    ["Daily+4H trend identified", "analysis", 1],
    ["Key S/R levels marked", "analysis", 2],
    ["DXY direction checked", "analysis", 3],
    ["Economic calendar scanned for today", "analysis", 4],
    ["Confluence score ≥ 6/14", "analysis", 5],
    ["SL placed at 2× ATR (or 1× for small account)", "risk", 6],
    ["Risk per trade ≤ $2", "risk", 7],
    ["TP at minimum 1.5 R", "risk", 8],
    ["Session = London or NY overlap", "timing", 9],
    ["Manipulation window (07:00-08:00 UTC) cleared", "timing", 10],
    ["No major news in next 60 min", "timing", 11],
    ["Gold Winner v1 signal fired", "confirmation", 12],
    ["BF Flow direction confirms", "confirmation", 13],
    ["Price at structure (OB / FVG / pivot)", "confirmation", 14],
  ];
  const tx = sqlite.transaction(() => defaults.forEach((r) => insert.run(...r)));
  tx();
}
