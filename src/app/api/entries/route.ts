import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { days } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { requireApiKey } from "@/lib/auth";

const entrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  whatHappened: z.string().optional(),
  marketContext: z.string().optional(),
  mood: z.number().min(1).max(10).optional(),
  wins: z.string().optional(),
  mistakes: z.string().optional(),
  lessons: z.string().optional(),
  dailyCloseBalance: z.number().optional(),
  dailyClosePnL: z.number().optional(),
  checklistJson: z.string().optional(),
  disciplineScore: z.number().min(0).max(100).optional(),
  tags: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const auth = requireApiKey(req); if (auth) return auth;
  const date = new URL(req.url).searchParams.get("date");
  if (date) {
    const row = db.select().from(days).where(eq(days.date, date)).get();
    return NextResponse.json(row ?? null);
  }
  const rows = db.select().from(days).orderBy(desc(days.date)).all();
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const auth = requireApiKey(req); if (auth) return auth;
  const body = await req.json();
  const parsed = entrySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const existing = db.select().from(days).where(eq(days.date, parsed.data.date)).get();
  const now = new Date();
  if (existing) {
    db.update(days).set({ ...parsed.data, updatedAt: now }).where(eq(days.date, parsed.data.date)).run();
  } else {
    db.insert(days).values({ ...parsed.data, createdAt: now, updatedAt: now }).run();
  }
  const row = db.select().from(days).where(eq(days.date, parsed.data.date)).get();
  return NextResponse.json(row);
}

export async function DELETE(req: NextRequest) {
  const auth = requireApiKey(req); if (auth) return auth;
  const date = new URL(req.url).searchParams.get("date");
  if (!date) return NextResponse.json({ error: "date required" }, { status: 400 });
  db.delete(days).where(eq(days.date, date)).run();
  return NextResponse.json({ ok: true });
}
