import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { accountSnapshots } from "@/lib/db/schema";
import { asc, eq } from "drizzle-orm";
import { requireApiKey } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  date: z.string(),
  balance: z.number(),
  equity: z.number().optional(),
  withdrawn: z.number().optional(),
  deposited: z.number().optional(),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const auth = requireApiKey(req); if (auth) return auth;
  return NextResponse.json(db.select().from(accountSnapshots).orderBy(asc(accountSnapshots.date)).all());
}

export async function POST(req: NextRequest) {
  const auth = requireApiKey(req); if (auth) return auth;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const row = db.insert(accountSnapshots).values(parsed.data).returning().get();
  return NextResponse.json(row);
}

export async function DELETE(req: NextRequest) {
  const auth = requireApiKey(req); if (auth) return auth;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  db.delete(accountSnapshots).where(eq(accountSnapshots.id, Number(id))).run();
  return NextResponse.json({ ok: true });
}
