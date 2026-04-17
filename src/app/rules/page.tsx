"use client";
import { useEffect, useState } from "react";
import type { Rule } from "@/lib/db/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Shield, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function RulesPage() {
  const [items, setItems] = useState<Rule[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Rule>>({ category: "risk", active: true });

  async function load() {
    const r = await fetch("/api/rules");
    if (!r.ok) { setItems([]); return; }
    const data = await r.json();
    setItems(Array.isArray(data) ? data : []);
  }
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing.text) return toast.error("Text required");
    const isEdit = !!editing.id;
    const url = isEdit ? `/api/rules?id=${editing.id}` : "/api/rules";
    const payload = { text: editing.text, category: editing.category, active: editing.active, orderNum: editing.orderNum };
    const r = await fetch(url, { method: isEdit ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (r.ok) { toast.success("Saved"); setOpen(false); setEditing({ category: "risk", active: true }); load(); }
    else { const e = await r.json().catch(() => null); toast.error(`Save failed: ${e?.error || r.status}`); }
  };

  const toggle = async (r: Rule) => {
    await fetch(`/api/rules?id=${r.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !r.active }) });
    load();
  };

  const del = async (id: number) => {
    if (!confirm("Delete rule?")) return;
    await fetch(`/api/rules?id=${id}`, { method: "DELETE" });
    load();
  };

  const byCategory = items.reduce<Record<string, Rule[]>>((acc, r) => {
    const c = r.category || "other";
    (acc[c] ||= []).push(r);
    return acc;
  }, {});

  const categoryColors: Record<string, string> = {
    risk: "text-loss border-loss/30",
    entry: "text-profit border-profit/30",
    exit: "text-primary border-primary/30",
    timing: "text-yellow-500 border-yellow-500/30",
    psychology: "text-purple-400 border-purple-400/30",
  };

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><Shield className="size-7 text-primary" /> Rules</h1>
          <p className="text-muted-foreground">The laws you live and trade by.</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing({ category: "risk", active: true }); }}>
          <DialogTrigger asChild><Button><Plus className="size-4" /> Add rule</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing.id ? "Edit" : "New"} rule</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Rule text" value={editing.text ?? ""} onChange={(e) => setEditing({ ...editing, text: e.target.value })} />
              <select className="flex h-9 w-full rounded-md border border-input bg-background/50 px-3 text-sm" value={editing.category ?? "risk"} onChange={(e) => setEditing({ ...editing, category: e.target.value })}>
                {["risk", "entry", "exit", "timing", "psychology"].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <Button onClick={save} className="w-full">Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </header>

      <div className="space-y-6">
        {Object.entries(byCategory).map(([cat, rules]) => (
          <div key={cat} className="space-y-2">
            <h2 className={cn("text-sm uppercase tracking-wider font-bold", categoryColors[cat]?.split(" ")[0])}>{cat}</h2>
            <div className="space-y-2">
              {rules.map((r, i) => (
                <Card key={r.id} className={cn("group", !r.active && "opacity-50")}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <button onClick={() => toggle(r)} className={cn("size-6 rounded flex items-center justify-center flex-shrink-0 border-2 font-bold text-xs", r.active ? "bg-primary text-primary-foreground border-primary" : "border-border")}>
                      {i + 1}
                    </button>
                    <p className={cn("flex-1", !r.active && "line-through")}>{r.text}</p>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                      <Button size="sm" variant="ghost" onClick={() => { setEditing(r); setOpen(true); }}>Edit</Button>
                      <Button size="icon" variant="ghost" onClick={() => del(r.id)}><Trash2 className="size-3" /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
