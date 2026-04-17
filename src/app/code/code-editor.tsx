"use client";
import { useState } from "react";
import type { CodeSnippet } from "@/lib/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Check, Copy, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

const LANGUAGES = ["pine", "mql4", "mql5", "python", "javascript", "typescript", "json", "bash", "other"];
const KINDS = ["indicator", "strategy", "EA", "utility", "library", "webhook", "other"];
const PLATFORMS = ["TradingView", "MT4", "MT5", "NinjaTrader", "FxPro", "Custom", ""];

export function CodeEditor({ snippet, onClose }: { snippet?: CodeSnippet; onClose: () => void }) {
  const [f, setF] = useState({
    name: snippet?.name ?? "",
    description: snippet?.description ?? "",
    code: snippet?.code ?? "",
    language: snippet?.language ?? "pine",
    kind: snippet?.kind ?? "",
    platform: snippet?.platform ?? "",
    pineVersion: snippet?.pineVersion ?? "",
    symbol: snippet?.symbol ?? "",
    timeframe: snippet?.timeframe ?? "",
    tags: snippet?.tags ?? "",
    source: snippet?.source ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const save = async () => {
    if (!f.name || !f.code || !f.language) return toast.error("Name, code and language required");
    setSaving(true);
    const isEdit = !!snippet;
    const url = isEdit ? `/api/code?id=${snippet!.id}` : "/api/code";
    const r = await fetch(url, {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(f),
    });
    setSaving(false);
    if (r.ok) { toast.success(isEdit ? "Updated" : "Saved"); onClose(); }
    else { const e = await r.json().catch(() => null); toast.error(`Save failed: ${e?.error || r.status}`); }
  };

  const del = async () => {
    if (!snippet) return;
    if (!confirm(`Delete "${snippet.name}"?`)) return;
    await fetch(`/api/code?id=${snippet.id}`, { method: "DELETE" });
    toast.success("Deleted");
    onClose();
  };

  const copy = async () => {
    await navigator.clipboard.writeText(f.code);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 1500);
  };

  const lineCount = f.code.split("\n").length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose}><ArrowLeft className="size-4" /></Button>
          <div>
            <h1 className="text-2xl font-bold">{snippet ? "Edit snippet" : "New snippet"}</h1>
            <p className="text-sm text-muted-foreground">{lineCount} lines · {f.code.length.toLocaleString()} chars</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={copy} disabled={!f.code}>
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? "Copied" : "Copy"}
          </Button>
          {snippet && <Button variant="destructive" onClick={del}><Trash2 className="size-4" /></Button>}
          <Button onClick={save} disabled={saving}><Save className="size-4" /> {saving ? "Saving…" : "Save"}</Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Metadata</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-6 gap-4">
          <div className="md:col-span-4">
            <Label>Name</Label>
            <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Gold Winner v1 — Signal Dashboard" />
          </div>
          <div className="md:col-span-2">
            <Label>Language</Label>
            <Select value={f.language} onValueChange={(v) => setF({ ...f, language: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-6">
            <Label>Description</Label>
            <Textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="What does it do? How do you use it?" />
          </div>

          <div className="md:col-span-2">
            <Label>Kind</Label>
            <Select value={f.kind} onValueChange={(v) => setF({ ...f, kind: v })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                {KINDS.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Label>Platform</Label>
            <Select value={f.platform} onValueChange={(v) => setF({ ...f, platform: v })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                {PLATFORMS.filter((p) => p).map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Label>Pine version (if pine)</Label>
            <Input value={f.pineVersion} onChange={(e) => setF({ ...f, pineVersion: e.target.value })} placeholder="v6" />
          </div>

          <div className="md:col-span-2">
            <Label>Symbol</Label>
            <Input value={f.symbol} onChange={(e) => setF({ ...f, symbol: e.target.value })} placeholder="XAUUSD" />
          </div>
          <div className="md:col-span-2">
            <Label>Timeframe</Label>
            <Input value={f.timeframe} onChange={(e) => setF({ ...f, timeframe: e.target.value })} placeholder="1H" />
          </div>
          <div className="md:col-span-2">
            <Label>Source / URL</Label>
            <Input value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })} placeholder="Credit or URL" />
          </div>

          <div className="md:col-span-6">
            <Label>Tags</Label>
            <Input value={f.tags} onChange={(e) => setF({ ...f, tags: e.target.value })} placeholder="comma-separated" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Code</CardTitle>
          <span className="text-xs text-muted-foreground font-mono">{f.language}</span>
        </CardHeader>
        <CardContent>
          <Textarea
            value={f.code}
            onChange={(e) => setF({ ...f, code: e.target.value })}
            className="font-mono text-xs min-h-[480px] bg-background/60"
            placeholder="Paste your code here…"
            spellCheck={false}
          />
        </CardContent>
      </Card>
    </div>
  );
}
