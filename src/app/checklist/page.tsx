"use client";
import { useEffect, useState } from "react";
import type { ChecklistItem } from "@/lib/db/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ListChecks, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function ChecklistAdmin() {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<ChecklistItem>>({ category: "analysis", active: true });

  async function load() {
    const r = await fetch("/api/checklist");
    if (!r.ok) { setItems([]); return; }
    const data = await r.json();
    setItems(Array.isArray(data) ? data : []);
  }
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing.text) return toast.error("Text required");
    const isEdit = !!editing.id;
    const url = isEdit ? `/api/checklist?id=${editing.id}` : "/api/checklist";
    const payload = { text: editing.text, category: editing.category, active: editing.active, orderNum: editing.orderNum };
    const r = await fetch(url, { method: isEdit ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (r.ok) { toast.success("Saved"); setOpen(false); setEditing({ category: "analysis", active: true }); load(); }
    else { const e = await r.json().catch(() => null); toast.error(`Save failed: ${e?.error || r.status}`); }
  };

  const del = async (id: number) => {
    if (!confirm("Delete?")) return;
    await fetch(`/api/checklist?id=${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><ListChecks className="size-7 text-primary" /> Checklist</h1>
          <p className="text-muted-foreground">Pre-trade checks shown in every day's view.</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing({ category: "analysis", active: true }); }}>
          <DialogTrigger asChild><Button><Plus className="size-4" /> Add item</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing.id ? "Edit" : "New"} checklist item</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Check text" value={editing.text ?? ""} onChange={(e) => setEditing({ ...editing, text: e.target.value })} />
              <select className="flex h-9 w-full rounded-md border border-input bg-background/50 px-3 text-sm" value={editing.category ?? "analysis"} onChange={(e) => setEditing({ ...editing, category: e.target.value })}>
                {["analysis", "risk", "timing", "confirmation"].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <Button onClick={save} className="w-full">Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </header>

      <div className="space-y-2">
        {items.map((i) => (
          <Card key={i.id} className="group">
            <CardContent className="p-4 flex items-center gap-3">
              <Badge variant="outline">{i.category}</Badge>
              <p className={cn("flex-1", !i.active && "line-through opacity-50")}>{i.text}</p>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                <Button size="sm" variant="ghost" onClick={() => { setEditing(i); setOpen(true); }}>Edit</Button>
                <Button size="icon" variant="ghost" onClick={() => del(i.id)}><Trash2 className="size-3" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
