/**
 * Forex market sessions — UTC windows.
 * The forex market closes from Fri 22:00 UTC to Sun 22:00 UTC.
 *
 * Gold (XAUUSD) spot follows roughly the same hours with a tighter
 * daily break that brokers handle individually; the major liquidity
 * windows (Tokyo / London / NY) are identical to forex.
 */

export type SessionName = "Sydney" | "Tokyo" | "London" | "NewYork";

export type SessionDef = {
  name: SessionName;
  label: string;
  /** UTC hour the session opens (0-23) */
  startUTC: number;
  /** UTC hour the session closes (0-23). If < start the window crosses midnight. */
  endUTC: number;
  /** Tailwind gradient tokens for chips */
  tint: string;
  /** Single-letter short code */
  code: string;
};

export const SESSIONS: SessionDef[] = [
  { name: "Sydney",  label: "Sydney",   startUTC: 22, endUTC: 7,  tint: "from-emerald-500 to-emerald-500/60", code: "S" },
  { name: "Tokyo",   label: "Tokyo",    startUTC: 0,  endUTC: 9,  tint: "from-rose-500 to-rose-500/60",       code: "T" },
  { name: "London",  label: "London",   startUTC: 8,  endUTC: 17, tint: "from-sky-500 to-sky-500/60",         code: "L" },
  { name: "NewYork", label: "New York", startUTC: 13, endUTC: 22, tint: "from-violet-500 to-violet-500/60",   code: "N" },
];

/** hour∈[0,24) inside the [start,end) window? handles wrap at midnight */
function hourInWindow(hour: number, start: number, end: number): boolean {
  if (start === end) return false;
  if (start < end) return hour >= start && hour < end;
  return hour >= start || hour < end; // Sydney crosses midnight
}

/** Forex close: Fri 22:00 UTC to Sun 22:00 UTC. */
export function isWeekendClosed(now: Date): boolean {
  const day = now.getUTCDay(); // 0=Sun..6=Sat
  const hour = now.getUTCHours();
  if (day === 5 && hour >= 22) return true; // Fri after 22:00
  if (day === 6) return true;                // all of Sat
  if (day === 0 && hour < 22) return true;   // Sun before 22:00
  return false;
}

export function getActiveSessions(now: Date = new Date()): SessionDef[] {
  if (isWeekendClosed(now)) return [];
  const hour = now.getUTCHours();
  return SESSIONS.filter((s) => hourInWindow(hour, s.startUTC, s.endUTC));
}

/**
 * All session open/close boundary events for the next 48 hours, ordered.
 * Each event is { type, session, at } where at is a Date.
 */
function upcomingEvents(now: Date, lookaheadHours = 48) {
  const events: { type: "open" | "close"; session: SessionDef; at: Date }[] = [];
  const nowMs = now.getTime();
  // Walk day-by-day from yesterday to day-after-tomorrow so wrap-over sessions are included.
  for (let dayOffset = -1; dayOffset <= 2; dayOffset++) {
    const base = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + dayOffset));
    for (const s of SESSIONS) {
      const open = new Date(base); open.setUTCHours(s.startUTC, 0, 0, 0);
      // For wrap-over sessions the close lands on the NEXT UTC day.
      const closeDay = s.endUTC <= s.startUTC ? dayOffset + 1 : dayOffset;
      const close = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + closeDay, s.endUTC, 0, 0, 0));
      if (open.getTime() > nowMs && open.getTime() - nowMs < lookaheadHours * 3600_000) events.push({ type: "open", session: s, at: open });
      if (close.getTime() > nowMs && close.getTime() - nowMs < lookaheadHours * 3600_000) events.push({ type: "close", session: s, at: close });
    }
  }
  return events.sort((a, b) => a.at.getTime() - b.at.getTime());
}

export function getNextEvent(now: Date = new Date()) {
  const evts = upcomingEvents(now);
  return evts[0] ?? null;
}

export function getOverlaps(active: SessionDef[]): string | null {
  if (active.length < 2) return null;
  // Present the most-traded overlaps by name
  const names = active.map((s) => s.name).sort();
  if (names.includes("London") && names.includes("NewYork")) return "London × NY overlap";
  if (names.includes("Tokyo") && names.includes("London")) return "Tokyo × London overlap";
  if (names.includes("Sydney") && names.includes("Tokyo")) return "Sydney × Tokyo overlap";
  return `${active.length}-session overlap`;
}

/** Progress (0..1) through the active session's window. */
export function getSessionProgress(session: SessionDef, now: Date = new Date()): number {
  const hour = now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600;
  const len = session.endUTC > session.startUTC ? session.endUTC - session.startUTC : 24 - session.startUTC + session.endUTC;
  const elapsed = session.endUTC > session.startUTC
    ? hour - session.startUTC
    : hour >= session.startUTC ? hour - session.startUTC : 24 - session.startUTC + hour;
  return Math.max(0, Math.min(1, elapsed / len));
}

/** Seconds until next forex market open (only meaningful when weekend-closed). */
export function secondsUntilMarketOpen(now: Date = new Date()): number | null {
  if (!isWeekendClosed(now)) return null;
  const day = now.getUTCDay();
  const target = new Date(now);
  if (day === 5) { target.setUTCDate(target.getUTCDate() + 2); target.setUTCHours(22, 0, 0, 0); }
  else if (day === 6) { target.setUTCDate(target.getUTCDate() + 1); target.setUTCHours(22, 0, 0, 0); }
  else /* day === 0 */ { target.setUTCHours(22, 0, 0, 0); }
  return Math.max(0, Math.round((target.getTime() - now.getTime()) / 1000));
}

export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}
