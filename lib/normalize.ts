import type { Expense, GastoFijo, MetaAhorro, Profile, ReglaCategoria } from "@/lib/types";

export function asProfile(row: Partial<Profile> & { id: string }): Profile {
  return {
    id: row.id,
    nombre: row.nombre || "Usuario",
    avatar_url: row.avatar_url ?? null,
    ingreso_mensual: Number(row.ingreso_mensual) || 0,
    objetivo_ahorro_pct: Number(row.objetivo_ahorro_pct ?? 30),
    onboarding_completo: Boolean(row.onboarding_completo),
  };
}

export function asGastoFijo(row: GastoFijo): GastoFijo {
  return { ...row, monto: Number(row.monto) || 0 };
}

export function asMeta(row: MetaAhorro): MetaAhorro {
  return { ...row, objetivo: Number(row.objetivo) || 0, actual: Number(row.actual) || 0 };
}

export function asExpense(row: Expense): Expense {
  return {
    ...row,
    monto: row.monto == null ? null : Number(row.monto),
    confianza: row.confianza == null ? null : Number(row.confianza),
    aplicado_a_ingreso: Boolean(row.aplicado_a_ingreso),
    moneda: row.moneda === "USD" ? "USD" : "PEN",
    tipo: row.tipo === "ingreso" ? "ingreso" : "gasto",
    estado_revision: row.estado_revision === "pendiente" ? "pendiente" : "confirmado",
  };
}

export function asRegla(row: ReglaCategoria): ReglaCategoria {
  return row;
}
