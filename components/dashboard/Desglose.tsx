"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "@/components/ui/card";
import { formatSoles } from "@/lib/utils";

export function Desglose({ fijos, emergencia, caprichos }: { fijos: number; emergencia: number; caprichos: number }) {
  const data = [
    { name: "Gastos fijos", monto: fijos, color: "#111827" },
    { name: "Fondo emergencia", monto: emergencia, color: "#2563EB" },
    { name: "Caprichos", monto: caprichos, color: "#059669" },
  ];
  return (
    <Card accent="primary">
      <h3 className="text-base font-semibold">Desglose macro del ingreso</h3>
      <p className="mt-1 text-sm text-muted">Ingresos – Ahorro = Gastos disponibles</p>
      <div className="mt-4 h-44">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 12 }}>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} />
            <Tooltip formatter={(value) => formatSoles(Number(value))} />
            <Bar dataKey="monto" radius={[0, 6, 6, 0]} barSize={22} isAnimationActive animationDuration={500}>
              {data.map((item) => (
                <Cell key={item.name} fill={item.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {data.map((item) => (
          <div key={item.name} className="rounded-xl bg-background p-2 text-center">
            <p className="text-xs text-muted">{item.name}</p>
            <p className="text-sm font-semibold">{formatSoles(item.monto)}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
