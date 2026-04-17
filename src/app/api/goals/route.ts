import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { goals } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { requireApiKey } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  title: z.string(),
  targetValue: z.number(),
  currentValue: z.number().optional(),
  unit: z.string().optional(),
  deadline: z.string().optional(),
  achieved: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  const auth = requireApiKey(req); if (auth) return auth;
  return NextResponse.json(db.select().from(goals).orderBy(desc(goals.createdAt)).all());
}

export async function POST(req: NextRequest) {
  const auth = requireApiKey(req); if (auth) return auth;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const row = db.insert(goals).values(parsed.data).returning().get();
  return NextResponse.json(row);
}

export async function PATCH(req: NextRequest) {
  const auth = requireApiKey(req); if (auth) return auth;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const body = await req.json();
  db.update(goals).set(body).where(eq(goals.id, Number(id))).run();
  return NextResponse.json(db.select().from(goals).where(eq(goals.id, Number(id))).get());
}

export async function DELETE(req: NextRequest) {
  const auth = requireApiKey(req); if (auth) return auth;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  db.delete(goals).where(eq(goals.id, Number(id))).run();
  return NextResponse.json({ ok: true });
}
