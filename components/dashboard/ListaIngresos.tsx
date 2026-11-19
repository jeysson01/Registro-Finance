"use client";

import { Pencil, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatSoles } from "@/lib/utils";
import type { IngresoAdicional } from "@/lib/types";

export function ListaIngresos({
  items,
  onEdit,
  onDelete,
}: {
  items: IngresoAdicional[];
  onEdit: (item: IngresoAdicional) => void;
  onDelete: (item: IngresoAdicional) => void;
}) {
  const mes = new Date();
  const prefijo = `${mes.getFullYear()}-${String(mes.getMonth() + 1).padStart(2, "0")}`;
  const delMes = items.filter((item) => item.fecha?.startsWith(prefijo));

  return (
    <Card accent="success">
      <h3 className="text-base font-semibold">Ingresos adicionales</h3>
      <p className="mt-1 text-sm text-muted">Bonos, ventas y abonos de este mes. Se suman al ingreso antes de calcular el ahorro.</p>
      <div className="mt-4 space-y-2">
        {delMes.length === 0 && <p className="text-sm text-muted">No hay ingresos adicionales este mes.</p>}
        {delMes.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl bg-success-light px-3 py-2.5">
            <div>
              <p className="text-sm font-medium">{item.detalle || "Ingreso"}</p>
              <p className="text-xs text-muted">
                {item.fecha} {item.hora?.slice(0, 5)} · {item.origen || "Sin origen"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="success">{formatSoles(Number(item.monto))}</Badge>
              <button type="button" aria-label="Editar ingreso" className="rounded-lg p-1.5 hover:bg-white" onClick={() => onEdit(item)}>
                <Pencil className="h-4 w-4" />
              </button>
              <button type="button" aria-label="Eliminar ingreso" className="rounded-lg p-1.5 text-danger hover:bg-white" onClick={() => onDelete(item)}>
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
