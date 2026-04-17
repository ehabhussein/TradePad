"use client";
import { useEffect, useMemo, useState } from "react";
import type { Observation } from "@/lib/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, Plus, Search, Trash2, Check, X, Minus, Clock } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const CATEGORIES = ["spike", "sweep", "rejection", "regime-change", "news-reaction", "session-open", "anomaly", "level-reaction"];
const CATEGORY_COLORS: Record<string, string> = {
  spike: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  sweep: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  rejection: "bg-loss/15 text-loss border-loss/30",
  "regime-change": "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  "news-reaction": "bg-amber-500/15 text-amber-400 border-amber-500/30",
  "session-open": "bg-blue-500/15 text-blue-400 border-blue-500/30",
  anomaly: "bg-pink-500/15 text-pink-400 border-pink-500/30",
  "level-reaction": "bg-profit/15 text-profit border-profit/30",
};
const OUTCOMES = [
  { v: "pending", label: "Pending", icon: Clock, cls: "text-muted-foreground" },
  { v: "happened", label: "Happened", icon: Check, cls: "text-profit" },
  { v: "didnt_happen", label: "Didn't happen", icon: X, cls: "text-loss" },
  { v: "partial", label: "Partial", icon: Minus, cls: "text-amber-400" },
] as const;

function nowLocalForDatetimeInput() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ObservationsPage() {
  const [items, setItems] = useState<Observation[]>([]);
  const [q, setQ] = useState("");
  const [catFilter, setCatFilter] = useState<string>("");
  const [hourFilter, setHourFilter] = useState<number | null>(null);
  const [weekdayFilter, setWeekdayFilter] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Observation>>({});

  const load = async () => {
    const r = await fetch("/api/observations");
    if (!r.ok) { setItems([]); return; }
    const data = await r.json();
    setItems(Array.isArray(data) ? data : []);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => items.filter((o) => {
    if (catFilter && o.category !== catFilter) return false;
    if (hourFilter != null && o.hourUtc !== hourFilter) return false;
    if (weekdayFilter != null && o.weekdayUtc !== weekdayFilter) return false;
    if (q) {
      const n = q.toLowerCase();
      if (!o.title.toLowerCase().includes(n) && !(o.body ?? "").toLowerCase().includes(n) && !(o.tags ?? "").toLowerCase().includes(n)) return false;
    }
    return true;
  }), [items, catFilter, hourFilter, weekdayFilter, q]);

  // Group for right-dock: by weekday of the week
  const byWeekday = useMemo(() => {
    const g: Record<number, Observation[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    items.forEach((o) => { const d = o.weekdayUtc ?? 0; g[d] = [...(g[d] ?? []), o]; });
    return g;
  }, [items]);

  const hourCounts = useMemo(() => {
    const c = new Array(24).fill(0) as number[];
    items.forEach((o) => { if (o.hourUtc != null) c[o.hourUtc]++; });
    return c;
  }, [items]);
  const maxHour = Math.max(1, ...hourCounts);

  const save = async () => {
    if (!editing.title) return toast.error("Title required");
    const payload = {
      ...editing,
      observedAt: editing.observedAt ? new Date(editing.observedAt as any).toISOString() : new Date().toISOString(),
      priceAt: editing.priceAt ? Number(editing.priceAt) : undefined,
      importance: editing.importance ?? 3,
    };
    const isEdit = !!editing.id;
    const url = isEdit ? `/api/observations?id=${editing.id}` : "/api/observations";
    const r = await fetch(url, { method: isEdit ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (r.ok) { toast.success("Saved"); setOpen(false); setEditing({}); load(); }
    else { const e = await r.json().catch(() => null); toast.error(`Save failed: ${e?.error || r.status}`); }
  };

  const del = async (id: number) => {
    if (!confirm("Delete observation?")) return;
    await fetch(`/api/observations?id=${id}`, { method: "DELETE" });
    load();
  };

  const setOutcome = async (o: Observation, outcome: string) => {
    await fetch(`/api/observations?id=${o.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outcome }),
    });
    load();
  };

  return (
    <div className="flex gap-6">
      {/* Main column */}
      <div className="flex-1 space-y-6 min-w-0">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-cyan-500/5 to-background p-8">
          <div className="absolute -top-12 -right-12 size-48 rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="relative flex items-end justify-between">
            <div className="flex items-center gap-4">
              <div className="size-12 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                <Eye className="size-6 text-cyan-400" />
              </div>
              <div>
                <h1 className="text-4xl font-bold tracking-tight">Observations</h1>
                <p className="text-muted-foreground">Spot patterns. "Candle shot high at 12 UTC — again."</p>
              </div>
            </div>
            <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing({}); }}>
              <DialogTrigger asChild>
                <Button size="lg" onClick={() => setEditing({ observedAt: nowLocalForDatetimeInput() as any, importance: 3, outcome: "pending" })}>
                  <Plus className="size-4" /> Log observation
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editing.id ? "Edit" : "New"} observation</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Title</Label>
                    <Input value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="Candle shot high around 12 UTC" />
                  </div>
                  <div>
                    <Label>What did you notice?</Label>
                    <Textarea className="min-h-[100px]" value={editing.body ?? ""} onChange={(e) => setEditing({ ...editing, body: e.target.value })} placeholder="Details: structure, context, why this might repeat..." />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Observed at (UTC-ish)</Label>
                      <Input type="datetime-local" value={editing.observedAt as any ?? ""} onChange={(e) => setEditing({ ...editing, observedAt: e.target.value as any })} />
                    </div>
                    <div>
                      <Label>Symbol</Label>
                      <Input value={editing.symbol ?? ""} onChange={(e) => setEditing({ ...editing, symbol: e.target.value })} placeholder="XAUUSD" />
                    </div>
                    <div>
                      <Label>Category</Label>
                      <Select value={editing.category ?? ""} onValueChange={(v) => setEditing({ ...editing, category: v })}>
                        <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Session</Label>
                      <Input value={editing.session ?? ""} onChange={(e) => setEditing({ ...editing, session: e.target.value })} placeholder="London" />
                    </div>
                    <div>
                      <Label>Timeframe</Label>
                      <Input value={editing.timeframe ?? ""} onChange={(e) => setEditing({ ...editing, timeframe: e.target.value })} placeholder="5m" />
                    </div>
                    <div>
                      <Label>Price at</Label>
                      <Input type="number" step="0.01" value={(editing.priceAt as any) ?? ""} onChange={(e) => setEditing({ ...editing, priceAt: e.target.value === "" ? undefined : Number(e.target.value) as any })} />
                    </div>
                    <div>
                      <Label>Importance (1-5)</Label>
                      <Input type="number" min={1} max={5} value={(editing.importance as any) ?? 3} onChange={(e) => setEditing({ ...editing, importance: Number(e.target.value) as any })} />
                    </div>
                    <div>
                      <Label>Outcome</Label>
                      <Select value={editing.outcome ?? "pending"} onValueChange={(v) => setEditing({ ...editing, outcome: v as any })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {OUTCOMES.map((o) => <SelectItem key={o.v} value={o.v}>{o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Tags</Label>
                    <Input value={editing.tags ?? ""} onChange={(e) => setEditing({ ...editing, tags: e.target.value })} placeholder="comma-separated" />
                  </div>
                  <Button onClick={save} className="w-full">Save</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Hour-of-day heatmap — the "when does this happen" insight */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="size-4" /> Hour of day (UTC)</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-12 gap-1">
              {hourCounts.map((c, h) => {
                const intensity = c === 0 ? "bg-muted/20" : c / maxHour > 0.75 ? "bg-primary/80" : c / maxHour > 0.4 ? "bg-primary/50" : "bg-primary/25";
                return (
                  <button
                    key={h}
                    onClick={() => setHourFilter(hourFilter === h ? null : h)}
                    title={`${String(h).padStart(2, "0")}:00 — ${c} observation${c !== 1 ? "s" : ""}`}
                    className={cn("aspect-square rounded flex items-center justify-center text-[10px] font-mono transition-all hover:scale-110 border", intensity, hourFilter === h ? "ring-2 ring-primary" : "border-transparent")}
                  >
                    {String(h).padStart(2, "0")}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">Click any hour to filter the feed below.</p>
          </CardContent>
        </Card>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search observations…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
          <div className="flex gap-1 flex-wrap">
            <button onClick={() => setCatFilter("")} className={cn("px-2 py-1 text-xs rounded border", catFilter === "" ? "bg-primary/15 text-primary border-primary/30" : "text-muted-foreground hover:bg-muted")}>all</button>
            {CATEGORIES.map((c) => (
              <button key={c} onClick={() => setCatFilter(c === catFilter ? "" : c)} className={cn("px-2 py-1 text-xs rounded border", catFilter === c ? "bg-primary/15 text-primary border-primary/30" : "text-muted-foreground hover:bg-muted")}>{c}</button>
            ))}
          </div>
          {(hourFilter != null || weekdayFilter != null) && (
            <button onClick={() => { setHourFilter(null); setWeekdayFilter(null); }} className="text-xs text-muted-foreground underline">
              clear time filters
            </button>
          )}
          <span className="text-xs text-muted-foreground ml-auto">{filtered.length} / {items.length}</span>
        </div>

        {/* Feed */}
        {filtered.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">No observations match. Log your first one with <kbd className="px-1.5 py-0.5 rounded border text-xs">+ Log observation</kbd>.</CardContent></Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((o) => {
              const catCls = CATEGORY_COLORS[o.category ?? ""] ?? "bg-muted text-muted-foreground border-border";
              const d = o.observedAt ? new Date(o.observedAt as unknown as string) : null;
              const outcome = OUTCOMES.find((x) => x.v === (o.outcome ?? "pending"));
              const OIcon = outcome?.icon ?? Clock;
              return (
                <Card key={o.id} className="group">
                  <CardContent className="p-5 flex items-start gap-4">
                    <div className="text-center min-w-[56px]">
                      <div className="text-2xl font-bold font-mono">{d ? String(d.getUTCHours()).padStart(2, "0") : "--"}</div>
                      <div className="text-[10px] uppercase text-muted-foreground">{d ? WEEKDAYS[d.getUTCDay()] : "—"}</div>
                      <div className="text-[10px] text-muted-foreground">{d ? d.toISOString().slice(0, 10) : ""}</div>
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold">{o.title}</h3>
                        {o.category && <span className={cn("text-[10px] px-2 py-0.5 rounded border", catCls)}>{o.category}</span>}
                        {o.symbol && <Badge variant="outline" className="text-[10px]">{o.symbol}</Badge>}
                        {o.priceAt != null && <Badge variant="outline" className="text-[10px] font-mono">{o.priceAt}</Badge>}
                      </div>
                      {o.body && <p className="text-sm text-muted-foreground">{o.body}</p>}
                      {o.tags && (
                        <div className="flex flex-wrap gap-1">
                          {o.tags.split(",").map((t) => <span key={t} className="text-[10px] text-muted-foreground">#{t.trim()}</span>)}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {/* outcome switcher */}
                      <div className="flex gap-1">
                        {OUTCOMES.map((x) => {
                          const XIcon = x.icon;
                          const active = (o.outcome ?? "pending") === x.v;
                          return (
                            <button
                              key={x.v}
                              onClick={() => setOutcome(o, x.v)}
                              title={x.label}
                              className={cn("size-7 rounded-md border flex items-center justify-center transition", active ? "bg-primary/15 border-primary/40" : "bg-background/50 border-border hover:bg-muted")}
                            >
                              <XIcon className={cn("size-3", active ? x.cls : "text-muted-foreground")} />
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => { setEditing({ ...o, observedAt: d ? (d.toISOString().slice(0, 16) as any) : undefined }); setOpen(true); }}>Edit</Button>
                        <Button size="icon" variant="ghost" className="opacity-0 group-hover:opacity-100 transition" onClick={() => del(o.id)}>
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Right dock — by weekday */}
      <aside className="hidden xl:block w-64 shrink-0">
        <div className="sticky top-24 space-y-2">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">By Day of Week</CardTitle></CardHeader>
            <CardContent className="p-2 space-y-1">
              {WEEKDAYS.map((wd, i) => {
                const list = byWeekday[i] ?? [];
                const active = weekdayFilter === i;
                return (
                  <button
                    key={wd}
                    onClick={() => setWeekdayFilter(active ? null : i)}
                    className={cn("w-full text-left rounded-lg p-2 transition", active ? "bg-primary/10 border border-primary/40" : "hover:bg-muted border border-transparent")}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm">{wd}</span>
                      <span className="text-xs text-muted-foreground">{list.length}</span>
                    </div>
                    {list.length > 0 && (
                      <ul className="mt-1 space-y-0.5">
                        {list.slice(0, 4).map((o) => (
                          <li key={o.id} className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                            <span className="font-mono text-[10px] opacity-60">{String(o.hourUtc ?? 0).padStart(2, "0")}:00</span>
                            <span className="truncate">{o.title}</span>
                          </li>
                        ))}
                        {list.length > 4 && <li className="text-[10px] text-muted-foreground italic">+ {list.length - 4} more</li>}
                      </ul>
                    )}
                  </button>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Outcome rate</CardTitle></CardHeader>
            <CardContent className="p-3 space-y-1.5">
              {OUTCOMES.map((o) => {
                const count = items.filter((x) => (x.outcome ?? "pending") === o.v).length;
                const pct = items.length ? Math.round((count / items.length) * 100) : 0;
                const Icon = o.icon;
                return (
                  <div key={o.v} className="flex items-center gap-2">
                    <Icon className={cn("size-3", o.cls)} />
                    <span className="text-xs flex-1">{o.label}</span>
                    <span className="text-xs font-mono text-muted-foreground">{count} · {pct}%</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </aside>
    </div>
  );
}
