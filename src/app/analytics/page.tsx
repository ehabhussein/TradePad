import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DrawdownChart } from "@/components/charts/drawdown-chart";
import { RHistogram } from "@/components/charts/r-histogram";
import { SessionHeatmap } from "@/components/charts/session-heatmap";
import { EquityCurve } from "@/components/charts/equity-curve";
import { formatUsd, formatNumber, pnlColor, cn } from "@/lib/utils";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

async function fetchStats(): Promise<any> {
  const h = await headers();
  const host = h.get("host") ?? "localhost:6667";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const key = process.env.API_KEY;
  const res = await fetch(`${proto}://${host}/api/stats${key && key !== "change-me" ? `?key=${key}` : ""}`, { cache: "no-store" });
  return res.json();
}

export default async function AnalyticsPage() {
  const s = await fetchStats();
  const t = s.totals || {};

  const metrics = [
    { label: "Total P/L", value: formatUsd(t.totalPnL, { sign: true }), tone: (t.totalPnL ?? 0) >= 0 ? "profit" : "loss" },
    { label: "Win rate", value: `${((t.winRate ?? 0) * 100).toFixed(1)}%`, tone: (t.winRate ?? 0) >= 0.5 ? "profit" : "loss" },
    { label: "Expectancy / trade", value: formatUsd(t.expectancy, { sign: true }), tone: (t.expectancy ?? 0) >= 0 ? "profit" : "loss" },
    { label: "Avg win", value: formatUsd(t.avgWin), tone: "profit" },
    { label: "Avg loss", value: formatUsd(t.avgLoss), tone: "loss" },
    { label: "Max drawdown", value: formatUsd(t.maxDD), tone: "loss" },
    { label: "Rules compliance", value: `${((t.complianceRate ?? 0) * 100).toFixed(0)}%`, tone: (t.complianceRate ?? 0) >= 0.8 ? "profit" : "loss" },
    { label: "Total trades", value: (t.closedCount ?? 0).toString(), tone: "neutral" },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">Where your edge lives (or dies).</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {metrics.map((m) => (
          <Card key={m.label}>
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{m.label}</p>
              <p className={cn("text-xl font-bold font-mono", m.tone === "profit" ? "text-profit" : m.tone === "loss" ? "text-loss" : "")}>{m.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Equity</CardTitle></CardHeader>
          <CardContent>{s.equity?.length ? <EquityCurve data={s.equity} /> : <Empty />}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Drawdown</CardTitle></CardHeader>
          <CardContent>{s.drawdown?.length ? <DrawdownChart data={s.drawdown} /> : <Empty />}</CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>R-Multiple Distribution</CardTitle></CardHeader>
          <CardContent>{s.rHist?.length ? <RHistogram data={s.rHist} /> : <Empty />}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Win Rate by Hour (UTC)</CardTitle></CardHeader>
          <CardContent>{s.sessionHours?.length ? <SessionHeatmap data={s.sessionHours} /> : <Empty />}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Setup Performance</CardTitle></CardHeader>
        <CardContent className="p-0">
          {s.setups?.length ? (
            <div className="divide-y divide-border">
              <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs uppercase text-muted-foreground">
                <div className="col-span-6">Setup</div>
                <div className="col-span-2 text-right">W / L</div>
                <div className="col-span-2 text-right">Win rate</div>
                <div className="col-span-2 text-right">Net P/L</div>
              </div>
              {s.setups.sort((a: any, b: any) => b.pnl - a.pnl).map((x: any) => (
                <div key={x.name} className="grid grid-cols-12 gap-2 px-4 py-3 items-center">
                  <div className="col-span-6 font-medium truncate">{x.name}</div>
                  <div className="col-span-2 text-right font-mono text-sm"><span className="text-profit">{x.wins}</span>/<span className="text-loss">{x.losses}</span></div>
                  <div className="col-span-2 text-right"><Badge variant={x.winRate >= 0.5 ? "profit" : "loss"}>{(x.winRate * 100).toFixed(0)}%</Badge></div>
                  <div className={cn("col-span-2 text-right font-mono font-medium", pnlColor(x.pnl))}>{formatUsd(x.pnl, { sign: true })}</div>
                </div>
              ))}
            </div>
          ) : <Empty />}
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Mistake Tag Cloud</CardTitle></CardHeader>
          <CardContent>
            {s.mistakeTags?.length ? (
              <div className="flex flex-wrap gap-2">
                {s.mistakeTags.map((m: any) => (
                  <Badge key={m.tag} variant="outline" style={{ fontSize: `${Math.min(24, 12 + m.count * 2)}px` }}>
                    {m.tag} <span className="ml-1 opacity-60">{m.count}</span>
                  </Badge>
                ))}
              </div>
            ) : <Empty msg="No mistakes logged yet." />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Mood vs Day P/L</CardTitle></CardHeader>
          <CardContent>
            {s.moodScatter?.length ? (
              <div className="space-y-2">
                {s.moodScatter.slice(-20).reverse().map((m: any, i: number) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-24 text-xs text-muted-foreground">Mood {m.mood}/10</div>
                    <div className="flex-1 relative h-6 bg-muted rounded">
                      <div
                        className={cn("absolute top-0 h-6 rounded", m.pnl >= 0 ? "bg-profit/50 left-1/2" : "bg-loss/50 right-1/2")}
                        style={{ width: `${Math.min(50, Math.abs(m.pnl) * 2)}%` }}
                      />
                    </div>
                    <div className={cn("w-20 text-right font-mono text-xs", pnlColor(m.pnl))}>{formatUsd(m.pnl, { sign: true })}</div>
                  </div>
                ))}
              </div>
            ) : <Empty msg="Add mood to day entries to see correlation." />}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Empty({ msg = "Not enough data yet." }: { msg?: string }) {
  return <div className="py-12 text-center text-sm text-muted-foreground">{msg}</div>;
}
