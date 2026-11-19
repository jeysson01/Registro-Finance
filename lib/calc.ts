import type { Expense } from "@/lib/types";

export type NivelPresupuesto = "verde" | "ambar" | "rojo";

export type Resumen = {
  ingreso: number;
  ingresoBase: number;
  ingresosAdicionales: number;
  gastosFijos: number;
  ahorroObjetivo: number;
  gastadoMes: number;
  saldoDisponible: number;
  diario: number;
  semanal: number;
  diasRestantes: number;
  diasDelMes: number;
  sePaso: boolean;
  nivel: NivelPresupuesto;
  tasaAhorroReal: number;
  tasaAhorroObjetivo: number;
  fondoEmergencia: number;
  caprichos: number;
};

const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "set", "oct", "nov", "dic"];

export function startOfDay(fecha: Date) {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
}

export function diasDelMes(fecha: Date) {
  return new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0).getDate();
}

/** Incluye el día de hoy. Nunca devuelve 0 para no dividir el saldo entre cero. */
export function diasRestantesDelMes(fecha: Date) {
  const ultimo = diasDelMes(fecha);
  const restantes = ultimo - fecha.getDate() + 1;
  return Math.max(restantes, 1);
}

export function esDelMes(fechaIso: string | null, ref: Date) {
  if (!fechaIso) return false;
  const [y, m] = fechaIso.split("-").map(Number);
  return y === ref.getFullYear() && m === ref.getMonth() + 1;
}

export function sumarIngresosDelMes(
  ingresos: { monto: number | null; fecha: string | null }[],
  ref = new Date()
) {
  return ingresos.reduce((sum, ingreso) => {
    if (!esDelMes(ingreso.fecha, ref)) return sum;
    return sum + (Number(ingreso.monto) || 0);
  }, 0);
}

export function calcularResumen(input: {
  ingreso: number;
  ingresosAdicionales?: number;
  gastosFijos: number;
  objetivoAhorroPct: number;
  gastadoMes: number;
  fondoEmergencia?: number;
  caprichos?: number;
  fecha?: Date;
}): Resumen {
  const fecha = input.fecha ?? new Date();
  const ingresoBase = Number(input.ingreso) || 0;
  const adicionales = Number(input.ingresosAdicionales) || 0;
  const ingreso = ingresoBase + adicionales;
  const gastosFijos = Number(input.gastosFijos) || 0;
  const pct = Number(input.objetivoAhorroPct) || 0;
  const gastadoMes = Number(input.gastadoMes) || 0;
  const ahorroObjetivo = ingreso * (pct / 100);
  const saldoDisponible = ingreso - gastosFijos - ahorroObjetivo - gastadoMes;
  const diasRestantes = diasRestantesDelMes(fecha);
  const dias = diasDelMes(fecha);
  const diario = Math.max(0, saldoDisponible / diasRestantes);
  const semanal = diario * 7;
  const sePaso = saldoDisponible < 0;

  const presupuestoVariable = ingreso - gastosFijos - ahorroObjetivo;
  const diarioBase = presupuestoVariable > 0 ? presupuestoVariable / dias : 0;
  const ratio = diarioBase > 0 ? diario / diarioBase : saldoDisponible > 0 ? 1 : 0;

  let nivel: NivelPresupuesto = "verde";
  if (sePaso || ratio < 0.2) nivel = "rojo";
  else if (ratio < 0.5) nivel = "ambar";

  const ahorroRealMonto = ingreso - gastosFijos - gastadoMes;
  const tasaAhorroReal = ingreso > 0 ? (ahorroRealMonto / ingreso) * 100 : 0;

  return {
    ingreso,
    ingresoBase,
    ingresosAdicionales: adicionales,
    gastosFijos,
    ahorroObjetivo,
    gastadoMes,
    saldoDisponible,
    diario,
    semanal,
    diasRestantes,
    diasDelMes: dias,
    sePaso,
    nivel,
    tasaAhorroReal,
    tasaAhorroObjetivo: pct,
    fondoEmergencia: input.fondoEmergencia ?? 0,
    caprichos: input.caprichos ?? 0,
  };
}

export function sumarGastosDelMes(expenses: Pick<Expense, "monto" | "fecha" | "tipo" | "estado_comprobante">[], ref = new Date()) {
  return expenses.reduce((sum, e) => {
    if (e.tipo === "ingreso") return sum;
    if (e.estado_comprobante === "fallido") return sum;
    if (!esDelMes(e.fecha, ref)) return sum;
    return sum + (Number(e.monto) || 0);
  }, 0);
}

export function sumarPorCategoria(
  expenses: Pick<Expense, "monto" | "fecha" | "tipo" | "categoria" | "estado_comprobante">[],
  ref = new Date()
) {
  const totales = { "Gastos fijos": 0, "Fondo emergencia": 0, Caprichos: 0 };
  for (const e of expenses) {
    if (e.tipo === "ingreso" || e.estado_comprobante === "fallido") continue;
    if (!esDelMes(e.fecha, ref) || !e.categoria) continue;
    totales[e.categoria] += Number(e.monto) || 0;
  }
  return totales;
}

function normalizarClave(detalle: string | null, destinatario: string | null) {
  const raw = (detalle || destinatario || "").trim().toLowerCase();
  return raw.replace(/\s+/g, " ");
}

export type Fuga = {
  clave: string;
  veces: number;
  total: number;
  detalle: string;
};

/** Micro-gastos < S/ 15 repetidos 3+ veces en el mes, mismo detalle o destinatario. */
export function detectarFugas(
  expenses: Pick<Expense, "monto" | "fecha" | "tipo" | "detalle" | "destinatario" | "moneda" | "estado_comprobante">[],
  ref = new Date()
): Fuga[] {
  const grupos = new Map<string, Fuga>();
  for (const e of expenses) {
    if (e.tipo === "ingreso" || e.estado_comprobante === "fallido") continue;
    if (e.moneda && e.moneda !== "PEN") continue;
    if (!esDelMes(e.fecha, ref)) continue;
    const monto = Number(e.monto) || 0;
    if (monto <= 0 || monto >= 15) continue;
    const clave = normalizarClave(e.detalle, e.destinatario);
    if (!clave) continue;
    const prev = grupos.get(clave) ?? { clave, veces: 0, total: 0, detalle: e.detalle || e.destinatario || clave };
    prev.veces += 1;
    prev.total += monto;
    grupos.set(clave, prev);
  }
  return [...grupos.values()].filter((g) => g.veces >= 3).sort((a, b) => b.total - a.total);
}

function etiquetaDia(fecha: Date) {
  const d = String(fecha.getDate()).padStart(2, "0");
  return `${d}-${MESES_CORTOS[fecha.getMonth()]}.`;
}

export function etiquetaRango(inicio: Date, fin: Date) {
  return `${etiquetaDia(inicio)} - ${etiquetaDia(fin)}`;
}

export type PuntoSemana = { semana: string; cantidad: number; inicio: string; fin: string };
export type PuntoDia = { fecha: string; dia: string; monto: number };

export function serieSemanal(
  expenses: Pick<Expense, "fecha" | "tipo" | "estado_comprobante">[],
  ref = new Date()
): PuntoSemana[] {
  const hoy = startOfDay(ref);
  const puntos: PuntoSemana[] = [];
  for (let i = 6; i >= 0; i--) {
    const fin = new Date(hoy);
    fin.setDate(hoy.getDate() - i * 7);
    const inicio = new Date(fin);
    inicio.setDate(fin.getDate() - 6);
    const cantidad = expenses.filter((e) => {
      if (e.tipo === "ingreso" || e.estado_comprobante === "fallido" || !e.fecha) return false;
      const f = startOfDay(new Date(`${e.fecha}T12:00:00`));
      return f >= inicio && f <= fin;
    }).length;
    puntos.push({
      semana: etiquetaRango(inicio, fin),
      cantidad,
      inicio: inicio.toISOString().slice(0, 10),
      fin: fin.toISOString().slice(0, 10),
    });
  }
  return puntos;
}

export function serieDiaria(
  expenses: Pick<Expense, "fecha" | "monto" | "tipo" | "estado_comprobante">[],
  ref = new Date()
): PuntoDia[] {
  const hoy = startOfDay(ref);
  const puntos: PuntoDia[] = [];
  for (let i = 6; i >= 0; i--) {
    const dia = new Date(hoy);
    dia.setDate(hoy.getDate() - i);
    const iso = `${dia.getFullYear()}-${String(dia.getMonth() + 1).padStart(2, "0")}-${String(dia.getDate()).padStart(2, "0")}`;
    const monto = expenses.reduce((sum, e) => {
      if (e.tipo === "ingreso" || e.estado_comprobante === "fallido") return sum;
      if (e.fecha !== iso) return sum;
      return sum + (Number(e.monto) || 0);
    }, 0);
    puntos.push({
      fecha: etiquetaDia(dia),
      dia: iso,
      monto: Math.round(monto * 100) / 100,
    });
  }
  return puntos;
}
