import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { codeSnippets } from "@/lib/db/schema";
import { desc, eq, like, or } from "drizzle-orm";
import { z } from "zod";
import { requireApiKey } from "@/lib/auth";

const schema = z.object({
  name: z.string(),
  description: z.string().optional(),
  code: z.string(),
  language: z.string(), // pine, mql4, mql5, python, javascript, typescript, json, other
  kind: z.string().optional(), // indicator / strategy / EA / utility / library / webhook
  platform: z.string().optional(),
  pineVersion: z.string().optional(),
  symbol: z.string().optional(),
  timeframe: z.string().optional(),
  tags: z.string().optional(),
  source: z.string().optional(),
  active: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  const auth = requireApiKey(req); if (auth) return auth;
  const u = new URL(req.url);
  const id = u.searchParams.get("id");
  const q = u.searchParams.get("q");
  const lang = u.searchParams.get("language");
  if (id) {
    return NextResponse.json(db.select().from(codeSnippets).where(eq(codeSnippets.id, Number(id))).get() ?? null);
  }
  if (q) {
    const rows = db.select().from(codeSnippets).where(
      or(like(codeSnippets.name, `%${q}%`), like(codeSnippets.description, `%${q}%`), like(codeSnippets.tags, `%${q}%`), like(codeSnippets.code, `%${q}%`))
    ).orderBy(desc(codeSnippets.updatedAt)).all();
    return NextResponse.json(rows);
  }
  if (lang) {
    const rows = db.select().from(codeSnippets).where(eq(codeSnippets.language, lang)).orderBy(desc(codeSnippets.updatedAt)).all();
    return NextResponse.json(rows);
  }
  return NextResponse.json(db.select().from(codeSnippets).orderBy(desc(codeSnippets.updatedAt)).all());
}

export async function POST(req: NextRequest) {
  const auth = requireApiKey(req); if (auth) return auth;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const now = new Date();
  const row = db.insert(codeSnippets).values({ ...parsed.data, createdAt: now, updatedAt: now }).returning().get();
  return NextResponse.json(row);
}

export async function PATCH(req: NextRequest) {
  const auth = requireApiKey(req); if (auth) return auth;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const body = await req.json();
  db.update(codeSnippets).set({ ...body, updatedAt: new Date() }).where(eq(codeSnippets.id, Number(id))).run();
  return NextResponse.json(db.select().from(codeSnippets).where(eq(codeSnippets.id, Number(id))).get());
}

export async function DELETE(req: NextRequest) {
  const auth = requireApiKey(req); if (auth) return auth;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  db.delete(codeSnippets).where(eq(codeSnippets.id, Number(id))).run();
  return NextResponse.json({ ok: true });
}
