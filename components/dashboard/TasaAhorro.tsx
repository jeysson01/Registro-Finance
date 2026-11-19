"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function TasaAhorro({ real, objetivo }: { real: number; objetivo: number }) {
  const mostrado = Math.max(0, Math.min(real, 100));
  const data = [
    { name: "Ahorrado", value: mostrado },
    { name: "Restante", value: Math.max(0, 100 - mostrado) },
  ];
  const enMeta = real >= objetivo;
  return (
    <Card accent="warning">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold">Tasa de ahorro</h3>
        <Badge variant="warning">Objetivo: {objetivo.toFixed(1)}%</Badge>
      </div>
      <div className="mt-4 flex items-center gap-4">
        <div className="h-40 w-40 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" innerRadius={48} outerRadius={68} strokeWidth={0} isAnimationActive animationDuration={500}>
                {data.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? "#059669" : "#E5E7EB"} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div>
          <p className="text-3xl font-bold">{real.toFixed(1)}%</p>
          <p className="text-sm text-muted">Ahorro real este mes</p>
          <div className="mt-3 space-y-1.5 text-xs text-muted">
            <p className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-success" /> Ahorrado ({real.toFixed(1)}%)
            </p>
            <p className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-border" /> Meta ({objetivo.toFixed(0)}%)
            </p>
            {!enMeta && <p>Todavía no llegas a la meta de este mes.</p>}
          </div>
        </div>
      </div>
    </Card>
  );
}
