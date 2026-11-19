"use client";

import Image from "next/image";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import type { GastoFijo, Profile } from "@/lib/types";

type Fila = { nombre: string; monto: string };

export function Onboarding({
  profile,
  userId,
  onDone,
}: {
  profile: Profile;
  userId: string;
  onDone: (profile: Profile, fijos: GastoFijo[]) => void;
}) {
  const [ingreso, setIngreso] = useState(profile.ingreso_mensual ? String(profile.ingreso_mensual) : "");
  const [pct, setPct] = useState(String(profile.objetivo_ahorro_pct ?? 30));
  const [filas, setFilas] = useState<Fila[]>([{ nombre: "", monto: "" }]);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const ingresoNum = Number(ingreso);
    const pctNum = Number(pct);
    if (!Number.isFinite(ingresoNum) || ingresoNum < 0) {
      setError("El ingreso mensual tiene que ser un número mayor o igual a 0.");
      return;
    }
    if (!Number.isFinite(pctNum) || pctNum < 0 || pctNum > 100) {
      setError("El objetivo de ahorro debe estar entre 0 y 100.");
      return;
    }
    const fijos = filas
      .map((fila) => ({ nombre: fila.nombre.trim(), monto: Number(fila.monto) }))
      .filter((fila) => fila.nombre && Number.isFinite(fila.monto) && fila.monto >= 0);
    if (filas.some((fila) => (fila.nombre.trim() || fila.monto) && (!fila.nombre.trim() || !(Number(fila.monto) >= 0)))) {
      setError("Cada gasto fijo necesita nombre y un monto válido.");
      return;
    }

    setGuardando(true);
    setError(null);
    const supabase = createClient();
    const next: Profile = {
      ...profile,
      ingreso_mensual: ingresoNum,
      objetivo_ahorro_pct: pctNum,
      onboarding_completo: true,
    };
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        ingreso_mensual: ingresoNum,
        objetivo_ahorro_pct: pctNum,
        onboarding_completo: true,
      })
      .eq("id", userId);
    if (profileError) {
      setGuardando(false);
      setError("No se pudo guardar tu presupuesto. Revisa que la migración de perfiles esté aplicada.");
      return;
    }

    let guardados: GastoFijo[] = [];
    if (fijos.length) {
      const { data, error: fijosError } = await supabase
        .from("gastos_fijos")
        .insert(fijos.map((fila) => ({ user_id: userId, nombre: fila.nombre, monto: fila.monto })))
        .select("*");
      if (fijosError) {
        setGuardando(false);
        setError("El ingreso se guardó, pero no los gastos fijos. Puedes añadirlos desde la tarjeta.");
        onDone(next, []);
        return;
      }
      guardados = (data ?? []) as GastoFijo[];
    }
    onDone(next, guardados);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center bg-[#F9FAFB] px-4 py-8">
      <section className="rounded-2xl border border-border bg-white p-6 shadow-card">
        <Image src="/icons/cf.png" alt="" width={48} height={48} className="h-12 w-12 rounded-xl" />
        <h1 className="mt-4 text-2xl font-bold">Hola, {profile.nombre} 👋</h1>
        <p className="mt-1 text-sm text-muted">Configura tu presupuesto. Solo tú vas a ver estos datos.</p>
        <form onSubmit={submit} className="mt-5 space-y-4">
          <div>
            <Label>Ingreso mensual (S/)</Label>
            <Input inputMode="decimal" value={ingreso} onChange={(e) => setIngreso(e.target.value)} placeholder="0.00" required />
          </div>
          <div>
            <Label>Objetivo de ahorro (%)</Label>
            <Input inputMode="decimal" value={pct} onChange={(e) => setPct(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Gastos fijos</Label>
            {filas.map((fila, index) => (
              <div key={index} className="grid grid-cols-[1fr_7rem] gap-2">
                <Input
                  placeholder="Alquiler, luz…"
                  value={fila.nombre}
                  onChange={(e) => setFilas((prev) => prev.map((item, i) => (i === index ? { ...item, nombre: e.target.value } : item)))}
                />
                <Input
                  inputMode="decimal"
                  placeholder="0.00"
                  value={fila.monto}
                  onChange={(e) => setFilas((prev) => prev.map((item, i) => (i === index ? { ...item, monto: e.target.value } : item)))}
                />
              </div>
            ))}
            <button type="button" className="text-sm font-medium" onClick={() => setFilas((prev) => [...prev, { nombre: "", monto: "" }])}>
              + Agregar otro fijo
            </button>
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" className="w-full" disabled={guardando}>
            {guardando ? "Guardando…" : "Empezar"}
          </Button>
        </form>
      </section>
    </main>
  );
}
