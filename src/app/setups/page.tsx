"use client";
import { useEffect, useMemo, useState } from "react";
import type { Setup } from "@/lib/db/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowDownRight, ArrowUpRight, ArrowUpDown, BookOpen, Filter, Plus, Search, Sparkles, Target, TrendingUp } from "lucide-react";
import { SetupEditor } from "./setup-editor";
import { cn } from "@/lib/utils";

type Condition = { indicator: string; operator: string; value: string; note?: string };

function parseConds(json: string | null | undefined): Condition[] {
  if (!json) return [];
  try { return JSON.parse(json); } catch { return []; }
}

const DIR_STYLES = {
  BUY: { label: "BUY", Icon: ArrowUpRight, cls: "bg-profit/15 text-profit border-profit/30" },
  SELL: { label: "SELL", Icon: ArrowDownRight, cls: "bg-loss/15 text-loss border-loss/30" },
  BOTH: { label: "BOTH", Icon: ArrowUpDown, cls: "bg-primary/15 text-primary border-primary/30" },
} as const;

export default function SetupsPage() {
  const [items, setItems] = useState<Setup[]>([]);
  const [q, setQ] = useState("");
  const [dir, setDir] = useState<"ALL" | "BUY" | "SELL" | "BOTH">("ALL");
  const [category, setCategory] = useState<string>("");
  const [editing, setEditing] = useState<Setup | null>(null);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    const r = await fetch("/api/setups");
    if (!r.ok) { setItems([]); return; }
    const data = await r.json();
    setItems(Array.isArray(data) ? data : []);
  };
  useEffect(() => { load(); }, []);

  const categories = useMemo(() => [...new Set(items.map((s) => s.category).filter(Boolean))] as string[], [items]);

  const filtered = items.filter((s) => {
    if (dir !== "ALL" && s.direction !== dir) return false;
    if (category && s.category !== category) return false;
    if (q) {
      const needle = q.toLowerCase();
      if (
        !s.name.toLowerCase().includes(needle) &&
        !(s.description ?? "").toLowerCase().includes(needle) &&
        !(s.tags ?? "").toLowerCase().includes(needle)
      ) return false;
    }
    return true;
  });

  if (editing || creating) {
    return (
      <SetupEditor
        setup={editing ?? undefined}
        onClose={() => { setEditing(null); setCreating(false); load(); }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-primary/5 to-background p-8">
        <div className="absolute -top-12 -right-12 size-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex items-end justify-between">
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <Sparkles className="size-6 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight">Trade Setups</h1>
              <p className="text-muted-foreground">Your playbook — every strategy, every condition, every edge.</p>
            </div>
          </div>
          <Button size="lg" onClick={() => setCreating(true)}>
            <Plus className="size-4" /> New setup
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search setups, tags, conditions…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1 rounded-md border bg-background/50 p-1">
          {(["ALL", "BUY", "SELL", "BOTH"] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDir(d)}
              className={cn(
                "px-3 py-1 text-xs rounded transition",
                dir === d ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted"
              )}
            >{d}</button>
          ))}
        </div>
        {categories.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            <button onClick={() => setCategory("")} className={cn("px-2 py-1 text-xs rounded border", category === "" ? "bg-primary/15 text-primary border-primary/30" : "text-muted-foreground hover:bg-muted")}>all</button>
            {categories.map((c) => (
              <button key={c} onClick={() => setCategory(c === category ? "" : c)} className={cn("px-2 py-1 text-xs rounded border", category === c ? "bg-primary/15 text-primary border-primary/30" : "text-muted-foreground hover:bg-muted")}>{c}</button>
            ))}
          </div>
        )}
        <div className="text-xs text-muted-foreground ml-auto">
          {filtered.length} / {items.length}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">No setups match. Create one with <kbd className="px-1.5 py-0.5 rounded border text-xs">+ New setup</kbd>.</CardContent></Card>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((s) => {
            const conds = parseConds(s.entryConditionsJson);
            const style = DIR_STYLES[(s.direction as keyof typeof DIR_STYLES) ?? "BOTH"];
            return (
              <button
                key={s.id}
                onClick={() => setEditing(s)}
                className="group text-left relative overflow-hidden rounded-xl border bg-card/60 backdrop-blur-xl p-5 transition hover:ring-1 hover:ring-primary/40 hover:bg-card"
              >
                {/* direction ribbon */}
                <div className={cn("absolute top-0 right-0 px-3 py-1 rounded-bl-lg text-xs font-bold border-l border-b flex items-center gap-1", style.cls)}>
                  <style.Icon className="size-3" /> {style.label}
                </div>

                <div className="space-y-3 pr-16">
                  <div>
                    <h3 className="font-semibold text-lg leading-tight group-hover:text-primary transition">{s.name}</h3>
                    {s.description && <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{s.description}</p>}
                  </div>

                  {/* badges */}
                  <div className="flex flex-wrap gap-1">
                    {s.category && <Badge variant="outline" className="text-[10px]">{s.category}</Badge>}
                    {s.timeframe && <Badge variant="outline" className="text-[10px]">{s.timeframe}</Badge>}
                    {s.bestSession && <Badge variant="outline" className="text-[10px]">{s.bestSession}</Badge>}
                  </div>

                  {/* conditions preview */}
                  {conds.length > 0 && (
                    <div className="space-y-1 pt-2 border-t">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <Target className="size-3" /> Entry triggers
                      </div>
                      <ul className="space-y-1">
                        {conds.slice(0, 4).map((c, i) => (
                          <li key={i} className="text-xs flex items-start gap-1.5">
                            <span className="text-primary mt-0.5">•</span>
                            <span className="flex-1">
                              <span className="font-mono text-[11px]">{c.indicator}</span>
                              {c.operator && <span className="text-muted-foreground"> {c.operator} </span>}
                              {c.value && <span className="font-mono text-[11px]">{c.value}</span>}
                            </span>
                          </li>
                        ))}
                        {conds.length > 4 && (
                          <li className="text-[11px] text-muted-foreground italic">+ {conds.length - 4} more…</li>
                        )}
                      </ul>
                    </div>
                  )}

                  {s.tags && (
                    <div className="flex flex-wrap gap-1 pt-2 border-t">
                      {s.tags.split(",").slice(0, 4).map((t) => (
                        <span key={t} className="text-[10px] text-muted-foreground">#{t.trim()}</span>
                      ))}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
