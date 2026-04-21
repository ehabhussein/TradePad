/**
 * Forex market sessions.
 *
 * Canonical session windows (GMT / standard time):
 *   Sydney   22:00 – 07:00 UTC  (10 PM – 7 AM GMT)
 *   Tokyo    00:00 – 09:00 UTC  (midnight – 9 AM GMT)  -- no DST
 *   London   08:00 – 17:00 UTC  (8 AM  – 5 PM GMT)
 *   NewYork  13:00 – 22:00 UTC  (8 AM  – 5 PM ET)
 *
 * Daylight saving shifts each region by -1 hour in UTC terms:
 *   Europe  (London)  BST  — last Sun Mar → last Sun Oct
 *   US      (NY)      EDT  — 2nd  Sun Mar → 1st  Sun Nov
 *   Aus     (Sydney)  AEDT — 1st  Sun Oct → 1st  Sun Apr  (opposite hemisphere)
 *
 * Japan has no DST.
 *
 * During Europe-DST (what BabyPips tables call "summer"), London is actually
 * 07:00–16:00 UTC even though London locals still call it "08:00–17:00" in
 * their wall-clock time. We compute both so the UI can show both.
 */

export type SessionName = "Sydney" | "Tokyo" | "London" | "NewYork";
type DstRegion = "eu" | "us" | "au" | "none";

export type SessionDef = {
  name: SessionName;
  label: string;
  /** Canonical GMT open hour (0-23). */
  gmtOpen: number;
  /** Canonical GMT close hour (0-23). If < open the window wraps midnight. */
  gmtClose: number;
  dst: DstRegion;
  tz: string; // IANA identifier for rendering local clock
  tint: string;
  code: string;
};

export const SESSIONS: SessionDef[] = [
  { name: "Sydney",  label: "Sydney",   gmtOpen: 22, gmtClose: 7,  dst: "au",   tz: "Australia/Sydney",   tint: "from-emerald-500 to-emerald-500/60", code: "S" },
  { name: "Tokyo",   label: "Tokyo",    gmtOpen: 0,  gmtClose: 9,  dst: "none", tz: "Asia/Tokyo",         tint: "from-rose-500 to-rose-500/60",       code: "T" },
  { name: "London",  label: "London",   gmtOpen: 8,  gmtClose: 17, dst: "eu",   tz: "Europe/London",      tint: "from-sky-500 to-sky-500/60",         code: "L" },
  { name: "NewYork", label: "New York", gmtOpen: 13, gmtClose: 22, dst: "us",   tz: "America/New_York",   tint: "from-violet-500 to-violet-500/60",   code: "N" },
];

/* ---------- DST calendar helpers (pure, no libs) ---------- */

/** Returns the Date of the Nth (1-indexed) Sunday of `month` in `year`, at 01:00 UTC. */
function nthSunday(year: number, month: number, n: number): number {
  // month: 0=Jan..11=Dec
  const first = new Date(Date.UTC(year, month, 1));
  const offset = (7 - first.getUTCDay()) % 7; // days to first Sunday
  const day = 1 + offset + (n - 1) * 7;
  return Date.UTC(year, month, day, 1, 0, 0, 0);
}

function lastSunday(year: number, month: number): number {
  const lastOfMonth = new Date(Date.UTC(year, month + 1, 0));
  const day = lastOfMonth.getUTCDate() - lastOfMonth.getUTCDay();
  return Date.UTC(year, month, day, 1, 0, 0, 0);
}

function isEuropeDST(d: Date): boolean {
  const y = d.getUTCFullYear();
  return d.getTime() >= lastSunday(y, 2) && d.getTime() < lastSunday(y, 9);
}

function isUSDST(d: Date): boolean {
  const y = d.getUTCFullYear();
  return d.getTime() >= nthSunday(y, 2, 2) && d.getTime() < nthSunday(y, 10, 1);
}

function isAustraliaDST(d: Date): boolean {
  // AEDT is in effect from 1st Sun of Oct to 1st Sun of Apr. Wraps calendar year.
  const y = d.getUTCFullYear();
  const start = nthSunday(y, 9, 1);     // 1st Sun Oct, this year
  const end = nthSunday(y, 3, 1);       // 1st Sun Apr, this year
  if (d.getTime() < end) return true;   // Jan 1 → Apr transition → AEDT
  if (d.getTime() >= start) return true;// Oct transition → end of year → AEDT
  return false;
}

/** How many hours to shift canonical GMT windows for each region's DST. */
function dstShift(region: DstRegion, at: Date): number {
  if (region === "eu" && isEuropeDST(at)) return -1;
  if (region === "us" && isUSDST(at)) return -1;
  if (region === "au" && isAustraliaDST(at)) return -1;
  return 0;
}

/* ---------- Effective UTC window resolution ---------- */

export type EffectiveWindow = { startUTC: number; endUTC: number; shiftedForDST: boolean };

export function getEffectiveWindow(session: SessionDef, at: Date): EffectiveWindow {
  const shift = dstShift(session.dst, at);
  return {
    startUTC: (session.gmtOpen + shift + 24) % 24,
    endUTC: (session.gmtClose + shift + 24) % 24,
    shiftedForDST: shift !== 0,
  };
}

function hourInWindow(hour: number, start: number, end: number): boolean {
  if (start === end) return false;
  if (start < end) return hour >= start && hour < end;
  return hour >= start || hour < end;
}

/* ---------- Public API ---------- */

export function isWeekendClosed(now: Date): boolean {
  const day = now.getUTCDay();
  const hour = now.getUTCHours();
  if (day === 5 && hour >= 22) return true;
  if (day === 6) return true;
  if (day === 0 && hour < 22) return true;
  return false;
}

export function getActiveSessions(now: Date = new Date()): SessionDef[] {
  if (isWeekendClosed(now)) return [];
  const hour = now.getUTCHours();
  return SESSIONS.filter((s) => {
    const w = getEffectiveWindow(s, now);
    return hourInWindow(hour, w.startUTC, w.endUTC);
  });
}

/** Progress (0..1) through the active session's effective window. */
export function getSessionProgress(session: SessionDef, now: Date = new Date()): number {
  const w = getEffectiveWindow(session, now);
  const hour = now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600;
  const len = w.endUTC > w.startUTC ? w.endUTC - w.startUTC : 24 - w.startUTC + w.endUTC;
  const elapsed = w.endUTC > w.startUTC
    ? hour - w.startUTC
    : hour >= w.startUTC ? hour - w.startUTC : 24 - w.startUTC + hour;
  return Math.max(0, Math.min(1, elapsed / len));
}

/* ---------- Formatting helpers ---------- */

/** Format a UTC hour integer as HH:00 in the user's local tz. */
export function formatInUserLocal(utcHour: number, now: Date, timeZone?: string): string {
  // Build a Date for today at `utcHour` UTC, then format in the target zone.
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), utcHour, 0, 0, 0));
  return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", hour12: false, timeZone }).format(d);
}

export function formatUTCHour(h: number): string {
  return `${String(h).padStart(2, "0")}:00`;
}

/* ---------- Event timeline ---------- */

export type SessionEvent = { type: "open" | "close"; session: SessionDef; at: Date };

function todayUTCBase(now: Date, dayOffset: number): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + dayOffset));
}

export function upcomingEvents(now: Date, lookaheadHours = 48): SessionEvent[] {
  const events: SessionEvent[] = [];
  const nowMs = now.getTime();
  const horizon = nowMs + lookaheadHours * 3600_000;

  for (let dayOffset = -1; dayOffset <= 2; dayOffset++) {
    const base = todayUTCBase(now, dayOffset);
    for (const s of SESSIONS) {
      const w = getEffectiveWindow(s, base);
      const open = new Date(base); open.setUTCHours(w.startUTC, 0, 0, 0);
      // If window wraps midnight, close lands the next day.
      const closeDayOffset = w.endUTC <= w.startUTC ? dayOffset + 1 : dayOffset;
      const close = todayUTCBase(now, closeDayOffset);
      close.setUTCHours(w.endUTC, 0, 0, 0);

      if (open.getTime() > nowMs && open.getTime() < horizon) events.push({ type: "open", session: s, at: open });
      if (close.getTime() > nowMs && close.getTime() < horizon) events.push({ type: "close", session: s, at: close });
    }
  }
  return events.sort((a, b) => a.at.getTime() - b.at.getTime());
}

export function getNextEvent(now: Date = new Date()): SessionEvent | null {
  return upcomingEvents(now)[0] ?? null;
}

export function getOverlaps(active: SessionDef[]): string | null {
  if (active.length < 2) return null;
  const names = new Set(active.map((s) => s.name));
  if (names.has("London") && names.has("NewYork")) return "London × New York overlap";
  if (names.has("Tokyo") && names.has("London")) return "Tokyo × London overlap";
  if (names.has("Sydney") && names.has("Tokyo")) return "Sydney × Tokyo overlap";
  return `${active.length}-session overlap`;
}

/* ---------- Weekend countdown ---------- */

export function secondsUntilMarketOpen(now: Date = new Date()): number | null {
  if (!isWeekendClosed(now)) return null;
  const day = now.getUTCDay();
  const target = new Date(now);
  if (day === 5) { target.setUTCDate(target.getUTCDate() + 2); target.setUTCHours(22, 0, 0, 0); }
  else if (day === 6) { target.setUTCDate(target.getUTCDate() + 1); target.setUTCHours(22, 0, 0, 0); }
  else { target.setUTCHours(22, 0, 0, 0); }
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
