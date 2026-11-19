import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractVoucher } from "@/lib/extract-voucher";
import { necesitaRevision } from "@/lib/voucher-schema";
import { esPersonaNatural, resolverCategoria } from "@/lib/categorize";
import type { Categoria } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function redirectTo(request: Request, params: Record<string, string>) {
  const url = new URL("/", request.url);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return NextResponse.redirect(url, 303);
}

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const login = new URL("/login", request.url);
    login.searchParams.set("error", "inicia-sesion");
    return NextResponse.redirect(login, 303);
  }

  const form = await request.formData();
  const file = form.get("voucher");
  if (!(file instanceof File) || file.size === 0) {
    return redirectTo(request, { error: "sin-imagen" });
  }
  if (!file.type.startsWith("image/") && file.type !== "application/octet-stream") {
    return redirectTo(request, { error: "formato" });
  }
  if (file.size > 8 * 1024 * 1024) {
    return redirectTo(request, { error: "tamano" });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = file.type.includes("png") ? "png" : file.type.includes("webp") ? "webp" : "jpg";
  const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
  const { error: uploadError } = await supabase.storage.from("vouchers").upload(path, bytes, {
    contentType: file.type.startsWith("image/") ? file.type : "image/jpeg",
    upsert: false,
  });
  if (uploadError) {
    return redirectTo(request, { error: "storage" });
  }

  const extraction = await extractVoucher({
    bytes,
    mime: file.type.startsWith("image/") ? file.type : "image/jpeg",
  });
  const voucher = extraction.voucher;

  if (voucher?.estado === "fallido") {
    return redirectTo(request, { error: "fallido" });
  }

  if (voucher?.tipo === "ingreso") {
    return redirectTo(request, {
      proponer_ingreso: "1",
      monto: voucher.monto != null ? String(voucher.monto) : "",
      detalle: voucher.detalle || voucher.remitente || "Ingreso",
      banco: voucher.banco || "",
      fecha: voucher.fecha || "",
      hora: (voucher.hora || "").slice(0, 5),
    });
  }

  const { data: reglas } = await supabase
    .from("reglas_categoria")
    .select("destinatario_norm, categoria")
    .eq("user_id", user.id);

  const decision = resolverCategoria({
    banco: voucher?.banco,
    destinatario: voucher?.destinatario,
    detalle: voucher?.detalle,
    sugerenciaModelo: voucher?.categoria_sugerida ?? null,
    reglas: (reglas ?? []) as { destinatario_norm: string; categoria: Categoria }[],
  });

  const pendiente = !voucher || necesitaRevision(voucher) || decision.pedirCategoria;
  const row = {
    user_id: user.id,
    fecha: voucher?.fecha ?? null,
    hora: voucher?.hora ?? null,
    categoria: decision.categoria,
    detalle: voucher?.detalle ?? null,
    banco: voucher?.banco ?? null,
    monto: voucher?.monto ?? null,
    moneda: voucher?.moneda ?? "PEN",
    numero_operacion: voucher?.numero_operacion ?? null,
    destinatario: voucher?.destinatario ?? null,
    remitente: voucher?.remitente ?? null,
    imagen_url: path,
    estado_revision: pendiente ? "pendiente" : "confirmado",
    confianza: voucher?.confianza ?? null,
    tipo: voucher?.tipo ?? "gasto",
    estado_comprobante: voucher?.estado ?? null,
  };

  const { data: inserted, error: insertError } = await supabase.from("expenses").insert(row).select("id").single();

  if (insertError) {
    if (insertError.code === "23505") {
      return redirectTo(request, { error: "duplicado" });
    }
    return redirectTo(request, { error: "guardar" });
  }

  const id = inserted.id as string;
  const params: Record<string, string> = {
    registrado: "1",
    id,
    banco: voucher?.banco || "Gasto",
    monto: voucher?.monto != null ? String(voucher.monto) : "",
  };
  if (pendiente) params.revisar = id;
  if (decision.pedirCategoria || (voucher && esPersonaNatural(voucher.banco, voucher.destinatario) && !decision.categoria)) {
    params.categoria = id;
  }
  return redirectTo(request, params);
}
