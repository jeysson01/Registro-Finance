export const BANCOS = ["BCP", "Falabella", "Scotiabank", "Yape", "SIP", "BBVA"] as const;
export const ORIGEN_OTRO = "Efectivo / Otro" as const;
export const ORIGENES = [...BANCOS, ORIGEN_OTRO] as const;
export type Banco = (typeof BANCOS)[number];
export type Origen = (typeof ORIGENES)[number];

export function normalizarBanco(value: string | null | undefined): Origen | null {
  if (!value?.trim()) return null;
  const texto = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (texto.includes("yape")) return "Yape";
  if (texto.includes("falabella")) return "Falabella";
  if (texto.includes("scotia")) return "Scotiabank";
  if (texto.includes("bbva")) return "BBVA";
  if (texto.includes("agora") || texto.includes("sip")) return "SIP";
  if (texto.includes("bcp") || texto.includes("banco de credito")) return "BCP";
  if (texto.includes("efectivo") || texto.includes("otro")) return ORIGEN_OTRO;
  return ORIGEN_OTRO;
}

export function ahoraLima(fecha = new Date()) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(fecha);
  const valor = (tipo: string) => partes.find((parte) => parte.type === tipo)?.value ?? "";
  return {
    fecha: `${valor("year")}-${valor("month")}-${valor("day")}`,
    hora: `${valor("hour")}:${valor("minute")}`,
  };
}
