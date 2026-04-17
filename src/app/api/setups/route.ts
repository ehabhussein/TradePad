import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { setups } from "@/lib/db/schema";
import { asc, eq, like, or } from "drizzle-orm";
import { z } from "zod";
import { requireApiKey } from "@/lib/auth";

const setupSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  direction: z.enum(["BUY", "SELL", "BOTH"]),
  category: z.string().optional(),
  timeframe: z.string().optional(),
  bestSession: z.string().optional(),
  entryConditionsJson: z.string().optional(),
  exitConditionsJson: z.string().optional(),
  slRule: z.string().optional(),
  tpRule: z.string().optional(),
  invalidationRule: z.string().optional(),
  confluenceNotes: z.string().optional(),
  tags: z.string().optional(),
  active: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  const auth = requireApiKey(req); if (auth) return auth;
  const u = new URL(req.url);
  const id = u.searchParams.get("id");
  const q = u.searchParams.get("q");
  if (id) {
    return NextResponse.json(db.select().from(setups).where(eq(setups.id, Number(id))).get() ?? null);
  }
  if (q) {
    const rows = db.select().from(setups).where(
      or(like(setups.name, `%${q}%`), like(setups.description, `%${q}%`), like(setups.tags, `%${q}%`))
    ).orderBy(asc(setups.name)).all();
    return NextResponse.json(rows);
  }
  return NextResponse.json(db.select().from(setups).orderBy(asc(setups.name)).all());
}

export async function POST(req: NextRequest) {
  const auth = requireApiKey(req); if (auth) return auth;
  const body = await req.json();
  const parsed = setupSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const now = new Date();
  const row = db.insert(setups).values({ ...parsed.data, createdAt: now, updatedAt: now }).returning().get();
  return NextResponse.json(row);
}

export async function PATCH(req: NextRequest) {
  const auth = requireApiKey(req); if (auth) return auth;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const body = await req.json();
  db.update(setups).set({ ...body, updatedAt: new Date() }).where(eq(setups.id, Number(id))).run();
  return NextResponse.json(db.select().from(setups).where(eq(setups.id, Number(id))).get());
}

export async function DELETE(req: NextRequest) {
  const auth = requireApiKey(req); if (auth) return auth;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  db.delete(setups).where(eq(setups.id, Number(id))).run();
  return NextResponse.json({ ok: true });
}
