import { z } from "zod";
import { normalizarBanco, ORIGENES } from "@/lib/constants";

export const VOUCHER_SYSTEM_PROMPT = `Eres un extractor de comprobantes de pago peruanos (Yape, Plin, BCP, BBVA, Scotiabank, Banco Falabella, Agora/SIP, Interbank). Devuelve SOLO JSON válido con: { banco, monto (number), moneda ('PEN'|'USD'), fecha (ISO YYYY-MM-DD), hora (HH:mm:ss), numero_operacion, destinatario, remitente, detalle, estado ('exitoso'|'fallido'), tipo ('gasto'|'ingreso'), confianza (0-1) }. Si un campo no es legible usa null. No inventes datos. Además incluye categoria_sugerida ('Gastos fijos'|'Fondo emergencia'|'Caprichos'|null) según destinatario y detalle.`;

const emptyToNull = (value: unknown) => {
  if (value === "" || value === undefined) return null;
  return value;
};

const nullableString = z.preprocess(emptyToNull, z.string().trim().nullable());

const nullableNumber = z.preprocess((value) => {
  if (value === "" || value === undefined || value === null) return null;
  if (typeof value === "string") {
    const cleaned = value.replace(/[^\d,.-]/g, "").replace(/\.(?=.*\.)/g, "").replace(",", ".");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : value;
  }
  return value;
}, z.number().nullable());

const nullableFecha = z.preprocess((value) => {
  if (value === "" || value === undefined || value === null) return null;
  if (typeof value !== "string") return value;
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const latam = value.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);
  if (latam) {
    const dd = latam[1].padStart(2, "0");
    const mm = latam[2].padStart(2, "0");
    return `${latam[3]}-${mm}-${dd}`;
  }
  return value;
}, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable());

const nullableHora = z.preprocess((value) => {
  if (value === "" || value === undefined || value === null) return null;
  if (typeof value !== "string") return value;
  const m = value.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return value;
  return `${m[1].padStart(2, "0")}:${m[2]}:${(m[3] ?? "00").padStart(2, "0")}`;
}, z.string().regex(/^\d{2}:\d{2}:\d{2}$/).nullable());

export const voucherSchema = z.object({
  banco: z.preprocess((value) => {
    if (value === "" || value === undefined || value === null) return null;
    if (typeof value !== "string") return value;
    return normalizarBanco(value);
  }, z.enum(ORIGENES).nullable()),
  monto: nullableNumber,
  moneda: z.preprocess(
    (value) => {
      if (value === "" || value === undefined || value === null) return null;
      if (typeof value !== "string") return value;
      const up = value.toUpperCase();
      if (up.includes("USD") || up.includes("DOL")) return "USD";
      if (up.includes("PEN") || up.includes("SOL") || up === "S/") return "PEN";
      return up;
    },
    z.enum(["PEN", "USD"]).nullable()
  ),
  fecha: nullableFecha,
  hora: nullableHora,
  numero_operacion: nullableString,
  destinatario: nullableString,
  remitente: nullableString,
  detalle: nullableString,
  estado: z.preprocess(
    (value) => {
      if (value === "" || value === undefined || value === null) return null;
      if (typeof value !== "string") return value;
      const v = value.toLowerCase();
      if (["exitoso", "exitosa", "ok", "completado", "completada", "aprobado"].includes(v)) return "exitoso";
      if (["fallido", "fallida", "rechazado", "error", "anulado"].includes(v)) return "fallido";
      return v;
    },
    z.enum(["exitoso", "fallido"]).nullable()
  ),
  tipo: z.preprocess(
    (value) => {
      if (value === "" || value === undefined || value === null) return "gasto";
      if (typeof value !== "string") return value;
      const v = value.toLowerCase();
      if (v.includes("ingreso") || v.includes("recib")) return "ingreso";
      return "gasto";
    },
    z.enum(["gasto", "ingreso"])
  ),
  confianza: z.preprocess((value) => {
    if (value === "" || value === undefined || value === null) return null;
    const n = typeof value === "string" ? Number(value) : value;
    return n;
  }, z.number().min(0).max(1).nullable()),
  categoria_sugerida: z.preprocess((value) => {
    if (!value || typeof value !== "string") return null;
    if (value === "Gastos fijos" || value === "Fondo emergencia" || value === "Caprichos") return value;
    return null;
  }, z.enum(["Gastos fijos", "Fondo emergencia", "Caprichos"]).nullable()),
});

export type Voucher = z.infer<typeof voucherSchema>;

export function extractJsonObject(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const source = fenced?.[1] ?? text;
  const start = source.indexOf("{");
  const end = source.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("El modelo no devolvió JSON");
  }
  return JSON.parse(source.slice(start, end + 1)) as unknown;
}

export function parseVoucher(input: unknown) {
  return voucherSchema.parse(input);
}

export function safeParseVoucher(input: unknown) {
  return voucherSchema.safeParse(input);
}

export function necesitaRevision(voucher: Voucher) {
  const confianza = voucher.confianza ?? 0;
  return confianza < 0.7 || voucher.monto == null || voucher.fecha == null;
}
