import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rules } from "@/lib/db/schema";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { requireApiKey } from "@/lib/auth";

const ruleSchema = z.object({
  text: z.string(),
  category: z.string().optional(),
  orderNum: z.number().optional(),
  active: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  const auth = requireApiKey(req); if (auth) return auth;
  return NextResponse.json(db.select().from(rules).orderBy(asc(rules.orderNum), asc(rules.id)).all());
}

export async function POST(req: NextRequest) {
  const auth = requireApiKey(req); if (auth) return auth;
  const body = await req.json();
  const parsed = ruleSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const row = db.insert(rules).values(parsed.data).returning().get();
  return NextResponse.json(row);
}

export async function PATCH(req: NextRequest) {
  const auth = requireApiKey(req); if (auth) return auth;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const body = await req.json();
  db.update(rules).set(body).where(eq(rules.id, Number(id))).run();
  return NextResponse.json(db.select().from(rules).where(eq(rules.id, Number(id))).get());
}

export async function DELETE(req: NextRequest) {
  const auth = requireApiKey(req); if (auth) return auth;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  db.delete(rules).where(eq(rules.id, Number(id))).run();
  return NextResponse.json({ ok: true });
}
