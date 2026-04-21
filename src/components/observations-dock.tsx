"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import type { Observation } from "@/lib/db/schema";
import { Check, ChevronsLeft, ChevronsRight, Clock, Eye, Minus, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const OUTCOME_ICONS: Record<string, { icon: any; cls: string }> = {
  happened: { icon: Check, cls: "text-profit" },
  didnt_happen: { icon: X, cls: "text-loss" },
  partial: { icon: Minus, cls: "text-amber-400" },
  pending: { icon: Clock, cls: "text-muted-foreground" },
};
const CATEGORY_DOT: Record<string, string> = {
  spike: "bg-orange-400",
  sweep: "bg-purple-400",
  rejection: "bg-loss",
  "regime-change": "bg-cyan-400",
  "news-reaction": "bg-amber-400",
  "session-open": "bg-blue-400",
  anomaly: "bg-pink-400",
  "level-reaction": "bg-profit",
};

const STORAGE_KEY = "tradepad.dock.collapsed";

export function ObservationsDock() {
  const pathname = usePathname();
  const [items, setItems] = useState<Observation[]>([]);
  const [collapsed, setCollapsed] = useState(false);

  const todayWeekday = new Date().getUTCDay();
  const weekdayName = WEEKDAYS[todayWeekday];

  // Hide entirely on /observations page — set data-dock="none" so main reclaims the space.
  const hidden = pathname?.startsWith("/observations") ?? false;

  // Hydrate collapsed preference from localStorage
  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (saved === "1") setCollapsed(true);
    else if (saved === "0") setCollapsed(false);
  }, []);

  // Mirror state to <html data-dock> so CSS can size main's right padding.
  useEffect(() => {
    if (hidden) {
      document.documentElement.dataset.dock = "none";
      return;
    }
    document.documentElement.dataset.dock = collapsed ? "rail" : "full";
    try { localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0"); } catch {}
  }, [collapsed, hidden]);

  const load = async () => {
    const r = await fetch(`/api/observations?weekday=${todayWeekday}`);
    if (!r.ok) { setItems([]); return; }
    const data = await r.json();
    setItems(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    if (hidden) return;
    load();
  }, [hidden, pathname]);

  if (hidden) return null;

  return (
    <aside
      aria-label="Observations dock"
      className={cn(
        "hidden lg:flex fixed top-4 right-0 bottom-4 z-30 flex-col border-l bg-card/85 backdrop-blur-xl",
        "transition-[width] duration-200 ease-out overflow-hidden",
        collapsed ? "w-14" : "w-72 rounded-l-2xl border shadow-xl border-r-0"
      )}
    >
      {/* Header: weekday label + collapse toggle */}
      <div className={cn(
        "flex items-center gap-2 border-b shrink-0",
        collapsed ? "h-16 px-0 justify-center" : "h-16 px-4 bg-gradient-to-br from-cyan-500/10 to-transparent"
      )}>
        {collapsed ? (
          <button
            onClick={() => setCollapsed(false)}
            className="size-10 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 flex items-center justify-center text-cyan-400 transition relative"
            aria-label="Expand dock"
            title={`${weekdayName}s observations (${items.length})`}
          >
            <Eye className="size-4" />
            {items.length > 0 && (
              <span className="absolute -top-1 -right-1 size-4 rounded-full bg-cyan-500 text-[9px] font-bold text-background flex items-center justify-center">
                {items.length > 9 ? "9+" : items.length}
              </span>
            )}
          </button>
        ) : (
          <>
            <div className="size-8 rounded-lg bg-cyan-500/20 flex items-center justify-center shrink-0">
              <Eye className="size-4 text-cyan-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">{weekdayName}s</p>
              <p className="text-[11px] text-muted-foreground truncate">
                {items.length === 0
                  ? "Nothing noted yet"
                  : `${items.length} observation${items.length === 1 ? "" : "s"}`}
              </p>
            </div>
            <button
              onClick={() => setCollapsed(true)}
              className="size-8 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition inline-flex items-center justify-center"
              aria-label="Collapse dock"
              title="Collapse"
            >
              <ChevronsRight className="size-4" />
            </button>
          </>
        )}
      </div>

      {/* Body */}
      {!collapsed ? (
        <>
          <Link
            href="/observations"
            className="mx-4 mt-3 flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 hover:bg-primary/15 text-primary text-xs transition"
          >
            <Plus className="size-3" /> New observation
          </Link>

          <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-2">
            {items.length === 0 ? (
              <div className="text-center py-10 text-xs text-muted-foreground">
                Your {WEEKDAYS_SHORT[todayWeekday]} patterns will appear here as you log them.
              </div>
            ) : (
              items.map((o) => {
                const d = o.observedAt ? new Date(o.observedAt as unknown as string) : null;
                const outcome = OUTCOME_ICONS[o.outcome ?? "pending"];
                const OIcon = outcome.icon;
                const dot = CATEGORY_DOT[o.category ?? ""] ?? "bg-muted-foreground";
                return (
                  <Link
                    key={o.id}
                    href="/observations"
                    className="group block rounded-lg border border-border/50 bg-background/50 p-3 hover:border-primary/40 hover:bg-background transition"
                  >
                    <div className="flex items-start gap-2">
                      <div className="text-center min-w-[40px] shrink-0">
                        <div className="text-base font-bold font-mono leading-tight">{d ? String(d.getUTCHours()).padStart(2, "0") : "--"}</div>
                        <div className="text-[9px] text-muted-foreground">{d ? d.toISOString().slice(5, 10) : ""}</div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-1.5">
                          <span className={cn("size-1.5 rounded-full mt-1 shrink-0", dot)} title={o.category ?? ""} />
                          <h4 className="text-xs font-medium leading-snug line-clamp-2 flex-1">{o.title}</h4>
                          <OIcon className={cn("size-3 shrink-0 mt-0.5", outcome.cls)} />
                        </div>
                        {o.symbol && (
                          <div className="mt-1 flex items-center gap-1">
                            <span className="text-[9px] font-mono text-muted-foreground">{o.symbol}</span>
                            {o.priceAt != null && <span className="text-[9px] font-mono text-muted-foreground">· {o.priceAt}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </>
      ) : (
        // Collapsed rail: tiny new-observation + expand at bottom
        <div className="flex-1 flex flex-col items-center justify-end gap-2 pb-2 pt-2">
          <Link
            href="/observations"
            className="size-10 rounded-lg border border-dashed border-primary/40 bg-primary/5 hover:bg-primary/15 text-primary transition inline-flex items-center justify-center"
            title="New observation"
          >
            <Plus className="size-4" />
          </Link>
          <button
            onClick={() => setCollapsed(false)}
            className="size-8 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition inline-flex items-center justify-center"
            aria-label="Expand dock"
            title="Expand"
          >
            <ChevronsLeft className="size-4" />
          </button>
        </div>
      )}
    </aside>
  );
}
