import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// Daily entries — one per trading day
export const days = sqliteTable("days", {
  date: text("date").primaryKey(), // YYYY-MM-DD
  whatHappened: text("what_happened"),
  marketContext: text("market_context"),
  mood: integer("mood"), // 1-10
  wins: text("wins"),
  mistakes: text("mistakes"),
  lessons: text("lessons"),
  dailyCloseBalance: real("daily_close_balance"),
  dailyClosePnL: real("daily_close_pnl"),
  checklistJson: text("checklist_json"), // JSON array of {id, checked}
  disciplineScore: integer("discipline_score"), // 0-100 from checklist completion
  tags: text("tags"), // comma-separated
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

// Individual trades
export const trades = sqliteTable("trades", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  dayDate: text("day_date").references(() => days.date, { onDelete: "cascade" }),
  symbol: text("symbol").notNull(),
  direction: text("direction").notNull(), // BUY / SELL
  entryPrice: real("entry_price").notNull(),
  exitPrice: real("exit_price"),
  stopLoss: real("stop_loss"),
  takeProfit: real("take_profit"),
  quantity: real("quantity").notNull(),
  pnl: real("pnl"),
  rMultiple: real("r_multiple"),
  setupType: text("setup_type"), // e.g. "Pivot Bounce BUY"
  session: text("session"), // Asian / London / Overlap / NY
  confluenceScore: integer("confluence_score"), // 0-14
  notesEntry: text("notes_entry"),
  notesReview: text("notes_review"),
  followedRules: integer("followed_rules", { mode: "boolean" }),
  mood: integer("mood"), // 1-10 at time of trade
  openedAt: integer("opened_at", { mode: "timestamp" }).notNull(),
  closedAt: integer("closed_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

// Screenshots — attachable to day OR trade
export const screenshots = sqliteTable("screenshots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  filename: text("filename").notNull(), // stored in data/screenshots/
  originalName: text("original_name"),
  mimeType: text("mime_type"),
  sizeBytes: integer("size_bytes"),
  width: integer("width"),
  height: integer("height"),
  dayDate: text("day_date").references(() => days.date, { onDelete: "cascade" }),
  tradeId: integer("trade_id").references(() => trades.id, { onDelete: "cascade" }),
  caption: text("caption"),
  uploadedAt: integer("uploaded_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

// Lessons library — searchable knowledge base
export const lessons = sqliteTable("lessons", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  body: text("body").notNull(),
  tags: text("tags"), // comma-separated
  severity: text("severity"), // info / warning / critical
  sourceDate: text("source_date"), // YYYY-MM-DD when it was learned
  sourceTradeId: integer("source_trade_id").references(() => trades.id),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

// Trading rules — living document
export const rules = sqliteTable("rules", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  text: text("text").notNull(),
  category: text("category"), // risk / entry / exit / psychology
  orderNum: integer("order_num").default(0).notNull(),
  active: integer("active", { mode: "boolean" }).default(true).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

// Pre-trade checklist items — reusable
export const checklistItems = sqliteTable("checklist_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  text: text("text").notNull(),
  category: text("category"), // analysis / risk / timing / confirmation
  orderNum: integer("order_num").default(0).notNull(),
  active: integer("active", { mode: "boolean" }).default(true).notNull(),
});

// Mistake tags — categorized failures for the tag cloud
export const mistakes = sqliteTable("mistakes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tag: text("tag").notNull(), // "chased_entry" / "moved_sl_against" / "revenge_trade"
  tradeId: integer("trade_id").references(() => trades.id, { onDelete: "cascade" }),
  dayDate: text("day_date").references(() => days.date, { onDelete: "cascade" }),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

// Daily account snapshot for equity curve
export const accountSnapshots = sqliteTable("account_snapshots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(), // YYYY-MM-DD
  balance: real("balance").notNull(),
  equity: real("equity"),
  withdrawn: real("withdrawn").default(0),
  deposited: real("deposited").default(0),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

// Goals — account size targets, R-target, etc.
export const goals = sqliteTable("goals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  targetValue: real("target_value").notNull(),
  currentValue: real("current_value"),
  unit: text("unit"), // $ / R / %
  deadline: text("deadline"), // YYYY-MM-DD
  achieved: integer("achieved", { mode: "boolean" }).default(false).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export type Day = typeof days.$inferSelect;
export type NewDay = typeof days.$inferInsert;
export type Trade = typeof trades.$inferSelect;
export type NewTrade = typeof trades.$inferInsert;
export type Screenshot = typeof screenshots.$inferSelect;
export type Lesson = typeof lessons.$inferSelect;
export type Rule = typeof rules.$inferSelect;
export type ChecklistItem = typeof checklistItems.$inferSelect;
export type Mistake = typeof mistakes.$inferSelect;
export type AccountSnapshot = typeof accountSnapshots.$inferSelect;
export type Goal = typeof goals.$inferSelect;
