import { VOUCHER_SYSTEM_PROMPT, extractJsonObject, safeParseVoucher, type Voucher } from "@/lib/voucher-schema";

export type ExtractionResult = {
  voucher: Voucher | null;
  raw: string;
  source: "anthropic" | "tesseract" | "none";
  error?: string;
};

const MEDIA: Record<string, "image/jpeg" | "image/png" | "image/gif" | "image/webp"> = {
  "image/jpeg": "image/jpeg",
  "image/jpg": "image/jpeg",
  "image/png": "image/png",
  "image/gif": "image/gif",
  "image/webp": "image/webp",
};

export async function extractVoucher(file: { bytes: Buffer; mime: string }): Promise<ExtractionResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) {
    try {
      const voucher = await extractWithAnthropic(file, apiKey);
      return { voucher, raw: JSON.stringify(voucher), source: "anthropic" };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Anthropic falló";
      const fallback = await extractWithTesseract(file.bytes);
      if (fallback.voucher) return { ...fallback, error: message };
      return { voucher: null, raw: "", source: "anthropic", error: message };
    }
  }
  return extractWithTesseract(file.bytes);
}

async function extractWithAnthropic(file: { bytes: Buffer; mime: string }, apiKey: string): Promise<Voucher> {
  const media = MEDIA[file.mime] ?? "image/jpeg";
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 800,
      system: VOUCHER_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: media, data: file.bytes.toString("base64") },
            },
            { type: "text", text: "Extrae el comprobante. Responde solo con el JSON." },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Anthropic ${response.status}: ${body.slice(0, 300)}`);
  }

  const payload = (await response.json()) as { content?: { type: string; text?: string }[] };
  const text = payload.content?.find((c) => c.type === "text")?.text ?? "";
  const json = extractJsonObject(text);
  const parsed = safeParseVoucher(json);
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join("; "));
  }
  return parsed.data;
}

async function extractWithTesseract(bytes: Buffer): Promise<ExtractionResult> {
  try {
    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker("spa");
    const { data } = await worker.recognize(bytes);
    await worker.terminate();
    const text = data.text ?? "";
    const voucher = voucherFromOcr(text);
    const parsed = safeParseVoucher(voucher);
    if (!parsed.success) return { voucher: null, raw: text, source: "tesseract", error: "OCR ilegible" };
    return { voucher: parsed.data, raw: text, source: "tesseract" };
  } catch (error) {
    return {
      voucher: null,
      raw: "",
      source: "tesseract",
      error: error instanceof Error ? error.message : "OCR no disponible",
    };
  }
}

export function voucherFromOcr(text: string): unknown {
  const montoMatch = text.match(/(?:s\/\.?|pen|soles)\s*([0-9]+[.,][0-9]{2})/i) ?? text.match(/([0-9]+[.,][0-9]{2})/);
  const fecha = text.match(/(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{4})/) ?? text.match(/(\d{4}-\d{2}-\d{2})/);
  const hora = text.match(/(\d{1,2}:\d{2}(?::\d{2})?)/);
  const operacion = text.match(/(?:operaci[oó]n|nro\.?|n[uú]mero)\s*[:#]?\s*([A-Z0-9-]{4,})/i);
  const lower = text.toLowerCase();
  let banco: string | null = null;
  for (const name of ["Yape", "Plin", "BCP", "BBVA", "Scotiabank", "Interbank", "Falabella", "Agora"]) {
    if (lower.includes(name.toLowerCase())) {
      banco = name;
      break;
    }
  }
  const fallido = /rechaz|fallid|no se pudo|anulad/.test(lower);
  const ingreso = /te yape[oó]|recibiste|abono recibido|te pline/.test(lower);
  return {
    banco,
    monto: montoMatch ? montoMatch[1] : null,
    moneda: /usd|d[oó]lar/.test(lower) ? "USD" : "PEN",
    fecha: fecha ? fecha[1] : null,
    hora: hora ? hora[1] : null,
    numero_operacion: operacion ? operacion[1] : null,
    destinatario: null,
    remitente: null,
    detalle: null,
    estado: fallido ? "fallido" : montoMatch ? "exitoso" : null,
    tipo: ingreso ? "ingreso" : "gasto",
    confianza: montoMatch && fecha ? 0.55 : 0.3,
    categoria_sugerida: null,
  };
}
