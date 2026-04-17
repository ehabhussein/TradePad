import { NextRequest, NextResponse } from "next/server";
import { transports } from "@/app/api/mcp/sse/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const sessionId = new URL(req.url).searchParams.get("sessionId");
  if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  const transport = transports.get(sessionId);
  if (!transport) return NextResponse.json({ error: "session not found" }, { status: 404 });

  const body = await req.json();
  // Build a fake Node IncomingMessage + ServerResponse that SSEServerTransport.handlePostMessage expects
  const encoder = new TextEncoder();
  let statusCode = 200;
  const headers: Record<string, string> = {};
  let responseBody = "";

  const fakeReq: any = {
    method: "POST",
    headers: { "content-type": "application/json" },
    on: (event: string, cb: (arg?: unknown) => void) => {
      if (event === "data") cb(Buffer.from(JSON.stringify(body)));
      if (event === "end") cb();
    },
  };

  const fakeRes: any = {
    writeHead(status: number, h: Record<string, string> = {}) { statusCode = status; Object.assign(headers, h); return fakeRes; },
    setHeader(k: string, v: string) { headers[k] = v; },
    write(chunk: string) { responseBody += chunk; return true; },
    end(chunk?: string) { if (chunk) responseBody += chunk; },
  };

  // The SDK reads the raw JSON and routes it to the connected server
  await transport.handlePostMessage(fakeReq, fakeRes, body);

  return new Response(responseBody || "", { status: statusCode, headers });
}
