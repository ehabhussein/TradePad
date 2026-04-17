"use client";
import { useState, useTransition } from "react";
import type { Day, Trade, Screenshot, ChecklistItem } from "@/lib/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatUsd, pnlColor, cn } from "@/lib/utils";
import { toast } from "sonner";
import { Camera, Check, ChevronLeft, Save, Upload } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";

type Props = {
  date: string;
  day: Day | null;
  trades: Trade[];
  screenshots: Screenshot[];
  checklistItems: ChecklistItem[];
};

export function DayEditor({ date, day, trades, screenshots, checklistItems }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [form, setForm] = useState({
    whatHappened: day?.whatHappened ?? "",
    marketContext: day?.marketContext ?? "",
    wins: day?.wins ?? "",
    mistakes: day?.mistakes ?? "",
    lessons: day?.lessons ?? "",
    mood: day?.mood ?? 7,
    dailyCloseBalance: day?.dailyCloseBalance ?? null,
    dailyClosePnL: day?.dailyClosePnL ?? null,
    tags: day?.tags ?? "",
  });
  const [checked, setChecked] = useState<Record<number, boolean>>(() => {
    if (day?.checklistJson) {
      try { return JSON.parse(day.checklistJson); } catch { return {}; }
    }
    return {};
  });

  const discipline = checklistItems.length
    ? Math.round((checklistItems.filter((i) => checked[i.id]).length / checklistItems.length) * 100)
    : 0;

  const save = () => {
    start(async () => {
      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          ...form,
          dailyCloseBalance: form.dailyCloseBalance ? Number(form.dailyCloseBalance) : undefined,
          dailyClosePnL: form.dailyClosePnL ? Number(form.dailyClosePnL) : undefined,
          checklistJson: JSON.stringify(checked),
          disciplineScore: discipline,
        }),
      });
      if (res.ok) { toast.success("Day saved"); router.refresh(); }
      else toast.error("Failed to save");
    });
  };

  const upload = useDropzone({
    accept: { "image/*": [] },
    onDrop: async (files) => {
      for (const f of files) {
        const fd = new FormData();
        fd.append("file", f);
        fd.append("dayDate", date);
        const res = await fetch("/api/screenshots", { method: "POST", body: fd });
        if (res.ok) toast.success(`Uploaded ${f.name}`);
      }
      router.refresh();
    },
  });

  const dayPnL = trades.reduce((s, t) => s + (t.pnl ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/days"><ChevronLeft className="size-4" /></Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{new Date(date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</h1>
            <p className="text-muted-foreground text-sm">{date}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Day P/L</p>
            <p className={cn("text-xl font-bold font-mono", pnlColor(dayPnL))}>{formatUsd(dayPnL, { sign: true })}</p>
          </div>
          <Button onClick={save} disabled={pending}>
            <Save className="size-4" /> {pending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="notes">
        <TabsList>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="checklist">Checklist ({discipline}%)</TabsTrigger>
          <TabsTrigger value="trades">Trades ({trades.length})</TabsTrigger>
          <TabsTrigger value="gallery">Screenshots ({screenshots.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="notes" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle>What happened</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <Textarea placeholder="Quick summary of the day…" value={form.whatHappened} onChange={(e) => setForm({ ...form, whatHappened: e.target.value })} className="min-h-[120px]" />
                <div>
                  <Label>Market context</Label>
                  <Textarea placeholder="DXY, Fed, news, regime…" value={form.marketContext} onChange={(e) => setForm({ ...form, marketContext: e.target.value })} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Wins / Mistakes / Lessons</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-profit">Wins</Label>
                  <Textarea value={form.wins} onChange={(e) => setForm({ ...form, wins: e.target.value })} />
                </div>
                <div>
                  <Label className="text-loss">Mistakes</Label>
                  <Textarea value={form.mistakes} onChange={(e) => setForm({ ...form, mistakes: e.target.value })} />
                </div>
                <div>
                  <Label>Lessons</Label>
                  <Textarea value={form.lessons} onChange={(e) => setForm({ ...form, lessons: e.target.value })} />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Day close</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-4 gap-4">
              <div>
                <Label>Daily balance close</Label>
                <Input type="number" step="0.01" value={form.dailyCloseBalance ?? ""} onChange={(e) => setForm({ ...form, dailyCloseBalance: e.target.value ? Number(e.target.value) : null })} />
              </div>
              <div>
                <Label>Day P/L</Label>
                <Input type="number" step="0.01" value={form.dailyClosePnL ?? ""} onChange={(e) => setForm({ ...form, dailyClosePnL: e.target.value ? Number(e.target.value) : null })} />
              </div>
              <div>
                <Label>Mood (1-10)</Label>
                <Input type="number" min={1} max={10} value={form.mood ?? ""} onChange={(e) => setForm({ ...form, mood: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Tags (comma separated)</Label>
                <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="london, fomc, bearish" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="checklist" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Pre-market checklist — {discipline}%</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-2">
              {checklistItems.map((item) => {
                const isChecked = !!checked[item.id];
                return (
                  <button
                    key={item.id}
                    onClick={() => setChecked({ ...checked, [item.id]: !isChecked })}
                    className={cn("text-left flex items-center gap-3 p-3 rounded-lg border transition", isChecked ? "border-primary bg-primary/5" : "border-border hover:bg-muted")}
                  >
                    <div className={cn("size-5 rounded-md border flex items-center justify-center flex-shrink-0", isChecked ? "bg-primary border-primary text-primary-foreground" : "")}>
                      {isChecked && <Check className="size-3" />}
                    </div>
                    <div>
                      <p className="text-sm">{item.text}</p>
                      {item.category && <Badge variant="outline" className="mt-1 text-[10px]">{item.category}</Badge>}
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trades" className="space-y-3">
          {trades.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No trades for this day yet.</CardContent></Card>
          ) : trades.map((t) => (
            <Link key={t.id} href={`/trades/${t.id}`}>
              <Card className="transition hover:ring-1 hover:ring-primary/40">
                <CardContent className="p-4 flex items-center gap-4">
                  <Badge variant={t.direction === "BUY" ? "profit" : "loss"}>{t.direction}</Badge>
                  <div className="flex-1">
                    <p className="font-medium">{t.symbol}</p>
                    <p className="text-xs text-muted-foreground">
                      Entry {t.entryPrice} → Exit {t.exitPrice ?? "open"} · {t.setupType ?? "—"}
                    </p>
                  </div>
                  <div className={cn("font-mono font-bold", pnlColor(t.pnl))}>{formatUsd(t.pnl, { sign: true })}</div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </TabsContent>

        <TabsContent value="gallery" className="space-y-4">
          <div {...upload.getRootProps()} className={cn("border-2 border-dashed rounded-lg p-8 text-center transition cursor-pointer", upload.isDragActive ? "border-primary bg-primary/5" : "border-border hover:bg-muted")}>
            <input {...upload.getInputProps()} />
            <Upload className="size-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm">Drag & drop screenshots here, or click to select</p>
            <p className="text-xs text-muted-foreground mt-1">Chart snapshots, FxPro positions, TV alerts — anything visual</p>
          </div>

          {screenshots.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {screenshots.map((s) => (
                <a key={s.id} href={`/api/screenshots/${s.filename}`} target="_blank" rel="noreferrer" className="group relative rounded-lg overflow-hidden border">
                  <img src={`/api/screenshots/${s.filename}`} alt={s.caption || ""} className="aspect-video w-full object-cover group-hover:scale-105 transition" />
                  {s.caption && <p className="absolute bottom-0 inset-x-0 p-1 bg-black/70 text-white text-xs truncate">{s.caption}</p>}
                </a>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
