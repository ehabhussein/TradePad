"use client";
import { useEffect, useState } from "react";
import type { Lesson } from "@/lib/db/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { BookOpen, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function LessonsPage() {
  const [items, setItems] = useState<Lesson[]>([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Lesson>>({ severity: "info" });

  async function load() {
    const url = q ? `/api/lessons?q=${encodeURIComponent(q)}` : "/api/lessons";
    const r = await fetch(url);
    if (!r.ok) { setItems([]); return; }
    const data = await r.json();
    setItems(Array.isArray(data) ? data : []);
  }
  useEffect(() => { load(); }, [q]);

  const save = async () => {
    if (!editing.title || !editing.body) return toast.error("Title and body required");
    const isEdit = !!editing.id;
    const url = isEdit ? `/api/lessons?id=${editing.id}` : "/api/lessons";
    const payload = { title: editing.title, body: editing.body, tags: editing.tags, severity: editing.severity, sourceDate: editing.sourceDate, sourceTradeId: editing.sourceTradeId };
    const r = await fetch(url, { method: isEdit ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (r.ok) { toast.success("Saved"); setOpen(false); setEditing({ severity: "info" }); load(); }
    else { const e = await r.json().catch(() => null); toast.error(`Save failed: ${e?.error || r.status}`); }
  };

  const del = async (id: number) => {
    if (!confirm("Delete lesson?")) return;
    await fetch(`/api/lessons?id=${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><BookOpen className="size-7 text-primary" /> Lessons</h1>
          <p className="text-muted-foreground">Your growing library of hard-earned wisdom.</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing({ severity: "info" }); }}>
          <DialogTrigger asChild><Button><Plus className="size-4" /> New lesson</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing.id ? "Edit" : "New"} lesson</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Title" value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
              <Textarea className="min-h-[160px]" placeholder="What you learned…" value={editing.body ?? ""} onChange={(e) => setEditing({ ...editing, body: e.target.value })} />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Tags (comma)</Label>
                  <Input value={editing.tags ?? ""} onChange={(e) => setEditing({ ...editing, tags: e.target.value })} />
                </div>
                <div>
                  <Label>Severity</Label>
                  <select className="flex h-9 w-full rounded-md border border-input bg-background/50 px-3 text-sm" value={editing.severity ?? "info"} onChange={(e) => setEditing({ ...editing, severity: e.target.value })}>
                    <option value="info">info</option>
                    <option value="warning">warning</option>
                    <option value="critical">critical</option>
                  </select>
                </div>
              </div>
              <Button onClick={save} className="w-full">Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </header>

      <div className="relative">
        <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search lessons…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
      </div>

      {items.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No lessons yet. Add your first.</CardContent></Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {items.map((l) => (
            <Card key={l.id} className="group">
              <CardContent className="p-5 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">{l.title}</h3>
                    <Badge variant={l.severity === "critical" ? "destructive" : l.severity === "warning" ? "secondary" : "outline"}>{l.severity}</Badge>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                    <Button size="sm" variant="ghost" onClick={() => { setEditing(l); setOpen(true); }}>Edit</Button>
                    <Button size="icon" variant="ghost" onClick={() => del(l.id)}><Trash2 className="size-3" /></Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{l.body}</p>
                {l.tags && (
                  <div className="flex flex-wrap gap-1">
                    {l.tags.split(",").map((t) => <Badge key={t} variant="outline" className="text-[10px]">{t.trim()}</Badge>)}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
