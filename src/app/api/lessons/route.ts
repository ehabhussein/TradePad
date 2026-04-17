import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { lessons } from "@/lib/db/schema";
import { desc, eq, like, or } from "drizzle-orm";
import { z } from "zod";
import { requireApiKey } from "@/lib/auth";

const lessonSchema = z.object({
  title: z.string(),
  body: z.string(),
  tags: z.string().optional(),
  severity: z.enum(["info", "warning", "critical"]).optional(),
  sourceDate: z.string().optional(),
  sourceTradeId: z.number().optional(),
});

export async function GET(req: NextRequest) {
  const auth = requireApiKey(req); if (auth) return auth;
  const u = new URL(req.url);
  const q = u.searchParams.get("q");
  const id = u.searchParams.get("id");
  if (id) {
    const row = db.select().from(lessons).where(eq(lessons.id, Number(id))).get();
    return NextResponse.json(row ?? null);
  }
  if (q) {
    const rows = db.select().from(lessons).where(or(like(lessons.title, `%${q}%`), like(lessons.body, `%${q}%`), like(lessons.tags, `%${q}%`))).orderBy(desc(lessons.updatedAt)).all();
    return NextResponse.json(rows);
  }
  return NextResponse.json(db.select().from(lessons).orderBy(desc(lessons.updatedAt)).all());
}

export async function POST(req: NextRequest) {
  const auth = requireApiKey(req); if (auth) return auth;
  const body = await req.json();
  const parsed = lessonSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const now = new Date();
  const row = db.insert(lessons).values({ ...parsed.data, createdAt: now, updatedAt: now }).returning().get();
  return NextResponse.json(row);
}

export async function PATCH(req: NextRequest) {
  const auth = requireApiKey(req); if (auth) return auth;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const body = await req.json();
  db.update(lessons).set({ ...body, updatedAt: new Date() }).where(eq(lessons.id, Number(id))).run();
  return NextResponse.json(db.select().from(lessons).where(eq(lessons.id, Number(id))).get());
}

export async function DELETE(req: NextRequest) {
  const auth = requireApiKey(req); if (auth) return auth;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  db.delete(lessons).where(eq(lessons.id, Number(id))).run();
  return NextResponse.json({ ok: true });
}
