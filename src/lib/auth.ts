import { NextRequest, NextResponse } from "next/server";

const DEFAULTS = new Set([
  "",
  "change-me",
  "change-me-to-a-long-random-string",
]);

export function requireApiKey(req: NextRequest) {
  const expected = process.env.API_KEY;
  if (!expected || DEFAULTS.has(expected)) {
    return null; // auth disabled when key is unset or default
  }
  // Allow same-origin browser requests without a key (cookie-based trust).
  // The API key gate is for external callers (curl / Claude / agents).
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (origin && host && origin.endsWith(host)) {
    return null;
  }
  const referer = req.headers.get("referer");
  if (referer && host && new URL(referer).host === host) {
    return null;
  }
  const key = req.headers.get("x-api-key") || new URL(req.url).searchParams.get("key");
  if (key !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return null;
}
