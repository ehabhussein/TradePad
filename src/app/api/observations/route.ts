import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { observations } from "@/lib/db/schema";
import { desc, eq, like, or, and, gte, lte } from "drizzle-orm";
import { z } from "zod";
import { requireApiKey } from "@/lib/auth";

const schema = z.object({
  symbol: z.string().optional(),
  observedAt: z.string().or(z.number()),
  timeframe: z.string().optional(),
  session: z.string().optional(),
  title: z.string(),
  body: z.string().optional(),
  category: z.string().optional(),
  priceAt: z.number().optional(),
  tags: z.string().optional(),
  relatedTradeId: z.number().optional(),
  screenshotId: z.number().optional(),
  importance: z.number().min(1).max(5).optional(),
  outcome: z.enum(["happened", "didnt_happen", "partial", "pending"]).optional(),
  outcomeNotes: z.string().optional(),
});

function deriveHourAndWeekday(d: Date) {
  return { hourUtc: d.getUTCHours(), weekdayUtc: d.getUTCDay() };
}

export async function GET(req: NextRequest) {
  const auth = requireApiKey(req); if (auth) return auth;
  const u = new URL(req.url);
  const id = u.searchParams.get("id");
  const q = u.searchParams.get("q");
  const symbol = u.searchParams.get("symbol");
  const category = u.searchParams.get("category");
  const hour = u.searchParams.get("hour");

  if (id) {
    return NextResponse.json(db.select().from(observations).where(eq(observations.id, Number(id))).get() ?? null);
  }

  const where: any[] = [];
  if (symbol) where.push(eq(observations.symbol, symbol));
  if (category) where.push(eq(observations.category, category));
  if (hour !== null && hour !== "") where.push(eq(observations.hourUtc, Number(hour)));
  if (q) where.push(or(like(observations.title, `%${q}%`), like(observations.body, `%${q}%`), like(observations.tags, `%${q}%`)));

  const rows = where.length
    ? db.select().from(observations).where(and(...where)).orderBy(desc(observations.observedAt)).all()
    : db.select().from(observations).orderBy(desc(observations.observedAt)).limit(500).all();

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const auth = requireApiKey(req); if (auth) return auth;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const d = parsed.data;
  const observedAt = new Date(typeof d.observedAt === "string" ? d.observedAt : Number(d.observedAt));
  const { hourUtc, weekdayUtc } = deriveHourAndWeekday(observedAt);
  const now = new Date();
  const { observedAt: _oa, ...rest } = d;
  const row = db.insert(observations).values({ ...rest, observedAt, hourUtc, weekdayUtc, createdAt: now, updatedAt: now } as any).returning().get();
  return NextResponse.json(row);
}

export async function PATCH(req: NextRequest) {
  const auth = requireApiKey(req); if (auth) return auth;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const body = await req.json();
  const patch: Record<string, unknown> = { ...body, updatedAt: new Date() };
  if (body.observedAt) {
    const d = new Date(body.observedAt);
    patch.observedAt = d;
    const { hourUtc, weekdayUtc } = deriveHourAndWeekday(d);
    patch.hourUtc = hourUtc;
    patch.weekdayUtc = weekdayUtc;
  }
  db.update(observations).set(patch).where(eq(observations.id, Number(id))).run();
  return NextResponse.json(db.select().from(observations).where(eq(observations.id, Number(id))).get());
}

export async function DELETE(req: NextRequest) {
  const auth = requireApiKey(req); if (auth) return auth;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  db.delete(observations).where(eq(observations.id, Number(id))).run();
  return NextResponse.json({ ok: true });
}
