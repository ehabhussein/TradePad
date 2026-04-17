import { db } from "@/lib/db";
import { trades } from "@/lib/db/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatUsd, pnlColor, cn, formatNumber } from "@/lib/utils";
import { desc } from "drizzle-orm";
import { Plus } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function TradesPage() {
  const rows = db.select().from(trades).orderBy(desc(trades.openedAt)).limit(500).all();
  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold">All Trades</h1>
          <p className="text-muted-foreground">{rows.length} trades logged</p>
        </div>
        <Button asChild>
          <Link href="/trades/new"><Plus className="size-4" /> New trade</Link>
        </Button>
      </header>

      {rows.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">No trades yet.</CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              <div className="grid grid-cols-12 gap-3 px-4 py-2 text-xs uppercase tracking-wider text-muted-foreground font-medium">
                <div className="col-span-2">Date</div>
                <div className="col-span-1">Dir</div>
                <div className="col-span-1">Sym</div>
                <div className="col-span-1">Entry</div>
                <div className="col-span-1">Exit</div>
                <div className="col-span-2">Setup</div>
                <div className="col-span-1 text-right">R</div>
                <div className="col-span-1 text-right">Score</div>
                <div className="col-span-2 text-right">P/L</div>
              </div>
              {rows.map((t) => (
                <Link key={t.id} href={`/trades/${t.id}`} className="grid grid-cols-12 gap-3 px-4 py-3 items-center hover:bg-muted transition text-sm">
                  <div className="col-span-2 font-mono text-xs">{new Date(t.openedAt).toISOString().slice(0, 16).replace("T", " ")}</div>
                  <div className="col-span-1"><Badge variant={t.direction === "BUY" ? "profit" : "loss"}>{t.direction}</Badge></div>
                  <div className="col-span-1 font-medium">{t.symbol}</div>
                  <div className="col-span-1 font-mono text-xs">{t.entryPrice}</div>
                  <div className="col-span-1 font-mono text-xs">{t.exitPrice ?? "—"}</div>
                  <div className="col-span-2 text-xs text-muted-foreground truncate">{t.setupType ?? "—"}</div>
                  <div className="col-span-1 text-right font-mono text-xs">{t.rMultiple != null ? `${formatNumber(t.rMultiple, 1)}R` : "—"}</div>
                  <div className="col-span-1 text-right text-xs">{t.confluenceScore != null ? `${t.confluenceScore}/14` : "—"}</div>
                  <div className={cn("col-span-2 text-right font-mono font-medium", pnlColor(t.pnl))}>{formatUsd(t.pnl, { sign: true })}</div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
