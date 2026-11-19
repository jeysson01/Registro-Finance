"use client";

import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "@/components/ui/card";
import { formatSoles } from "@/lib/utils";
import type { PuntoDia } from "@/lib/calc";

export function GastosDiarios({ data }: { data: PuntoDia[] }) {
  return (
    <Card accent="success">
      <h3 className="text-base font-semibold">Gastos diarios</h3>
      <p className="mt-1 text-sm text-muted">Monto gastado en los últimos 7 días (un punto por día)</p>
      <div className="mt-4 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="fecha" tick={{ fontSize: 10, fill: "#6B7280" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} tickFormatter={(v) => `S/${v}`} />
            <Tooltip formatter={(value) => formatSoles(Number(value))} />
            <Legend formatter={(value) => (value === "monto" ? "Monto (S/)" : "Tendencia")} wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="monto" name="monto" fill="#059669" radius={[4, 4, 0, 0]} barSize={22} isAnimationActive animationDuration={500} />
            <Line dataKey="monto" name="tendencia" stroke="#111827" strokeWidth={2} dot={{ r: 3, fill: "#111827" }} isAnimationActive animationDuration={500} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
