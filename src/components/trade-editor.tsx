"use client";
import { useState, useTransition } from "react";
import type { Trade, Screenshot } from "@/lib/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ChevronLeft, Save, Trash2, Upload } from "lucide-react";
import { cn, formatUsd, pnlColor } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { PasteImage } from "@/components/paste-image";

export function TradeEditor({ trade, screenshots = [] }: { trade?: Trade; screenshots?: Screenshot[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const isNew = !trade;
  const now = new Date();
  const [f, setF] = useState({
    symbol: trade?.symbol ?? "XAUUSD",
    direction: trade?.direction ?? "BUY",
    entryPrice: trade?.entryPrice ?? 0,
    exitPrice: trade?.exitPrice ?? null,
    stopLoss: trade?.stopLoss ?? null,
    takeProfit: trade?.takeProfit ?? null,
    quantity: trade?.quantity ?? 0.01,
    pnl: trade?.pnl ?? null,
    setupType: trade?.setupType ?? "",
    session: trade?.session ?? "London",
    confluenceScore: trade?.confluenceScore ?? null,
    notesEntry: trade?.notesEntry ?? "",
    notesReview: trade?.notesReview ?? "",
    followedRules: trade?.followedRules ?? true,
    mood: trade?.mood ?? 7,
    openedAt: trade?.openedAt ? new Date(trade.openedAt).toISOString().slice(0, 16) : now.toISOString().slice(0, 16),
    closedAt: trade?.closedAt ? new Date(trade.closedAt).toISOString().slice(0, 16) : "",
  });

  const save = () => {
    start(async () => {
      const payload: Record<string, unknown> = {
        ...f,
        entryPrice: Number(f.entryPrice),
        exitPrice: f.exitPrice == null ? undefined : Number(f.exitPrice),
        stopLoss: f.stopLoss == null ? undefined : Number(f.stopLoss),
        takeProfit: f.takeProfit == null ? undefined : Number(f.takeProfit),
        quantity: Number(f.quantity),
        pnl: f.pnl == null ? undefined : Number(f.pnl),
        confluenceScore: f.confluenceScore == null ? undefined : Number(f.confluenceScore),
        mood: Number(f.mood),
        openedAt: new Date(f.openedAt).toISOString(),
        closedAt: f.closedAt ? new Date(f.closedAt).toISOString() : undefined,
      };
      const url = isNew ? "/api/trades" : `/api/trades?id=${trade.id}`;
      const res = await fetch(url, { method: isNew ? "POST" : "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (res.ok) {
        const j = await res.json();
        toast.success(isNew ? "Trade added" : "Trade updated");
        if (isNew) router.push(`/trades/${j.id}`);
        else router.refresh();
      } else toast.error("Failed to save");
    });
  };

  const del = () => {
    if (!trade) return;
    if (!confirm("Delete this trade?")) return;
    start(async () => {
      const res = await fetch(`/api/trades?id=${trade.id}`, { method: "DELETE" });
      if (res.ok) { toast.success("Deleted"); router.push("/trades"); }
    });
  };

  const upload = useDropzone({
    accept: { "image/*": [] },
    onDrop: async (files) => {
      if (!trade) { toast.error("Save the trade first"); return; }
      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("tradeId", String(trade.id));
        const res = await fetch("/api/screenshots", { method: "POST", body: fd });
        if (res.ok) toast.success(`Uploaded ${file.name}`);
      }
      router.refresh();
    },
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {trade && <PasteImage tradeId={trade.id} onUploaded={() => router.refresh()} />}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/trades"><ChevronLeft className="size-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{isNew ? "New Trade" : `Trade #${trade.id}`}</h1>
            {trade?.pnl != null && <p className={cn("font-mono text-lg", pnlColor(trade.pnl))}>{formatUsd(trade.pnl, { sign: true })}</p>}
          </div>
        </div>
        <div className="flex gap-2">
          {!isNew && <Button variant="destructive" onClick={del}><Trash2 className="size-4" /></Button>}
          <Button onClick={save} disabled={pending}><Save className="size-4" /> Save</Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Trade</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-4">
          <div>
            <Label>Symbol</Label>
            <Input value={f.symbol} onChange={(e) => setF({ ...f, symbol: e.target.value })} />
          </div>
          <div>
            <Label>Direction</Label>
            <Select value={f.direction} onValueChange={(v) => setF({ ...f, direction: v as "BUY" | "SELL" })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="BUY">BUY</SelectItem>
                <SelectItem value="SELL">SELL</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Quantity (lots)</Label>
            <Input type="number" step="0.01" value={f.quantity} onChange={(e) => setF({ ...f, quantity: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Entry price</Label>
            <Input type="number" step="0.01" value={f.entryPrice} onChange={(e) => setF({ ...f, entryPrice: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Stop loss</Label>
            <Input type="number" step="0.01" value={f.stopLoss ?? ""} onChange={(e) => setF({ ...f, stopLoss: e.target.value === "" ? null : Number(e.target.value) })} />
          </div>
          <div>
            <Label>Take profit</Label>
            <Input type="number" step="0.01" value={f.takeProfit ?? ""} onChange={(e) => setF({ ...f, takeProfit: e.target.value === "" ? null : Number(e.target.value) })} />
          </div>
          <div>
            <Label>Exit price</Label>
            <Input type="number" step="0.01" value={f.exitPrice ?? ""} onChange={(e) => setF({ ...f, exitPrice: e.target.value === "" ? null : Number(e.target.value) })} />
          </div>
          <div>
            <Label>P/L ($)</Label>
            <Input type="number" step="0.01" value={f.pnl ?? ""} onChange={(e) => setF({ ...f, pnl: e.target.value === "" ? null : Number(e.target.value) })} />
          </div>
          <div>
            <Label>Confluence score (0-14)</Label>
            <Input type="number" min={0} max={14} value={f.confluenceScore ?? ""} onChange={(e) => setF({ ...f, confluenceScore: e.target.value === "" ? null : Number(e.target.value) })} />
          </div>
          <div>
            <Label>Opened at</Label>
            <Input type="datetime-local" value={f.openedAt} onChange={(e) => setF({ ...f, openedAt: e.target.value })} />
          </div>
          <div>
            <Label>Closed at</Label>
            <Input type="datetime-local" value={f.closedAt} onChange={(e) => setF({ ...f, closedAt: e.target.value })} />
          </div>
          <div>
            <Label>Session</Label>
            <Select value={f.session} onValueChange={(v) => setF({ ...f, session: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Asian", "London", "Overlap", "NY", "Late NY"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-3">
            <Label>Setup type</Label>
            <Input value={f.setupType} onChange={(e) => setF({ ...f, setupType: e.target.value })} placeholder="e.g. Pivot Bounce BUY, Liquidity Sweep Reversal" />
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Entry notes</CardTitle></CardHeader>
          <CardContent>
            <Textarea className="min-h-[160px]" value={f.notesEntry} onChange={(e) => setF({ ...f, notesEntry: e.target.value })} placeholder="What do you see? Why enter?" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Post-trade review</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Textarea className="min-h-[120px]" value={f.notesReview} onChange={(e) => setF({ ...f, notesReview: e.target.value })} placeholder="What worked? What didn't? Would I take it again?" />
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={f.followedRules} onChange={(e) => setF({ ...f, followedRules: e.target.checked })} className="size-4 rounded" />
                Followed all my rules
              </label>
              <div className="flex-1">
                <Label className="text-xs">Mood (1-10)</Label>
                <Input type="number" min={1} max={10} value={f.mood} onChange={(e) => setF({ ...f, mood: Number(e.target.value) })} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {!isNew && (
        <Card>
          <CardHeader><CardTitle>Screenshots</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div {...upload.getRootProps()} className={cn("border-2 border-dashed rounded-lg p-6 text-center transition cursor-pointer", upload.isDragActive ? "border-primary bg-primary/5" : "border-border hover:bg-muted")}>
              <input {...upload.getInputProps()} />
              <Upload className="size-6 mx-auto mb-1 text-muted-foreground" />
              <p className="text-sm">Drag & drop chart snapshots — or just <kbd className="px-1.5 py-0.5 rounded border text-[10px]">Ctrl+V</kbd> to paste from clipboard</p>
            </div>
            {screenshots.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {screenshots.map((s) => (
                  <a key={s.id} href={`/api/screenshots/${s.filename}`} target="_blank" rel="noreferrer" className="rounded-lg overflow-hidden border">
                    <img src={`/api/screenshots/${s.filename}`} alt="" className="aspect-video w-full object-cover" />
                  </a>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
