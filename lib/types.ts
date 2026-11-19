export const CATEGORIAS = ["Gastos fijos", "Fondo emergencia", "Caprichos"] as const;
export type Categoria = (typeof CATEGORIAS)[number];

export type Profile = {
  id: string;
  nombre: string;
  avatar_url: string | null;
  ingreso_mensual: number;
  objetivo_ahorro_pct: number;
  onboarding_completo: boolean;
};

export type GastoFijo = {
  id: string;
  user_id: string;
  nombre: string;
  monto: number;
};

export type MetaAhorro = {
  id: string;
  user_id: string;
  nombre: string;
  objetivo: number;
  actual: number;
};

export type Expense = {
  id: string;
  user_id: string;
  fecha: string | null;
  hora: string | null;
  categoria: Categoria | null;
  detalle: string | null;
  banco: string | null;
  monto: number | null;
  moneda: "PEN" | "USD";
  numero_operacion: string | null;
  destinatario: string | null;
  remitente: string | null;
  imagen_url: string | null;
  estado_revision: "confirmado" | "pendiente";
  confianza: number | null;
  tipo: "gasto" | "ingreso";
  estado_comprobante: "exitoso" | "fallido" | null;
  aplicado_a_ingreso: boolean;
  created_at: string;
};

export type IngresoAdicional = {
  id: string;
  user_id: string;
  fecha: string | null;
  hora: string | null;
  monto: number;
  detalle: string | null;
  origen: string | null;
  created_at: string;
};

export type ReglaCategoria = {
  id: string;
  user_id: string;
  destinatario_norm: string;
  categoria: Categoria;
};
