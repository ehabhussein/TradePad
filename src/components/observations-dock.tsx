"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import type { Observation } from "@/lib/db/schema";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronRight, Clock, Eye, Minus, Plus, X } from "lucide-react";
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

export function ObservationsDock() {
  const pathname = usePathname();
  const router = useRouter();
  const [items, setItems] = useState<Observation[]>([]);
  const [collapsed, setCollapsed] = useState(false);

  // Today's weekday (UTC to match stored values)
  const todayWeekday = new Date().getUTCDay();
  const weekdayName = WEEKDAYS[todayWeekday];

  // Hide entirely on /observations page
  const hidden = pathname?.startsWith("/observations");

  const load = async () => {
    const r = await fetch(`/api/observations?weekday=${todayWeekday}`);
    if (!r.ok) { setItems([]); return; }
    const data = await r.json();
    setItems(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    if (hidden) return;
    load();
    // Refresh whenever we return to a page (pathname change)
  }, [hidden, pathname]);

  if (hidden) return null;

  return (
    <AnimatePresence>
      {!collapsed ? (
        <motion.aside
          key="dock"
          initial={{ x: 320, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 320, opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 240 }}
          className="hidden lg:flex fixed top-20 right-4 bottom-4 z-30 w-72 flex-col rounded-2xl border bg-card/80 backdrop-blur-xl shadow-xl overflow-hidden"
        >
          {/* Header */}
          <div className="p-4 border-b bg-gradient-to-br from-cyan-500/10 to-transparent">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <div className="size-7 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                  <Eye className="size-3.5 text-cyan-400" />
                </div>
                <span className="text-sm font-semibold">{weekdayName}s</span>
              </div>
              <button
                onClick={() => setCollapsed(true)}
                className="size-6 rounded hover:bg-muted transition text-muted-foreground hover:text-foreground"
                aria-label="Collapse dock"
                title="Collapse"
              >
                <ChevronRight className="size-3.5 mx-auto" />
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {items.length === 0
                ? "Nothing noted on this weekday yet"
                : `${items.length} observation${items.length === 1 ? "" : "s"} across all ${weekdayName}s`}
            </p>
          </div>

          {/* Quick add */}
          <Link
            href="/observations"
            className="mx-4 mt-3 flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 hover:bg-primary/15 text-primary text-xs transition"
          >
            <Plus className="size-3" /> New observation
          </Link>

          {/* Feed */}
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
        </motion.aside>
      ) : (
        <motion.button
          key="tab"
          initial={{ x: 40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 40, opacity: 0 }}
          onClick={() => setCollapsed(false)}
          className="hidden lg:flex fixed top-1/2 -translate-y-1/2 right-0 z-30 flex-col items-center gap-2 py-4 px-2 rounded-l-xl border border-r-0 bg-card/90 backdrop-blur-xl shadow-lg hover:bg-card hover:pr-3 transition-all"
          aria-label="Show observations"
          title={`${weekdayName}s observations (${items.length})`}
        >
          <Eye className="size-4 text-cyan-400" />
          <div className="[writing-mode:vertical-rl] rotate-180 text-[10px] font-medium tracking-wide text-muted-foreground">
            {WEEKDAYS_SHORT[todayWeekday]}s · {items.length}
          </div>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
