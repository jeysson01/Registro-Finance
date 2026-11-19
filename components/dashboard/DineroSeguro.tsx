"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, Flame } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatSoles } from "@/lib/utils";
import type { NivelPresupuesto } from "@/lib/calc";

function useAnimatedNumber(value: number) {
  const [display, setDisplay] = useState(value);
  const from = useRef(value);

  useEffect(() => {
    const start = from.current;
    const t0 = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / 500);
      setDisplay(start + (value - start) * p);
      if (p < 1) frame = requestAnimationFrame(tick);
      else from.current = value;
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return display;
}

const temas: Record<NivelPresupuesto, { card: string; text: string; box: string; icon: string }> = {
  verde: { card: "border-l-success bg-success-light/40", text: "text-foreground", box: "bg-success-light", icon: "text-success" },
  ambar: { card: "border-l-warning bg-warning-light/60", text: "text-foreground", box: "bg-warning-light", icon: "text-warning-dark" },
  rojo: { card: "border-l-danger bg-danger-light/50", text: "text-danger", box: "bg-danger-light", icon: "text-danger" },
};

export function DineroSeguro({
  diario,
  semanal,
  saldo,
  dias,
  nivel,
  sePaso,
}: {
  diario: number;
  semanal: number;
  saldo: number;
  dias: number;
  nivel: NivelPresupuesto;
  sePaso: boolean;
}) {
  const animado = useAnimatedNumber(diario);
  const tema = temas[nivel];
  return (
    <Card accent="success" className={`transition-colors duration-500 ${tema.card}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Flame className={`h-5 w-5 ${tema.icon}`} />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Dinero seguro para quemar</h2>
          </div>
          <p className={`mt-3 text-4xl font-bold transition-colors duration-500 sm:text-5xl ${tema.text}`}>
            {formatSoles(animado)}
            <span className="text-lg font-normal text-muted"> /día</span>
          </p>
          <p className="mt-2 text-sm text-muted sm:text-base">{formatSoles(semanal)} esta semana sin comprometer tu ahorro</p>
          {sePaso && <p className="mt-2 text-sm font-medium text-danger">Te pasaste del presupuesto</p>}
        </div>
        <div className={`rounded-xl px-4 py-3 text-center ${tema.box}`}>
          <CalendarDays className={`mx-auto h-5 w-5 ${tema.icon}`} />
          <p className="mt-1 text-xs text-muted">Días restantes</p>
          <p className="text-xl font-bold">{dias}</p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between rounded-xl bg-white/80 px-4 py-2">
        <span className="text-sm text-muted">Saldo disponible del mes</span>
        <span className={`text-sm font-semibold ${sePaso ? "text-danger" : "text-success"}`}>{formatSoles(saldo)}</span>
      </div>
    </Card>
  );
}
