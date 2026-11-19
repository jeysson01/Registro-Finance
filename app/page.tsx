import { redirect } from "next/navigation";
import { Dashboard, type Notice } from "@/components/dashboard/Dashboard";
import { demoBundle } from "@/lib/demo-data";
import { asExpense, asGastoFijo, asMeta, asProfile } from "@/lib/normalize";
import { supabaseConfigurado } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import type { Expense, GastoFijo, IngresoAdicional, MetaAhorro } from "@/lib/types";

export const dynamic = "force-dynamic";

function noticeFrom(searchParams: Record<string, string | string[] | undefined>): Notice {
  const one = (key: string) => {
    const value = searchParams[key];
    return Array.isArray(value) ? value[0] : value;
  };
  return {
    registrado: one("registrado"),
    id: one("id"),
    banco: one("banco"),
    monto: one("monto"),
    revisar: one("revisar"),
    categoria: one("categoria"),
    ingreso: one("ingreso"),
    proponer_ingreso: one("proponer_ingreso"),
    detalle: one("detalle"),
    fecha: one("fecha"),
    hora: one("hora"),
    error: one("error"),
    offline: one("offline"),
  };
}

export default async function Home({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const notice = noticeFrom(searchParams);
  const demo = !supabaseConfigurado();

  if (demo) {
    const sample = demoBundle();
    return (
      <Dashboard
        demo
        userId={null}
        profile={sample.profile}
        gastosFijos={sample.gastosFijos}
        metas={sample.metas}
        expenses={sample.expenses}
        ingresosAdicionales={[]}
        notice={notice}
        tab={searchParams.tab === "analisis" || searchParams.tab === "movimientos" ? searchParams.tab : "resumen"}
      />
    );
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let { data: profileRow } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (!profileRow) {
    const meta = user.user_metadata ?? {};
    const nombre =
      (typeof meta.full_name === "string" && meta.full_name) ||
      (typeof meta.name === "string" && meta.name) ||
      user.email?.split("@")[0] ||
      "Usuario";
    const avatar =
      (typeof meta.avatar_url === "string" && meta.avatar_url) ||
      (typeof meta.picture === "string" && meta.picture) ||
      null;
    const created = await supabase
      .from("profiles")
      .insert({ id: user.id, nombre, avatar_url: avatar, ingreso_mensual: 0, objetivo_ahorro_pct: 30, onboarding_completo: false })
      .select("*")
      .single();
    profileRow = created.data;
  }

  const [fijosRes, metasRes, expensesRes, ingresosRes] = await Promise.all([
    supabase.from("gastos_fijos").select("*").eq("user_id", user.id).order("created_at"),
    supabase.from("metas_ahorro").select("*").eq("user_id", user.id).order("created_at"),
    supabase.from("expenses").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    supabase.from("ingresos_adicionales").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
  ]);

  return (
    <Dashboard
      demo={false}
      userId={user.id}
      profile={asProfile({ ...(profileRow ?? {}), id: user.id })}
      gastosFijos={(fijosRes.data ?? []).map((row) => asGastoFijo(row as GastoFijo))}
      metas={(metasRes.data ?? []).map((row) => asMeta(row as MetaAhorro))}
      expenses={(expensesRes.data ?? []).map((row) => asExpense(row as Expense))}
      ingresosAdicionales={(ingresosRes.data ?? []).map((row) => ({
        ...(row as IngresoAdicional),
        monto: Number((row as IngresoAdicional).monto) || 0,
      }))}
      notice={notice}
      tab={searchParams.tab === "analisis" || searchParams.tab === "movimientos" ? searchParams.tab : "resumen"}
    />
  );
}
