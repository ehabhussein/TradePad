import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mistakes } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { requireApiKey } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  tag: z.string(),
  tradeId: z.number().optional(),
  dayDate: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const auth = requireApiKey(req); if (auth) return auth;
  return NextResponse.json(db.select().from(mistakes).orderBy(desc(mistakes.createdAt)).all());
}

export async function POST(req: NextRequest) {
  const auth = requireApiKey(req); if (auth) return auth;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const row = db.insert(mistakes).values(parsed.data).returning().get();
  return NextResponse.json(row);
}

export async function DELETE(req: NextRequest) {
  const auth = requireApiKey(req); if (auth) return auth;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  db.delete(mistakes).where(eq(mistakes.id, Number(id))).run();
  return NextResponse.json({ ok: true });
}
