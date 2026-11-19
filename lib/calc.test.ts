import { describe, expect, it } from "vitest";
import { calcularResumen, detectarFugas, diasRestantesDelMes, serieDiaria, serieSemanal } from "@/lib/calc";

describe("calcularResumen", () => {
  const fecha = new Date(2026, 9, 16); // 16 oct 2026 → 16 días restantes (31-16+1)

  it("calcula saldo, diario y semanal", () => {
    const r = calcularResumen({
      ingreso: 5000,
      gastosFijos: 1500,
      objetivoAhorroPct: 30,
      gastadoMes: 400,
      fecha,
    });
    expect(r.ahorroObjetivo).toBe(1500);
    expect(r.saldoDisponible).toBe(1600);
    expect(r.diasRestantes).toBe(16);
    expect(r.diario).toBeCloseTo(100);
    expect(r.semanal).toBeCloseTo(700);
    expect(r.sePaso).toBe(false);
    expect(r.nivel).toBe("verde");
    expect(r.ingresoBase).toBe(5000);
    expect(r.ingresosAdicionales).toBe(0);
  });

  it("suma los ingresos adicionales y recalcula el ahorro sobre el total", () => {
    const r = calcularResumen({
      ingreso: 5000,
      ingresosAdicionales: 500,
      gastosFijos: 1500,
      objetivoAhorroPct: 30,
      gastadoMes: 400,
      fecha,
    });
    expect(r.ingreso).toBe(5500);
    expect(r.ahorroObjetivo).toBe(1650);
    expect(r.saldoDisponible).toBe(1950);
    expect(r.diario).toBeCloseTo(1950 / 16);
  });

  it("marca presupuesto excedido y deja el diario en cero", () => {
    const r = calcularResumen({
      ingreso: 3000,
      gastosFijos: 1200,
      objetivoAhorroPct: 30,
      gastadoMes: 2000,
      fecha,
    });
    expect(r.saldoDisponible).toBeLessThan(0);
    expect(r.diario).toBe(0);
    expect(r.semanal).toBe(0);
    expect(r.sePaso).toBe(true);
    expect(r.nivel).toBe("rojo");
  });

  it("baja a ámbar cuando queda entre 20% y 50% del ritmo diario", () => {
    // Presupuesto variable = 5000 - 1000 - 1500 = 2500. Diario base = 2500/31 ≈ 80.65
    // Saldo = 2500 - 2100 = 400. Diario actual = 400/16 = 25. Ratio ≈ 0.31 → ámbar
    const r = calcularResumen({
      ingreso: 5000,
      gastosFijos: 1000,
      objetivoAhorroPct: 30,
      gastadoMes: 2100,
      fecha,
    });
    expect(r.nivel).toBe("ambar");
  });

  it("nunca divide entre cero el último día del mes", () => {
    expect(diasRestantesDelMes(new Date(2026, 9, 31))).toBe(1);
  });
});

describe("fugas y series", () => {
  const ref = new Date(2026, 9, 16);

  it("agrupa microgastos repetidos bajo S/ 15", () => {
    const base = { tipo: "gasto" as const, moneda: "PEN" as const, estado_comprobante: "exitoso" as const, destinatario: null };
    const fugas = detectarFugas(
      [
        { ...base, monto: 8, fecha: "2026-10-01", detalle: "Café" },
        { ...base, monto: 7.5, fecha: "2026-10-03", detalle: "Café" },
        { ...base, monto: 9, fecha: "2026-10-10", detalle: "café" },
        { ...base, monto: 40, fecha: "2026-10-02", detalle: "Supermercado" },
        { ...base, monto: 5, fecha: "2026-10-04", detalle: "Propina" },
      ],
      ref
    );
    expect(fugas).toHaveLength(1);
    expect(fugas[0].clave).toBe("café");
    expect(fugas[0].veces).toBe(3);
    expect(fugas[0].total).toBeCloseTo(24.5);
  });

  it("arma 7 puntos diarios y semanales", () => {
    const dias = serieDiaria(
      [{ fecha: "2026-10-16", monto: 25, tipo: "gasto", estado_comprobante: "exitoso" }],
      ref
    );
    expect(dias).toHaveLength(7);
    expect(dias[6].monto).toBe(25);
    expect(dias[6].fecha).toBe("16-oct.");

    const semanas = serieSemanal(
      [{ fecha: "2026-10-16", tipo: "gasto", estado_comprobante: "exitoso" }],
      ref
    );
    expect(semanas).toHaveLength(7);
    expect(semanas[6].cantidad).toBe(1);
    expect(semanas[6].semana).toMatch(/oct\./);
  });
});
