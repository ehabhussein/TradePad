"use client";
import { useEffect, useState } from "react";
import { Clock, Globe, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SESSIONS,
  getActiveSessions,
  getEffectiveWindow,
  getNextEvent,
  getOverlaps,
  getSessionCountdown,
  getSessionProgress,
  isWeekendClosed,
  secondsUntilMarketOpen,
  formatInUserLocal,
  formatUTCHour,
  formatDuration,
} from "@/lib/sessions";

export function SessionStatus() {
  const [now, setNow] = useState<Date | null>(null);
  const [tzLabel, setTzLabel] = useState<string>("");

  useEffect(() => {
    setNow(new Date());
    try {
      const parts = new Intl.DateTimeFormat(undefined, { timeZoneName: "short" }).formatToParts(new Date());
      const z = parts.find((p) => p.type === "timeZoneName")?.value;
      if (z) setTzLabel(z);
    } catch {}
    // Tick every 1s so per-session countdowns update live.
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!now) {
    return (
      <div className="rounded-2xl border bg-card/60 backdrop-blur-xl p-5">
        <div className="h-5 w-32 rounded bg-muted/40 mb-3" />
        <div className="h-40 w-full rounded bg-muted/20" />
      </div>
    );
  }

  const closed = isWeekendClosed(now);
  const active = getActiveSessions(now);
  const activeSet = new Set(active.map((s) => s.name));
  const overlap = getOverlaps(active);
  const nextEvt = getNextEvent(now);
  const weekendOpenSec = secondsUntilMarketOpen(now);
  const utcTime = now.toISOString().slice(11, 16);
  const localTime = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", hour12: false }).format(now);

  return (
    <div className="rounded-2xl border bg-card/60 backdrop-blur-xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Globe className="size-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">Market sessions</p>
            <p className="text-[11px] text-muted-foreground font-mono">
              {localTime} {tzLabel && <span className="text-muted-foreground/70">{tzLabel}</span>}
              <span className="mx-1.5 opacity-50">·</span>
              {utcTime} UTC
            </p>
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
          <span className="text-xs text-muted-foreground">{active[0].label} session live</span>
        ) : (
          <span className="text-xs text-muted-foreground">All sessions quiet</span>
        )}
      </div>

      {/* Session rows */}
      <div className="divide-y divide-border/50 -mx-2">
        {SESSIONS.map((s) => {
          const isActive = !closed && activeSet.has(s.name);
          const win = getEffectiveWindow(s, now);
          const progress = isActive ? getSessionProgress(s, now) : 0;
          const localOpen = formatInUserLocal(win.startUTC, now);
          const localClose = formatInUserLocal(win.endUTC, now);
          const countdown = closed ? null : getSessionCountdown(s, now);
          return (
            <div key={s.name} className="px-2 py-2.5 flex items-center gap-3">
              {/* Status dot */}
              <div className={cn(
                "size-2.5 rounded-full shrink-0",
                isActive ? "bg-profit shadow-[0_0_12px_2px] shadow-profit/40 animate-pulse" : "bg-muted-foreground/30"
              )} />

              {/* Name + status pill */}
              <div className="w-28 shrink-0 flex items-center gap-2">
                <span className={cn("text-sm font-medium", isActive ? "text-foreground" : "text-muted-foreground")}>
                  {s.label}
                </span>
                {isActive ? (
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-profit">
                    {Math.round(progress * 100)}%
                  </span>
                ) : (
                  <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60">closed</span>
                )}
              </div>

              {/* Local time window */}
              <div className="flex-1 min-w-0 text-sm font-mono tabular-nums text-muted-foreground">
                <span className={cn(isActive && "text-foreground")}>{localOpen}</span>
                <span className="mx-1.5 opacity-50">—</span>
                <span className={cn(isActive && "text-foreground")}>{localClose}</span>
                <span className="ml-2 text-[10px] opacity-60">
                  ({formatUTCHour(win.startUTC)}–{formatUTCHour(win.endUTC)} UTC)
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-20 shrink-0 h-1.5 rounded-full bg-muted/40 overflow-hidden">
                {isActive && (
                  <div
                    className={cn("h-full bg-gradient-to-r", s.tint)}
                    style={{ width: `${progress * 100}%` }}
                  />
                )}
              </div>

              {/* Countdown */}
              <div className="w-28 shrink-0 text-right">
                {countdown ? (
                  <div className="leading-tight">
                    <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
                      {countdown.label}
                    </div>
                    <div className={cn(
                      "text-xs font-mono tabular-nums font-medium",
                      isActive ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {formatDuration(countdown.seconds)}
                    </div>
                  </div>
                ) : (
                  <span className="text-[10px] text-muted-foreground/40">—</span>
                )}
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
          <span className="ml-auto font-mono text-muted-foreground">
            in {formatDuration((nextEvt.at.getTime() - now.getTime()) / 1000)}
          </span>
        </div>
      )}
    </div>
  );
}
