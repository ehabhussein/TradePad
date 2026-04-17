"use client";
import { useEffect, useMemo, useState } from "react";
import type { CodeSnippet } from "@/lib/db/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Code2, FileCode, Plus, Search } from "lucide-react";
import { CodeEditor } from "./code-editor";
import { cn } from "@/lib/utils";

const LANG_STYLES: Record<string, { label: string; cls: string }> = {
  pine: { label: "Pine", cls: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  mql4: { label: "MQL4", cls: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  mql5: { label: "MQL5", cls: "bg-orange-500/15 text-orange-400 border-orange-500/30" },
  python: { label: "Python", cls: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30" },
  javascript: { label: "JS", cls: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30" },
  typescript: { label: "TS", cls: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  json: { label: "JSON", cls: "bg-purple-500/15 text-purple-400 border-purple-500/30" },
  bash: { label: "Bash", cls: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30" },
  other: { label: "Other", cls: "bg-muted text-muted-foreground border-border" },
};

export default function CodePage() {
  const [items, setItems] = useState<CodeSnippet[]>([]);
  const [q, setQ] = useState("");
  const [lang, setLang] = useState<string>("");
  const [editing, setEditing] = useState<CodeSnippet | null>(null);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    const r = await fetch("/api/code");
    if (!r.ok) { setItems([]); return; }
    const data = await r.json();
    setItems(Array.isArray(data) ? data : []);
  };
  useEffect(() => { load(); }, []);

  const languages = useMemo(
    () => [...new Set(items.map((s) => s.language).filter(Boolean))] as string[],
    [items]
  );

  const filtered = items.filter((s) => {
    if (lang && s.language !== lang) return false;
    if (q) {
      const n = q.toLowerCase();
      if (
        !s.name.toLowerCase().includes(n) &&
        !(s.description ?? "").toLowerCase().includes(n) &&
        !(s.tags ?? "").toLowerCase().includes(n) &&
        !s.code.toLowerCase().includes(n)
      ) return false;
    }
    return true;
  });

  if (editing || creating) {
    return <CodeEditor snippet={editing ?? undefined} onClose={() => { setEditing(null); setCreating(false); load(); }} />;
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-blue-500/10 via-primary/5 to-background p-8">
        <div className="absolute -top-12 -right-12 size-48 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="relative flex items-end justify-between">
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Code2 className="size-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight">Code Library</h1>
              <p className="text-muted-foreground">Pine, MQL, Python, webhooks — your source of truth.</p>
            </div>
          </div>
          <Button size="lg" onClick={() => setCreating(true)}>
            <Plus className="size-4" /> New snippet
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search name, code, tags…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>
        {languages.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            <button onClick={() => setLang("")} className={cn("px-2 py-1 text-xs rounded border", lang === "" ? "bg-primary/15 text-primary border-primary/30" : "text-muted-foreground hover:bg-muted")}>all</button>
            {languages.map((l) => (
              <button key={l} onClick={() => setLang(l === lang ? "" : l)} className={cn("px-2 py-1 text-xs rounded border", lang === l ? "bg-primary/15 text-primary border-primary/30" : "text-muted-foreground hover:bg-muted")}>{l}</button>
            ))}
          </div>
        )}
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} / {items.length}</span>
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">No snippets yet. Paste your first one with <kbd className="px-1.5 py-0.5 rounded border text-xs">+ New snippet</kbd>.</CardContent></Card>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((s) => {
            const style = LANG_STYLES[s.language] ?? LANG_STYLES.other;
            const firstLines = s.code.split("\n").slice(0, 6).join("\n");
            return (
              <button
                key={s.id}
                onClick={() => setEditing(s)}
                className="group text-left relative overflow-hidden rounded-xl border bg-card/60 backdrop-blur-xl p-5 transition hover:ring-1 hover:ring-primary/40 hover:bg-card"
              >
                <div className={cn("absolute top-0 right-0 px-3 py-1 rounded-bl-lg text-xs font-bold border-l border-b flex items-center gap-1", style.cls)}>
                  <FileCode className="size-3" /> {style.label}
                </div>

                <div className="space-y-3 pr-20">
                  <div>
                    <h3 className="font-semibold text-lg leading-tight group-hover:text-primary transition">{s.name}</h3>
                    {s.description && <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{s.description}</p>}
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {s.kind && <Badge variant="outline" className="text-[10px]">{s.kind}</Badge>}
                    {s.platform && <Badge variant="outline" className="text-[10px]">{s.platform}</Badge>}
                    {s.timeframe && <Badge variant="outline" className="text-[10px]">{s.timeframe}</Badge>}
                    {s.symbol && <Badge variant="outline" className="text-[10px]">{s.symbol}</Badge>}
                  </div>

                  <pre className="text-[10px] font-mono bg-background/60 rounded-md p-2 overflow-hidden max-h-28 border text-muted-foreground">
                    {firstLines}
                  </pre>

                  {s.tags && (
                    <div className="flex flex-wrap gap-1">
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
