"use client";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function RHistogram({ data }: { data: { bucket: string; count: number; r: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data}>
        <XAxis dataKey="bucket" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis fontSize={11} tickLine={false} axisLine={false} />
        <Tooltip formatter={(v: number) => [`${v} trades`, "Count"]} />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.r >= 0 ? "hsl(var(--profit))" : "hsl(var(--loss))"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
