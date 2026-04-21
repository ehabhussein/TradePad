import { db } from "@/lib/db";
import { setups } from "@/lib/db/schema";
import { asc, eq } from "drizzle-orm";
import { TradeEditor } from "@/components/trade-editor";

export const dynamic = "force-dynamic";

export default function NewTradePage() {
  const setupList = db.select().from(setups).where(eq(setups.active, true)).orderBy(asc(setups.name)).all();
  return <TradeEditor setups={setupList} />;
}
