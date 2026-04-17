import { db } from "@/lib/db";
import { days } from "@/lib/db/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatUsd, pnlColor, cn } from "@/lib/utils";
import { desc } from "drizzle-orm";
import { Plus, Smile } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DaysPage() {
  const rows = db.select().from(days).orderBy(desc(days.date)).all();
  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold">Daily Journal</h1>
          <p className="text-muted-foreground">Every trading day, captured.</p>
        </div>
        <Button asChild>
          <Link href={`/days/${new Date().toISOString().slice(0, 10)}`}>
            <Plus className="size-4" /> Today's entry
          </Link>
        </Button>
      </header>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground">No days recorded yet. Start with today.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((d) => (
            <Link key={d.date} href={`/days/${d.date}`}>
              <Card className="transition hover:ring-1 hover:ring-primary/40">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="flex-shrink-0 text-center min-w-[72px]">
                    <p className="text-2xl font-bold">{new Date(d.date).getDate()}</p>
                    <p className="text-xs uppercase text-muted-foreground">{new Date(d.date).toLocaleString("en-US", { month: "short" })}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium">{d.date}</p>
                      {d.mood != null && <Badge variant="outline" className="gap-1"><Smile className="size-3" /> {d.mood}/10</Badge>}
                      {d.disciplineScore != null && <Badge variant={d.disciplineScore >= 80 ? "profit" : d.disciplineScore >= 50 ? "secondary" : "loss"}>Discipline {d.disciplineScore}%</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1">{d.whatHappened || "— no notes —"}</p>
                  </div>
                  <div className={cn("text-right font-mono text-lg", pnlColor(d.dailyClosePnL))}>
                    {formatUsd(d.dailyClosePnL, { sign: true })}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
