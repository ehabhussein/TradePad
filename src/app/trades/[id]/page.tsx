import { db } from "@/lib/db";
import { trades, screenshots } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { TradeEditor } from "@/components/trade-editor";

export const dynamic = "force-dynamic";

export default async function TradePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const n = Number(id);
  if (!Number.isFinite(n)) notFound();
  const trade = db.select().from(trades).where(eq(trades.id, n)).get();
  if (!trade) notFound();
  const shots = db.select().from(screenshots).where(eq(screenshots.tradeId, n)).all();
  return <TradeEditor trade={trade} screenshots={shots} />;
}
