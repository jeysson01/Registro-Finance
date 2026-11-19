import { AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatSoles } from "@/lib/utils";
import type { Fuga } from "@/lib/calc";

export function GastosFuga({ fugas }: { fugas: Fuga[] }) {
  const total = fugas.reduce((sum, f) => sum + f.total, 0);
  return (
    <Card accent="warning">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-warning-dark" />
          <h3 className="text-base font-semibold">Gastos fuga</h3>
        </div>
        <Badge variant="warning">{formatSoles(total)} /mes</Badge>
      </div>
      <p className="mt-1 text-sm text-muted">Micro-gastos recurrentes que se acumulan sin que te des cuenta</p>
      <div className="mt-4 space-y-2">
        {fugas.length === 0 && <p className="text-sm text-muted">No hay gastos fuga detectados este mes 🎉</p>}
        {fugas.map((fuga) => (
          <div key={fuga.clave} className="flex items-center justify-between rounded-xl bg-warning-light px-3 py-2.5">
            <div>
              <p className="text-sm font-medium">{fuga.detalle}</p>
              <p className="text-xs text-muted">{fuga.veces} veces este mes</p>
            </div>
            <span className="text-sm font-semibold">{formatSoles(fuga.total)}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
