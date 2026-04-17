import { NextRequest } from "next/server";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { TOOL_DEFINITIONS, callTool } from "@/lib/mcp/tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Active transports keyed by sessionId — survives only within a single Node process.
const transports = new Map<string, SSEServerTransport>();

function makeServer(): Server {
  const server = new Server(
    { name: "tradepad", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOL_DEFINITIONS }));
  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: args = {} } = req.params;
    try {
      return (await callTool(name, args)) as any;
    } catch (e) {
      return { isError: true, content: [{ type: "text", text: `Error: ${(e as Error).message}` }] } as any;
    }
  });
  return server;
}

// MCP SSE transport. Next.js gives us a Request/Response abstraction;
// we pipe the SDK's Node-style ServerResponse via a ReadableStream.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  // MCP SDK's SSEServerTransport writes to a Node `http.ServerResponse`-like object.
  // We emulate the minimum surface via a TransformStream.
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  // messagesEndpoint: where the client POSTs subsequent JSON-RPC requests
  // (must be same-origin path — SDK appends sessionId as query).
  const messagesEndpoint = `${url.origin}/api/mcp/messages`;

  // Fake minimal ServerResponse that the transport will write() into.
  const fakeRes: any = {
    writeHead(_status: number, _headers: Record<string, string>) { return fakeRes; },
    setHeader() {},
    end() { writer.close().catch(() => {}); },
    on() {}, once() {},
    write(chunk: string) {
      const bytes = typeof chunk === "string" ? encoder.encode(chunk) : chunk;
      writer.write(bytes).catch(() => {});
      return true;
    },
  };

  const transport = new SSEServerTransport(messagesEndpoint, fakeRes);
  transports.set(transport.sessionId, transport);

  const server = makeServer();
  await server.connect(transport);

  // Client disconnect → cleanup
  req.signal?.addEventListener("abort", () => {
    transports.delete(transport.sessionId);
    server.close().catch(() => {});
    writer.close().catch(() => {});
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

// Export map for /messages route to use
export { transports };
