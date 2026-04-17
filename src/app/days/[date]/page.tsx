import { db } from "@/lib/db";
import { days, trades, screenshots, checklistItems } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { DayEditor } from "./day-editor";

export const dynamic = "force-dynamic";

export default async function DayPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();

  const day = db.select().from(days).where(eq(days.date, date)).get() ?? null;
  const dayTrades = db.select().from(trades).where(eq(trades.dayDate, date)).all();
  const dayScreenshots = db.select().from(screenshots).where(eq(screenshots.dayDate, date)).all();
  const allChecklist = db.select().from(checklistItems).all();

  return <DayEditor date={date} day={day} trades={dayTrades} screenshots={dayScreenshots} checklistItems={allChecklist} />;
}
