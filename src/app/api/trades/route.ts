import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { trades, days } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { requireApiKey } from "@/lib/auth";
import { calcRMultiple } from "@/lib/utils";

function ensureDay(date: string) {
  const existing = db.select().from(days).where(eq(days.date, date)).get();
  if (!existing) {
    const now = new Date();
    db.insert(days).values({ date, createdAt: now, updatedAt: now } as any).run();
  }
}

const tradeSchema = z.object({
  dayDate: z.string().optional(),
  symbol: z.string(),
  direction: z.enum(["BUY", "SELL"]),
  entryPrice: z.number(),
  exitPrice: z.number().optional(),
  stopLoss: z.number().optional(),
  takeProfit: z.number().optional(),
  quantity: z.number(),
  pnl: z.number().optional(),
  setupType: z.string().optional(),
  session: z.string().optional(),
  confluenceScore: z.number().min(0).max(14).optional(),
  notesEntry: z.string().optional(),
  notesReview: z.string().optional(),
  followedRules: z.boolean().optional(),
  mood: z.number().min(1).max(10).optional(),
  openedAt: z.string().or(z.number()),
  closedAt: z.string().or(z.number()).optional(),
});

export async function GET(req: NextRequest) {
  const auth = requireApiKey(req); if (auth) return auth;
  const u = new URL(req.url);
  const day = u.searchParams.get("day");
  const id = u.searchParams.get("id");
  if (id) {
    const row = db.select().from(trades).where(eq(trades.id, Number(id))).get();
    return NextResponse.json(row ?? null);
  }
  if (day) {
    const rows = db.select().from(trades).where(eq(trades.dayDate, day)).orderBy(desc(trades.openedAt)).all();
    return NextResponse.json(rows);
  }
  const rows = db.select().from(trades).orderBy(desc(trades.openedAt)).limit(500).all();
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const auth = requireApiKey(req); if (auth) return auth;
  const body = await req.json();
  const parsed = tradeSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const d = parsed.data;
  const openedAt = new Date(typeof d.openedAt === "string" ? d.openedAt : Number(d.openedAt));
  const closedAt = d.closedAt ? new Date(typeof d.closedAt === "string" ? d.closedAt : Number(d.closedAt)) : undefined;
  let rMultiple: number | undefined;
  if (d.exitPrice && d.stopLoss) {
    rMultiple = calcRMultiple(d.entryPrice, d.exitPrice, d.stopLoss, d.direction);
  }
  const dayDate = d.dayDate ?? openedAt.toISOString().slice(0, 10);
  ensureDay(dayDate);
  const now = new Date();
  const { openedAt: _oa, closedAt: _ca, ...rest } = d;
  const result = db.insert(trades).values({ ...rest, dayDate, openedAt, closedAt, rMultiple, createdAt: now, updatedAt: now }).returning().get();
  return NextResponse.json(result);
}

export async function PATCH(req: NextRequest) {
  const auth = requireApiKey(req); if (auth) return auth;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const body = await req.json();
  const patch: Record<string, unknown> = { ...body, updatedAt: new Date() };
  if (body.openedAt) patch.openedAt = new Date(body.openedAt);
  if (body.closedAt) patch.closedAt = new Date(body.closedAt);
  db.update(trades).set(patch).where(eq(trades.id, Number(id))).run();
  const row = db.select().from(trades).where(eq(trades.id, Number(id))).get();
  return NextResponse.json(row);
}

export async function DELETE(req: NextRequest) {
  const auth = requireApiKey(req); if (auth) return auth;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  db.delete(trades).where(eq(trades.id, Number(id))).run();
  return NextResponse.json({ ok: true });
}
