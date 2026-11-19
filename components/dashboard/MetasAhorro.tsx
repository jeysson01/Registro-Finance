"use client";

import { Target } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatSoles } from "@/lib/utils";
import type { MetaAhorro } from "@/lib/types";

export function MetasAhorro({
  metas,
  onAdd,
  onDelete,
  onAportar,
}: {
  metas: MetaAhorro[];
  onAdd: () => void;
  onDelete: (id: string) => void;
  onAportar: (meta: MetaAhorro) => void;
}) {
  return (
    <Card accent="info">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-info" />
          <h3 className="text-base font-semibold">Metas de ahorro</h3>
        </div>
        <Button size="sm" variant="outline" onClick={onAdd}>
          Nueva
        </Button>
      </div>
      <div className="mt-4 space-y-4">
        {metas.length === 0 && <p className="text-sm text-muted">Aún no tienes metas. Crea una, por ejemplo «Fondo de emergencia».</p>}
        {metas.map((meta) => {
          const pct = Math.min(100, (Number(meta.actual) / Number(meta.objetivo)) * 100);
          return (
            <div key={meta.id}>
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="font-medium">{meta.nombre}</span>
                <span className="text-muted">
                  {formatSoles(Number(meta.actual))} / {formatSoles(Number(meta.objetivo))}
                </span>
              </div>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-background">
                <div className="h-full rounded-full bg-info transition-all duration-500" style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-1 flex items-center justify-between">
                <p className="text-xs text-muted">{pct.toFixed(0)}% completado</p>
                <div className="flex gap-2">
                  <button type="button" className="text-xs font-medium text-info" onClick={() => onAportar(meta)}>
                    Aportar
                  </button>
                  <button type="button" className="text-xs text-danger" onClick={() => onDelete(meta.id)}>
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
