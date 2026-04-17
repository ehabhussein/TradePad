"use client";
import { useEffect, useMemo, useState } from "react";
import type { Mistake } from "@/lib/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Plus, Search, Skull, Target, Trash2, TrendingDown, Zap } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Preset common trading mistake tags
const COMMON_TAGS = [
  "chased_entry", "moved_sl_against_me", "revenge_trade", "no_sl_set",
  "ignored_rules", "oversized", "fomo_entry", "late_exit", "early_exit",
  "averaged_down", "traded_during_news", "fought_trend", "level_exhaustion",
  "asian_session", "weekend_hold", "market_order_in_thin_liquidity",
];

export default function MistakesPage() {
  const [items, setItems] = useState<Mistake[]>([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Mistake>>({});
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/mistakes");
      if (!r.ok) { setItems([]); return; }
      const data = await r.json();
      setItems(Array.isArray(data) ? data : []);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing.tag) return toast.error("Tag required");
    const r = await fetch("/api/mistakes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing),
    });
    if (r.ok) {
      toast.success("Mistake logged — now you won't forget");
      setOpen(false);
      setEditing({});
      load();
    } else toast.error("Failed to save");
  };

  const del = async (id: number) => {
    if (!confirm("Delete this mistake entry?")) return;
    await fetch(`/api/mistakes?id=${id}`, { method: "DELETE" });
    load();
  };

  // Aggregations
  const stats = useMemo(() => {
    const tagCounts = new Map<string, number>();
    const byMonth = new Map<string, number>();
    items.forEach((m) => {
      tagCounts.set(m.tag, (tagCounts.get(m.tag) ?? 0) + 1);
      const d = new Date((m.createdAt as unknown as number) * 1000 || Date.now());
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      byMonth.set(key, (byMonth.get(key) ?? 0) + 1);
    });
    const ranked = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]);
    const top = ranked[0];
    const lastSevenDays = items.filter((m) => {
      const t = (m.createdAt as unknown as number) * 1000;
      return Date.now() - t < 7 * 24 * 60 * 60 * 1000;
    }).length;
    return {
      total: items.length,
      uniqueTags: tagCounts.size,
      top: top ? { tag: top[0], count: top[1] } : null,
      lastSevenDays,
      ranked,
      byMonth: [...byMonth.entries()].sort((a, b) => a[0].localeCompare(b[0])),
    };
  }, [items]);

  const filtered = items.filter((m) =>
    !q ||
    m.tag.toLowerCase().includes(q.toLowerCase()) ||
    (m.notes ?? "").toLowerCase().includes(q.toLowerCase())
  );

  const maxCount = Math.max(1, ...stats.ranked.map(([, c]) => c));

  // Tag color: more frequent = more red
  const tagColor = (count: number) => {
    const intensity = Math.min(1, count / maxCount);
    if (intensity > 0.7) return "bg-loss/30 border-loss/50 text-loss";
    if (intensity > 0.4) return "bg-orange-500/20 border-orange-500/40 text-orange-400";
    return "bg-yellow-500/10 border-yellow-500/30 text-yellow-500";
  };

  return (
    <div className="space-y-6">
      {/* Dramatic hero */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-loss/10 via-orange-500/5 to-background p-8">
        <div className="absolute -top-12 -right-12 size-48 rounded-full bg-loss/10 blur-3xl" />
        <div className="absolute -bottom-12 -left-12 size-48 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="relative flex items-end justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="size-12 rounded-xl bg-loss/20 flex items-center justify-center">
                <Skull className="size-6 text-loss" />
              </div>
              <div>
                <h1 className="text-4xl font-bold tracking-tight">Mistakes were made.</h1>
                <p className="text-muted-foreground">Every mistake is a paid lesson. Don't pay twice.</p>
              </div>
            </div>
          </div>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing({}); }}>
            <DialogTrigger asChild>
              <Button size="lg" variant="destructive"><Plus className="size-4" /> Log a mistake</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Own it. Write it down.</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Tag</Label>
                  <Input placeholder="e.g. chased_entry" value={editing.tag ?? ""} onChange={(e) => setEditing({ ...editing, tag: e.target.value.trim().replace(/\s+/g, "_") })} />
                  <div className="flex flex-wrap gap-1 mt-2">
                    {COMMON_TAGS.map((t) => (
                      <button key={t} type="button" onClick={() => setEditing({ ...editing, tag: t })} className="text-[11px] px-2 py-0.5 rounded border hover:bg-muted transition">
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Date</Label>
                  <Input type="date" value={editing.dayDate ?? new Date().toISOString().slice(0, 10)} onChange={(e) => setEditing({ ...editing, dayDate: e.target.value })} />
                </div>
                <div>
                  <Label>What happened? What did you learn?</Label>
                  <Textarea className="min-h-[120px]" value={editing.notes ?? ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} placeholder="Be honest with yourself — this is how you improve." />
                </div>
                <Button onClick={save} className="w-full" variant="destructive">Log it</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={AlertTriangle} label="Total logged" value={stats.total.toString()} tone="loss" />
        <StatCard icon={Target} label="Unique patterns" value={stats.uniqueTags.toString()} tone="warning" />
        <StatCard icon={Zap} label="Biggest repeat offender" value={stats.top ? stats.top.tag : "—"} subtitle={stats.top ? `×${stats.top.count}` : undefined} tone="loss" />
        <StatCard icon={TrendingDown} label="Last 7 days" value={stats.lastSevenDays.toString()} tone={stats.lastSevenDays > 3 ? "loss" : "warning"} />
      </div>

      {/* Tag cloud / frequency */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Skull className="size-4 text-loss" /> Pattern Frequency</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.ranked.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground text-sm">
              <p>No mistakes logged yet.</p>
              <p className="text-xs mt-1">That's either perfection… or denial. 😉</p>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.ranked.map(([tag, count]) => (
                <div key={tag} className="group">
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="font-mono text-sm">{tag}</span>
                    <span className="text-xs text-muted-foreground">×{count}</span>
                  </div>
                  <div className="h-6 rounded-md bg-muted/30 overflow-hidden relative">
                    <div
                      className={cn("h-full rounded-md transition-all group-hover:brightness-125 border", tagColor(count))}
                      style={{ width: `${(count / maxCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Monthly trend */}
      {stats.byMonth.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Over time</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-32">
              {stats.byMonth.map(([month, count]) => {
                const max = Math.max(...stats.byMonth.map(([, c]) => c));
                const h = (count / max) * 100;
                return (
                  <div key={month} className="flex-1 flex flex-col items-center gap-1 group">
                    <div className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition">{count}</div>
                    <div className="w-full rounded-t bg-loss/30 hover:bg-loss/50 transition" style={{ height: `${h}%` }} />
                    <div className="text-[10px] text-muted-foreground font-mono">{month.slice(-2)}/{month.slice(2, 4)}</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Searchable list */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search your mistakes…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
          <span className="text-xs text-muted-foreground">{filtered.length} / {items.length}</span>
        </div>

        {loading ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground">Loading…</CardContent></Card>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground">No mistakes match.</CardContent></Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((m) => (
              <Card key={m.id} className="group">
                <CardContent className="p-4 flex items-start gap-4">
                  <div className="size-10 rounded-lg bg-loss/15 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="size-4 text-loss" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="loss" className="font-mono">{m.tag}</Badge>
                      {m.dayDate && <span className="text-xs text-muted-foreground">{m.dayDate}</span>}
                    </div>
                    {m.notes && <p className="text-sm text-muted-foreground">{m.notes}</p>}
                  </div>
                  <Button size="icon" variant="ghost" className="opacity-0 group-hover:opacity-100 transition" onClick={() => del(m.id)}>
                    <Trash2 className="size-3" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, subtitle, tone }: { icon: any; label: string; value: string; subtitle?: string; tone: "loss" | "warning" }) {
  const toneCls = tone === "loss" ? "bg-loss/10 text-loss" : "bg-orange-500/10 text-orange-400";
  return (
    <Card>
      <CardContent className="p-4 flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
          <p className="text-xl font-bold truncate">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <div className={cn("size-9 rounded-lg flex items-center justify-center flex-shrink-0", toneCls)}>
          <Icon className="size-4" />
        </div>
      </CardContent>
    </Card>
  );
}
