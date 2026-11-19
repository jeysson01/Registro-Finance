import type { Expense, GastoFijo, MetaAhorro, Profile } from "@/lib/types";

function iso(day: number) {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), day);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export function demoBundle() {
  const profile: Profile = {
    id: "demo",
    nombre: "Jeysson",
    avatar_url: null,
    ingreso_mensual: 5000,
    objetivo_ahorro_pct: 30,
    onboarding_completo: true,
  };
  const gastosFijos: GastoFijo[] = [
    { id: "f1", user_id: "demo", nombre: "Alquiler", monto: 1200 },
    { id: "f2", user_id: "demo", nombre: "Internet", monto: 120 },
  ];
  const metas: MetaAhorro[] = [
    { id: "m1", user_id: "demo", nombre: "Fondo de emergencia", objetivo: 3000, actual: 900 },
  ];
  const expenses: Expense[] = [
    gasto("e1", iso(2), "09:12:00", "Gastos fijos", "Recibo de luz", "BCP", 86, "ENEL", "confirmado", 0.94),
    gasto("e2", iso(4), "13:02:11", "Caprichos", "Café", "Yape", 8, "Cafetería Lima", "confirmado", 0.9),
    gasto("e3", iso(8), "08:40:02", "Caprichos", "Café", "Yape", 7.5, "Cafetería Lima", "confirmado", 0.91),
    gasto("e4", iso(12), "16:18:44", "Caprichos", "Café", "Yape", 9, "Cafetería Lima", "confirmado", 0.88),
    gasto("e5", iso(14), "19:05:10", "Caprichos", "Cine", "Plin", 32, "Cineplanet", "confirmado", 0.86),
    gasto("e6", iso(15), "11:22:00", "Fondo emergencia", "Consulta", "BBVA", 80, "Clínica Internacional", "pendiente", 0.62, "USD"),
  ];
  return { profile, gastosFijos, metas, expenses };
}

function gasto(
  id: string,
  fecha: string,
  hora: string,
  categoria: Expense["categoria"],
  detalle: string,
  banco: string,
  monto: number,
  destinatario: string,
  estado: Expense["estado_revision"],
  confianza: number,
  moneda: Expense["moneda"] = "PEN"
): Expense {
  return {
    id,
    user_id: "demo",
    fecha,
    hora,
    categoria,
    detalle,
    banco,
    monto,
    moneda,
    numero_operacion: id,
    destinatario,
    remitente: "Jeysson",
    imagen_url: null,
    estado_revision: estado,
    confianza,
    tipo: "gasto",
    estado_comprobante: "exitoso",
    aplicado_a_ingreso: false,
    created_at: new Date().toISOString(),
  };
}
