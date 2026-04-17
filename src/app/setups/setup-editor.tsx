"use client";
import { useState } from "react";
import type { Setup } from "@/lib/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Condition = { indicator: string; operator: string; value: string; note?: string };

const OPERATORS = ["=", ">", "<", ">=", "<=", "!=", "between", "crosses above", "crosses below", "touches", "breaks", "swept", "in range"];

// Quick-pick common indicator names (free-form still allowed)
const INDICATOR_HINTS = [
  "GW Dashboard Signal", "ScalperX signal", "Claude Edge buyScore", "Claude Edge sellScore",
  "Claude Edge ROC", "Claude Edge volRegime", "Claude Edge wickBody", "Claude Edge dEma200",
  "Claude Edge asianHigh", "Claude Edge asianLow", "BF Flow", "BF Oscillator",
  "EMA21", "EMA50", "EMA200", "RSI(14)", "MACD hist", "VWAP", "ATR(14)",
  "Donchian(20)", "Bollinger Bands", "FxPro Pivot P", "Pivot R1", "Pivot S1",
  "DXY", "session", "price", "close", "high", "low",
];

function parse(json: string | null | undefined): Condition[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v : [];
  } catch { return []; }
}

export function SetupEditor({ setup, onClose }: { setup?: Setup; onClose: () => void }) {
  const [f, setF] = useState({
    name: setup?.name ?? "",
    description: setup?.description ?? "",
    direction: (setup?.direction ?? "BUY") as "BUY" | "SELL" | "BOTH",
    category: setup?.category ?? "",
    timeframe: setup?.timeframe ?? "1H",
    bestSession: setup?.bestSession ?? "",
    slRule: setup?.slRule ?? "",
    tpRule: setup?.tpRule ?? "",
    invalidationRule: setup?.invalidationRule ?? "",
    confluenceNotes: setup?.confluenceNotes ?? "",
    tags: setup?.tags ?? "",
    active: setup?.active ?? true,
  });
  const [entry, setEntry] = useState<Condition[]>(parse(setup?.entryConditionsJson));
  const [exit, setExit] = useState<Condition[]>(parse(setup?.exitConditionsJson));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!f.name) return toast.error("Name required");
    setSaving(true);
    const payload = {
      ...f,
      entryConditionsJson: JSON.stringify(entry),
      exitConditionsJson: JSON.stringify(exit),
    };
    const isEdit = !!setup;
    const url = isEdit ? `/api/setups?id=${setup!.id}` : "/api/setups";
    const r = await fetch(url, {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (r.ok) { toast.success(isEdit ? "Updated" : "Created"); onClose(); }
    else { const e = await r.json().catch(() => null); toast.error(`Save failed: ${e?.error || r.status}`); }
  };

  const del = async () => {
    if (!setup) return;
    if (!confirm(`Delete setup "${setup.name}"?`)) return;
    await fetch(`/api/setups?id=${setup.id}`, { method: "DELETE" });
    toast.success("Deleted");
    onClose();
  };

  const addCond = (which: "entry" | "exit") => {
    const empty: Condition = { indicator: "", operator: "=", value: "", note: "" };
    which === "entry" ? setEntry([...entry, empty]) : setExit([...exit, empty]);
  };
  const updateCond = (which: "entry" | "exit", i: number, patch: Partial<Condition>) => {
    const list = which === "entry" ? [...entry] : [...exit];
    list[i] = { ...list[i], ...patch };
    which === "entry" ? setEntry(list) : setExit(list);
  };
  const removeCond = (which: "entry" | "exit", i: number) => {
    which === "entry" ? setEntry(entry.filter((_, j) => j !== i)) : setExit(exit.filter((_, j) => j !== i));
  };

  const dirStyles = {
    BUY: "bg-profit/15 text-profit border-profit/30",
    SELL: "bg-loss/15 text-loss border-loss/30",
    BOTH: "bg-primary/15 text-primary border-primary/30",
  } as const;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose}><ArrowLeft className="size-4" /></Button>
          <div>
            <h1 className="text-2xl font-bold">{setup ? "Edit setup" : "New setup"}</h1>
            <p className="text-sm text-muted-foreground">Build a reusable strategy template.</p>
          </div>
        </div>
        <div className="flex gap-2">
          {setup && <Button variant="destructive" onClick={del}><Trash2 className="size-4" /></Button>}
          <Button onClick={save} disabled={saving}><Save className="size-4" /> {saving ? "Saving…" : "Save"}</Button>
        </div>
      </div>

      {/* Identity */}
      <Card>
        <CardHeader><CardTitle>Identity</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-6 gap-4">
          <div className="md:col-span-4">
            <Label>Name</Label>
            <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Pivot Bounce BUY" />
          </div>
          <div className="md:col-span-2">
            <Label>Direction</Label>
            <Select value={f.direction} onValueChange={(v) => setF({ ...f, direction: v as any })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="BUY">BUY</SelectItem>
                <SelectItem value="SELL">SELL</SelectItem>
                <SelectItem value="BOTH">BOTH</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-6">
            <Label>Description</Label>
            <Textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="One-line pitch for the setup: what it is, when it works, what edge it captures." />
          </div>
          <div className="md:col-span-2">
            <Label>Category</Label>
            <Input value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} placeholder="breakout / reversal / trend / ICT / scalp / exit" />
          </div>
          <div className="md:col-span-2">
            <Label>Timeframe</Label>
            <Input value={f.timeframe} onChange={(e) => setF({ ...f, timeframe: e.target.value })} placeholder="e.g. 1H" />
          </div>
          <div className="md:col-span-2">
            <Label>Best session</Label>
            <Input value={f.bestSession} onChange={(e) => setF({ ...f, bestSession: e.target.value })} placeholder="London / Overlap / Any" />
          </div>
          <div className="md:col-span-6">
            <Label>Tags</Label>
            <Input value={f.tags} onChange={(e) => setF({ ...f, tags: e.target.value })} placeholder="comma-separated" />
          </div>
        </CardContent>
      </Card>

      {/* Entry Conditions */}
      <ConditionList
        title="Entry triggers"
        subtitle="When ALL of these align, the setup fires"
        accent="text-profit"
        conditions={entry}
        onAdd={() => addCond("entry")}
        onUpdate={(i, p) => updateCond("entry", i, p)}
        onRemove={(i) => removeCond("entry", i)}
      />

      {/* Exit Conditions */}
      <ConditionList
        title="Exit triggers"
        subtitle="ANY of these closes the trade"
        accent="text-loss"
        conditions={exit}
        onAdd={() => addCond("exit")}
        onUpdate={(i, p) => updateCond("exit", i, p)}
        onRemove={(i) => removeCond("exit", i)}
      />

      {/* Rules */}
      <Card>
        <CardHeader><CardTitle>Risk & Invalidation</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>Stop loss rule</Label>
            <Textarea className="min-h-[80px]" value={f.slRule} onChange={(e) => setF({ ...f, slRule: e.target.value })} placeholder="e.g. 2× ATR(14) below entry, or just under prior swing low" />
          </div>
          <div>
            <Label>Take profit rule</Label>
            <Textarea className="min-h-[80px]" value={f.tpRule} onChange={(e) => setF({ ...f, tpRule: e.target.value })} placeholder="e.g. Next pivot level, 2R minimum" />
          </div>
          <div>
            <Label>Invalidation</Label>
            <Textarea className="min-h-[80px]" value={f.invalidationRule} onChange={(e) => setF({ ...f, invalidationRule: e.target.value })} placeholder="What makes this setup void?" />
          </div>
          <div>
            <Label>Confluence notes (A+ boosters)</Label>
            <Textarea className="min-h-[80px]" value={f.confluenceNotes} onChange={(e) => setF({ ...f, confluenceNotes: e.target.value })} placeholder="Extra confluences to look for when entering" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ConditionList({
  title, subtitle, accent, conditions, onAdd, onUpdate, onRemove,
}: {
  title: string; subtitle: string; accent: string;
  conditions: Condition[];
  onAdd: () => void;
  onUpdate: (i: number, p: Partial<Condition>) => void;
  onRemove: (i: number) => void;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className={accent}>{title}</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        </div>
        <Button size="sm" variant="outline" onClick={onAdd}><Plus className="size-3" /> Add condition</Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {conditions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No conditions yet. Click "Add condition" to start.</p>
        ) : (
          conditions.map((c, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-start group">
              <div className="col-span-4">
                <Input
                  list={`indicators-${i}`}
                  value={c.indicator}
                  onChange={(e) => onUpdate(i, { indicator: e.target.value })}
                  placeholder="Indicator"
                  className="font-mono text-xs"
                />
                <datalist id={`indicators-${i}`}>
                  {INDICATOR_HINTS.map((ind) => <option key={ind} value={ind} />)}
                </datalist>
              </div>
              <div className="col-span-2">
                <Select value={c.operator} onValueChange={(v) => onUpdate(i, { operator: v })}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {OPERATORS.map((op) => <SelectItem key={op} value={op}>{op}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-3">
                <Input
                  value={c.value}
                  onChange={(e) => onUpdate(i, { value: e.target.value })}
                  placeholder="Value"
                  className="font-mono text-xs"
                />
              </div>
              <div className="col-span-2">
                <Input
                  value={c.note ?? ""}
                  onChange={(e) => onUpdate(i, { note: e.target.value })}
                  placeholder="note (optional)"
                  className="text-xs"
                />
              </div>
              <div className="col-span-1 flex justify-end">
                <Button size="icon" variant="ghost" onClick={() => onRemove(i)} className="opacity-0 group-hover:opacity-100 transition">
                  <X className="size-3" />
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
