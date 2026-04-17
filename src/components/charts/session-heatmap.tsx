"use client";
import { cn } from "@/lib/utils";

type CellData = { hour: number; winRate: number; trades: number };

export function SessionHeatmap({ data }: { data: CellData[] }) {
  const map = new Map(data.map((d) => [d.hour, d]));
  return (
    <div className="grid grid-cols-12 gap-1">
      {Array.from({ length: 24 }, (_, h) => {
        const d = map.get(h);
        const wr = d?.winRate ?? 0;
        const count = d?.trades ?? 0;
        const intensity = count === 0 ? "bg-muted/20" : wr >= 0.6 ? "bg-profit/70" : wr >= 0.5 ? "bg-profit/40" : wr >= 0.4 ? "bg-loss/40" : "bg-loss/70";
        return (
          <div
            key={h}
            className={cn("aspect-square rounded flex items-center justify-center text-[10px] font-mono transition-all hover:scale-110 cursor-default", intensity)}
            title={`${String(h).padStart(2, "0")}:00 UTC · ${count} trades · ${Math.round(wr * 100)}% WR`}
          >
            {String(h).padStart(2, "0")}
          </div>
        );
      })}
    </div>
  );
}
