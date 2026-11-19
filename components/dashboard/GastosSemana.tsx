"use client";

import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "@/components/ui/card";
import type { PuntoSemana } from "@/lib/calc";

export function GastosSemana({ data }: { data: PuntoSemana[] }) {
  return (
    <Card accent="info">
      <h3 className="text-base font-semibold">Gastos por semana</h3>
      <p className="mt-1 text-sm text-muted">Conteo de gastos en las últimas 7 semanas (7 días por punto)</p>
      <div className="mt-4 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="semana" tick={{ fontSize: 10, fill: "#6B7280" }} interval={0} angle={-28} textAnchor="end" height={58} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} />
            <Tooltip />
            <Legend formatter={(value) => (value === "cantidad" ? "Cantidad" : "Tendencia")} wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="cantidad" name="cantidad" fill="#2563EB" radius={[4, 4, 0, 0]} barSize={22} isAnimationActive animationDuration={500} />
            <Line dataKey="cantidad" name="tendencia" stroke="#059669" strokeWidth={2} dot={{ r: 3, fill: "#059669" }} isAnimationActive animationDuration={500} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
