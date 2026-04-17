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
  const defaultRules: Array<[string, string, number]> = [
    ["Max $2 loss per trade on sub-$100 account", "risk", 1],
    ["SL must be set on entry — never manage manually", "risk", 2],
    ["Strictly follow Gold Winner v1 signal — no manual override", "entry", 3],
    ["Never trade during 07:00-08:00 UTC London manipulation window", "timing", 4],
    ["After 5 rejections of same level → STOP trading it", "entry", 5],
    ["After 2 consecutive losses → pause 2 hours", "psychology", 6],
    ["Never test order forms on real account — demo only", "risk", 7],
    ["Close all positions/orders before Friday market close", "risk", 8],
    ["Never use market orders during Fed/FOMC/Powell events", "timing", 9],
    ["Scalp: close GOLD trades on FxPro as soon as they're in profit", "exit", 10],
  ];
  const tx = sqlite.transaction(() => defaultRules.forEach((r) => insert.run(...r)));
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
