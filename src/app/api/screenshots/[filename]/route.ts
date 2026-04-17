import { NextRequest } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";

const SCREENSHOTS_DIR = process.env.SCREENSHOTS_DIR || path.resolve(process.cwd(), "data/screenshots");

export async function GET(_req: NextRequest, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;
  const safe = filename.replace(/[^a-z0-9.\-_]/gi, "");
  try {
    const buf = await fs.readFile(path.join(SCREENSHOTS_DIR, safe));
    const ext = safe.split(".").pop()?.toLowerCase() || "png";
    const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : `image/${ext}`;
    return new Response(buf, {
      headers: { "Content-Type": mime, "Cache-Control": "public, max-age=31536000, immutable" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
