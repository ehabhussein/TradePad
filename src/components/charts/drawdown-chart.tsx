"use client";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatUsd } from "@/lib/utils";

export function DrawdownChart({ data }: { data: { date: string; dd: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--loss))" stopOpacity={0} />
            <stop offset="100%" stopColor="hsl(var(--loss))" stopOpacity={0.6} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis dataKey="date" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
        <Tooltip formatter={(v: number) => [formatUsd(v), "Drawdown"]} />
        <Area type="monotone" dataKey="dd" stroke="hsl(var(--loss))" fill="url(#ddGrad)" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
