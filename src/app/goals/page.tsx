"use client";
import { useEffect, useState } from "react";
import type { Goal } from "@/lib/db/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, Check, Plus, Target, Trash2, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { cn, formatUsd } from "@/lib/utils";

function daysBetween(from: Date, toISODate: string): number {
  const to = new Date(toISODate + "T00:00:00Z");
  return Math.ceil((to.getTime() - from.getTime()) / (24 * 3600 * 1000));
}

function formatValue(v: number, unit: string | null): string {
  if (!unit || unit === "$") return formatUsd(v);
  return `${v.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${unit}`;
}

type Editing = Partial<Goal> & { _targetStr?: string; _currentStr?: string };

export default function GoalsPage() {
  const [items, setItems] = useState<Goal[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Editing>({ unit: "$", achieved: false });

  async function load() {
    const r = await fetch("/api/goals");
    if (!r.ok) { setItems([]); return; }
    const data = await r.json();
    setItems(Array.isArray(data) ? data : []);
  }
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing.title) return toast.error("Title required");
    const target = Number(editing._targetStr ?? editing.targetValue);
    if (!target || Number.isNaN(target)) return toast.error("Target value required");
    const current = editing._currentStr === "" ? undefined : Number(editing._currentStr ?? editing.currentValue ?? 0);

    const isEdit = !!editing.id;
    const url = isEdit ? `/api/goals?id=${editing.id}` : "/api/goals";
    const payload = {
      title: editing.title,
      targetValue: target,
      currentValue: current,
      unit: editing.unit || "$",
      deadline: editing.deadline || undefined,
      achieved: editing.achieved ?? false,
    };
    try {
      const r = await fetch(url, { method: isEdit ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (r.ok) {
        toast.success(isEdit ? "Goal updated" : "Goal added");
        setOpen(false);
        setEditing({ unit: "$", achieved: false });
        load();
      } else {
        const body = await r.text();
        toast.error(`Save failed (${r.status}): ${body.slice(0, 200)}`);
      }
    } catch (err: any) {
      toast.error(`Save error: ${err?.message ?? err}`);
    }
  };

  const toggleAchieved = async (g: Goal) => {
    await fetch(`/api/goals?id=${g.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ achieved: !g.achieved }) });
    load();
  };

  const del = async (id: number) => {
    if (!confirm("Delete this goal?")) return;
    await fetch(`/api/goals?id=${id}`, { method: "DELETE" });
    load();
  };

  const startEdit = (g: Goal) => {
    setEditing({ ...g, _targetStr: String(g.targetValue), _currentStr: g.currentValue == null ? "" : String(g.currentValue) });
    setOpen(true);
  };

  const startNew = () => {
    setEditing({ unit: "$", achieved: false, _targetStr: "", _currentStr: "" });
    setOpen(true);
  };

  const active = items.filter((g) => !g.achieved);
  const done = items.filter((g) => g.achieved);
  const now = new Date();

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Target className="size-7 text-primary" /> Goals
          </h1>
          <p className="text-muted-foreground">Where you&apos;re headed. Compounding without a target is just drift.</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing({ unit: "$", achieved: false }); }}>
          <DialogTrigger asChild>
            <Button onClick={startNew}><Plus className="size-4" /> Add goal</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing.id ? "Edit" : "New"} goal</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Title</Label>
                <Input
                  placeholder="e.g. Account to $1,000"
                  value={editing.title ?? ""}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <Label>Target</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="1000"
                    value={editing._targetStr ?? ""}
                    onChange={(e) => setEditing({ ...editing, _targetStr: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Unit</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-background/50 px-3 text-sm"
                    value={editing.unit ?? "$"}
                    onChange={(e) => setEditing({ ...editing, unit: e.target.value })}
                  >
                    <option value="$">$</option>
                    <option value="R">R</option>
                    <option value="%">%</option>
                    <option value="trades">trades</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Current (optional)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="empty = use latest balance"
                    value={editing._currentStr ?? ""}
                    onChange={(e) => setEditing({ ...editing, _currentStr: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Deadline</Label>
                  <Input
                    type="date"
                    value={editing.deadline ?? ""}
                    onChange={(e) => setEditing({ ...editing, deadline: e.target.value })}
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editing.achieved ?? false}
                  onChange={(e) => setEditing({ ...editing, achieved: e.target.checked })}
                  className="size-4 rounded"
                />
                Already achieved
              </label>
              <Button onClick={save} className="w-full">Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </header>

      {items.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center space-y-2">
            <Target className="size-10 mx-auto text-muted-foreground opacity-40" />
            <p className="text-sm text-muted-foreground">No goals yet.</p>
            <p className="text-xs text-muted-foreground">Click &quot;Add goal&quot; to set your first target.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {active.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm uppercase tracking-wider font-bold text-primary">Active</h2>
              <div className="grid md:grid-cols-2 gap-3">
                {active.map((g) => {
                  const current = g.currentValue ?? 0;
                  const pct = g.targetValue ? Math.max(0, Math.min(1, current / g.targetValue)) : 0;
                  const remaining = Math.max(0, g.targetValue - current);
                  const daysLeft = g.deadline ? daysBetween(now, g.deadline) : null;
                  const perDay = daysLeft && daysLeft > 0 ? remaining / daysLeft : null;
                  const overdue = daysLeft != null && daysLeft < 0;
                  return (
                    <Card key={g.id} className="group">
                      <CardContent className="p-5 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold truncate">{g.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatValue(current, g.unit)} of {formatValue(g.targetValue, g.unit)}
                            </p>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                            <Button size="sm" variant="ghost" onClick={() => toggleAchieved(g)} title="Mark achieved">
                              <Check className="size-3" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => startEdit(g)}>Edit</Button>
                            <Button size="icon" variant="ghost" onClick={() => del(g.id)}><Trash2 className="size-3" /></Button>
                          </div>
                        </div>
                        <div className="h-2.5 rounded-full bg-muted/30 overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              pct >= 1 ? "bg-profit" : overdue ? "bg-loss" : "bg-gradient-to-r from-primary to-primary/60"
                            )}
                            style={{ width: `${pct * 100}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="inline-flex items-center gap-1 text-muted-foreground">
                            <TrendingUp className="size-3" />
                            {(pct * 100).toFixed(1)}%
                          </span>
                          {daysLeft != null ? (
                            <span className={cn("inline-flex items-center gap-1 text-muted-foreground", overdue && "text-loss")}>
                              <Calendar className="size-3" />
                              {overdue ? `${-daysLeft}d overdue` : `${daysLeft}d left`}
                              {perDay != null && g.unit === "$" && ` · ${formatUsd(perDay)}/day`}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">No deadline</span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          )}

          {done.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm uppercase tracking-wider font-bold text-profit">Achieved</h2>
              <div className="grid md:grid-cols-2 gap-3">
                {done.map((g) => (
                  <Card key={g.id} className="opacity-70 group">
                    <CardContent className="p-5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="size-8 rounded-lg bg-profit/15 flex items-center justify-center shrink-0">
                          <Check className="size-4 text-profit" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{g.title}</p>
                          <p className="text-xs text-muted-foreground">{formatValue(g.targetValue, g.unit)}</p>
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                        <Button size="sm" variant="ghost" onClick={() => toggleAchieved(g)} title="Mark active">
                          Reopen
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => del(g.id)}><Trash2 className="size-3" /></Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
