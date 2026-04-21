"use client";
import { useEffect, useState } from "react";
import { Clock, Globe, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SESSIONS,
  getActiveSessions,
  getNextEvent,
  getOverlaps,
  getSessionProgress,
  isWeekendClosed,
  secondsUntilMarketOpen,
  formatDuration,
} from "@/lib/sessions";

export function SessionStatus() {
  // `now` ticks every 30s on the client. SSR renders a stable placeholder.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  if (!now) {
    return (
      <div className="rounded-2xl border bg-card/60 backdrop-blur-xl p-5">
        <div className="h-5 w-32 rounded bg-muted/40 mb-3" />
        <div className="h-12 w-full rounded bg-muted/20" />
      </div>
    );
  }

  const closed = isWeekendClosed(now);
  const active = getActiveSessions(now);
  const overlap = getOverlaps(active);
  const nextEvt = getNextEvent(now);
  const weekendOpenSec = secondsUntilMarketOpen(now);

  const utcTime = now.toISOString().slice(11, 16); // HH:MM

  return (
    <div className="rounded-2xl border bg-card/60 backdrop-blur-xl p-5 space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Globe className="size-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">Market sessions</p>
            <p className="text-[11px] text-muted-foreground font-mono">{utcTime} UTC</p>
          </div>
        </div>

        {closed ? (
          <div className="flex items-center gap-2 text-xs">
            <Moon className="size-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Weekend —</span>
            <span className="font-mono font-medium text-amber-400">
              opens in {formatDuration(weekendOpenSec ?? 0)}
            </span>
          </div>
        ) : overlap ? (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            {overlap}
          </span>
        ) : active.length === 1 ? (
          <span className="text-xs text-muted-foreground">
            {active[0].label} session
          </span>
        ) : null}
      </div>

      {/* Session timeline: show all 4 sessions with active highlighted */}
      <div className="space-y-2">
        {SESSIONS.map((s) => {
          const isActive = !closed && active.some((a) => a.name === s.name);
          const progress = isActive ? getSessionProgress(s, now) : 0;
          const start = String(s.startUTC).padStart(2, "0") + ":00";
          const end = String(s.endUTC).padStart(2, "0") + ":00";
          return (
            <div key={s.name} className="flex items-center gap-3">
              <div className={cn(
                "w-20 shrink-0 text-xs font-medium tabular-nums",
                isActive ? "text-foreground" : "text-muted-foreground"
              )}>
                {s.label}
              </div>
              <div className="flex-1 relative h-6 rounded-md bg-muted/30 overflow-hidden">
                {isActive && (
                  <div
                    className={cn("absolute inset-y-0 left-0 bg-gradient-to-r opacity-80", s.tint)}
                    style={{ width: `${progress * 100}%` }}
                  />
                )}
                <div className="absolute inset-0 flex items-center justify-between px-2 text-[10px] font-mono tabular-nums text-muted-foreground">
                  <span>{start}</span>
                  {isActive && (
                    <span className="font-semibold text-foreground">
                      {Math.round(progress * 100)}%
                    </span>
                  )}
                  <span>{end} UTC</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Next event */}
      {!closed && nextEvt && (
        <div className="flex items-center gap-2 pt-1 border-t text-xs">
          <Clock className="size-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">Next:</span>
          <span className="font-medium">
            {nextEvt.session.label} {nextEvt.type === "open" ? "opens" : "closes"}
          </span>
          <span className="font-mono text-muted-foreground ml-auto">
            in {formatDuration((nextEvt.at.getTime() - now.getTime()) / 1000)}
          </span>
        </div>
      )}
    </div>
  );
}
