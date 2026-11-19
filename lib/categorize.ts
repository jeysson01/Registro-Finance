import type { Categoria } from "@/lib/types";

const FIJOS = [
  /alquiler/,
  /renta/,
  /luz\b/,
  /enel/,
  /luz del sur/,
  /hidrandina/,
  /sedapal/,
  /\bagua\b/,
  /internet/,
  /movistar/,
  /claro/,
  /entel/,
  /bitel/,
  /win\b/,
  /netflix/,
  /spotify/,
  /disney/,
  /hbo/,
  /seguro/,
  /rimac/,
  /pac[ií]fico/,
  /colegio/,
  /universidad/,
  /sunat/,
  /predial/,
];

const EMERGENCIA = [
  /cl[ií]nica/,
  /hospital/,
  /farmacia/,
  /inkafarma/,
  /mifarma/,
  /emergencia/,
  /m[eé]dic/,
  /doctor/,
  /essalud/,
  /dental/,
  /laboratorio/,
];

const EMPRESA = [
  /\bs\.?a\.?c\.?\b/,
  /\be\.?i\.?r\.?l\.?\b/,
  /\bs\.?a\.?\b/,
  /\bsrl\b/,
  /plaza vea/,
  /tottus/,
  /wong/,
  /metro/,
  /oechsle/,
  /saga/,
  /ripley/,
  /falabella/,
  /rappi/,
  /pedidosya/,
  /uber/,
  /indrive/,
  /primax/,
  /grifo/,
];

export function normalizarDestinatario(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function esPersonaNatural(banco: string | null | undefined, destinatario: string | null | undefined) {
  const b = (banco ?? "").toLowerCase();
  if (!b.includes("yape") && !b.includes("plin")) return false;
  const nombre = (destinatario ?? "").trim();
  if (nombre.length < 5) return false;
  const norm = normalizarDestinatario(nombre);
  if (EMPRESA.some((r) => r.test(norm)) || FIJOS.some((r) => r.test(norm)) || EMERGENCIA.some((r) => r.test(norm))) {
    return false;
  }
  const partes = nombre.split(/\s+/).filter(Boolean);
  return partes.length >= 2 && partes.every((p) => /^[A-Za-zÁÉÍÓÚÑáéíóúñ.'-]+$/.test(p));
}

export function sugerirCategoria(texto: string): Categoria | null {
  const norm = normalizarDestinatario(texto);
  if (!norm) return null;
  if (EMERGENCIA.some((r) => r.test(norm))) return "Fondo emergencia";
  if (FIJOS.some((r) => r.test(norm))) return "Gastos fijos";
  if (EMPRESA.some((r) => r.test(norm))) return "Caprichos";
  return null;
}

export function resolverCategoria(input: {
  banco?: string | null;
  destinatario?: string | null;
  detalle?: string | null;
  sugerenciaModelo?: Categoria | null;
  reglas?: { destinatario_norm: string; categoria: Categoria }[];
}): { categoria: Categoria | null; pedirCategoria: boolean } {
  const clave = normalizarDestinatario(input.destinatario);
  const regla = clave ? input.reglas?.find((r) => r.destinatario_norm === clave) : undefined;
  if (regla) return { categoria: regla.categoria, pedirCategoria: false };

  const porTexto = sugerirCategoria(`${input.destinatario ?? ""} ${input.detalle ?? ""}`);
  if (porTexto) return { categoria: porTexto, pedirCategoria: false };

  if (input.sugerenciaModelo) return { categoria: input.sugerenciaModelo, pedirCategoria: false };

  if (esPersonaNatural(input.banco, input.destinatario)) {
    return { categoria: null, pedirCategoria: true };
  }

  return { categoria: "Caprichos", pedirCategoria: false };
}
