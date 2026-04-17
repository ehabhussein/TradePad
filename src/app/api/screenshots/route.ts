import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { screenshots } from "@/lib/db/schema";
import { desc, eq, and } from "drizzle-orm";
import { requireApiKey } from "@/lib/auth";
import path from "node:path";
import fs from "node:fs/promises";
import crypto from "node:crypto";

const SCREENSHOTS_DIR = process.env.SCREENSHOTS_DIR || path.resolve(process.cwd(), "data/screenshots");
await fs.mkdir(SCREENSHOTS_DIR, { recursive: true }).catch(() => {});

export async function GET(req: NextRequest) {
  const auth = requireApiKey(req); if (auth) return auth;
  const u = new URL(req.url);
  const day = u.searchParams.get("day");
  const tradeId = u.searchParams.get("tradeId");
  let rows;
  if (tradeId) {
    rows = db.select().from(screenshots).where(eq(screenshots.tradeId, Number(tradeId))).all();
  } else if (day) {
    rows = db.select().from(screenshots).where(eq(screenshots.dayDate, day)).all();
  } else {
    rows = db.select().from(screenshots).orderBy(desc(screenshots.uploadedAt)).limit(200).all();
  }
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const auth = requireApiKey(req); if (auth) return auth;
  const form = await req.formData();
  const file = form.get("file") as File | null;
  const dayDate = form.get("dayDate") as string | null;
  const tradeId = form.get("tradeId") as string | null;
  const caption = form.get("caption") as string | null;
  if (!file) return NextResponse.json({ error: "file required" }, { status: 400 });

  const buf = Buffer.from(await file.arrayBuffer());
  const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
  const filename = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${ext}`;
  await fs.writeFile(path.join(SCREENSHOTS_DIR, filename), buf);

  const row = db.insert(screenshots).values({
    filename,
    originalName: file.name,
    mimeType: file.type,
    sizeBytes: buf.length,
    dayDate: dayDate || null,
    tradeId: tradeId ? Number(tradeId) : null,
    caption: caption || null,
    uploadedAt: new Date(),
  }).returning().get();
  return NextResponse.json(row);
}

export async function DELETE(req: NextRequest) {
  const auth = requireApiKey(req); if (auth) return auth;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const row = db.select().from(screenshots).where(eq(screenshots.id, Number(id))).get();
  if (row?.filename) {
    await fs.unlink(path.join(SCREENSHOTS_DIR, row.filename)).catch(() => {});
  }
  db.delete(screenshots).where(eq(screenshots.id, Number(id))).run();
  return NextResponse.json({ ok: true });
}
