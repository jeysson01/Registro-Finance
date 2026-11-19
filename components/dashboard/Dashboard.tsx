"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { BarChart3, LayoutDashboard, Plus, Receipt, Upload } from "lucide-react";
import { UserMenu } from "@/components/auth/UserMenu";
import { Onboarding } from "@/components/auth/Onboarding";
import { createClient } from "@/lib/supabase/client";
import { calcularResumen, detectarFugas, serieDiaria, serieSemanal, sumarGastosDelMes, sumarIngresosDelMes, sumarPorCategoria } from "@/lib/calc";
import { normalizarDestinatario } from "@/lib/categorize";
import { ahoraLima, normalizarBanco, ORIGENES, type Origen } from "@/lib/constants";
import { CATEGORIAS, type Categoria, type Expense, type GastoFijo, type IngresoAdicional, type MetaAhorro, type Profile } from "@/lib/types";
import { formatSoles } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { OrigenSelect } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { DineroSeguro } from "@/components/dashboard/DineroSeguro";
import { KpiGrid } from "@/components/dashboard/KpiGrid";
import { TasaAhorro } from "@/components/dashboard/TasaAhorro";
import { MetasAhorro } from "@/components/dashboard/MetasAhorro";
import { GastosSemana } from "@/components/dashboard/GastosSemana";
import { GastosDiarios } from "@/components/dashboard/GastosDiarios";
import { Desglose } from "@/components/dashboard/Desglose";
import { GastosFuga } from "@/components/dashboard/GastosFuga";
import { TablaGastos } from "@/components/dashboard/TablaGastos";
import { ListaIngresos } from "@/components/dashboard/ListaIngresos";

export type Notice = {
  registrado?: string;
  id?: string;
  banco?: string;
  monto?: string;
  revisar?: string;
  categoria?: string;
  ingreso?: string;
  error?: string;
  offline?: string;
  proponer_ingreso?: string;
  detalle?: string;
  fecha?: string;
  hora?: string;
};

const ERRORES: Record<string, string> = {
  "sin-imagen": "No llegó ninguna imagen.",
  formato: "El archivo tiene que ser una imagen.",
  tamano: "La captura supera 8 MB.",
  storage: "No se pudo guardar la imagen en Storage. Revisa el bucket vouchers.",
  fallido: "El comprobante no está exitoso, así que no se registró.",
  duplicado: "Ese número de operación ya estaba registrado.",
  guardar: "No se pudo guardar el gasto.",
  "inicia-sesion": "Inicia sesión para registrar comprobantes.",
};

type Toast = { id: string; banco: string; monto: string; text?: string };

export function Dashboard({
  demo,
  userId,
  profile: initialProfile,
  gastosFijos: initialFijos,
  metas: initialMetas,
  expenses: initialExpenses,
  ingresosAdicionales: initialIngresos,
  notice,
  tab = "resumen",
}: {
  demo: boolean;
  userId: string | null;
  profile: Profile;
  gastosFijos: GastoFijo[];
  metas: MetaAhorro[];
  expenses: Expense[];
  ingresosAdicionales: IngresoAdicional[];
  notice: Notice;
  tab?: "resumen" | "analisis" | "movimientos";
}) {
  const router = useRouter();
  const [profile, setProfile] = useState(initialProfile);
  const [fijos, setFijos] = useState(initialFijos);
  const [metas, setMetas] = useState(initialMetas);
  const [expenses, setExpenses] = useState(initialExpenses);
  const [ingresos, setIngresos] = useState(initialIngresos);
  const [showExtra, setShowExtra] = useState(false);
  const [editIngreso, setEditIngreso] = useState<IngresoAdicional | null>(null);
  const [propuesta, setPropuesta] = useState<IngresoAdicional | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showIngreso, setShowIngreso] = useState(false);
  const [showFijos, setShowFijos] = useState(false);
  const [showMeta, setShowMeta] = useState(false);
  const [aportar, setAportar] = useState<MetaAhorro | null>(null);
  const opened = useRef(false);

  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    if (notice.registrado === "1" && notice.id) {
      setToast({ id: notice.id, banco: notice.banco || "Gasto", monto: notice.monto || "" });
    }
    if (notice.error) setBanner(ERRORES[notice.error] || "No se pudo registrar el comprobante.");
    if (notice.offline === "1") setBanner("Sin conexión. La captura quedó en cola y se enviará al volver internet.");
    const targetId = notice.revisar || notice.categoria;
    if (targetId) {
      const found = initialExpenses.find((e) => e.id === targetId);
      if (found) setEditing(found);
    }
    if (notice.proponer_ingreso === "1") {
      const actual = ahoraLima();
      setPropuesta({
        id: "propuesta",
        user_id: userId || "demo",
        fecha: notice.fecha || actual.fecha,
        hora: notice.hora || actual.hora,
        monto: Number(notice.monto) || 0,
        detalle: notice.detalle || "Ingreso",
        origen: notice.banco || null,
        created_at: new Date().toISOString(),
      });
    }
    if (!demo && (notice.registrado || notice.error || notice.offline || notice.proponer_ingreso)) router.replace("/");
  }, [demo, initialExpenses, notice, router, userId]);

  useEffect(() => {
    if (demo || !userId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`expenses-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "expenses", filter: `user_id=eq.${userId}` }, async () => {
        const { data } = await supabase.from("expenses").select("*").order("created_at", { ascending: false });
        if (data) setExpenses(data as Expense[]);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "ingresos_adicionales", filter: `user_id=eq.${userId}` }, async () => {
        const { data } = await supabase.from("ingresos_adicionales").select("*").order("created_at", { ascending: false });
        if (data) setIngresos(data as IngresoAdicional[]);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [demo, userId]);

  const resumen = useMemo(() => {
    const porCat = sumarPorCategoria(expenses);
    return calcularResumen({
      ingreso: Number(profile.ingreso_mensual),
      gastosFijos: fijos.reduce((s, g) => s + Number(g.monto), 0),
      objetivoAhorroPct: Number(profile.objetivo_ahorro_pct),
      ingresosAdicionales: sumarIngresosDelMes(ingresos),
      gastadoMes: sumarGastosDelMes(expenses),
      fondoEmergencia: porCat["Fondo emergencia"],
      caprichos: porCat.Caprichos,
    });
  }, [profile, fijos, expenses, ingresos]);

  const db = () => (demo ? null : createClient());

  async function guardarPerfil(next: Profile) {
    setProfile(next);
    const client = db();
    if (!client || !userId) return;
    await client.from("profiles").update({
      ingreso_mensual: next.ingreso_mensual,
      objetivo_ahorro_pct: next.objetivo_ahorro_pct,
      nombre: next.nombre,
    }).eq("id", userId);
  }

  async function aprender(destinatario: string | null, categoria: Categoria) {
    const clave = normalizarDestinatario(destinatario);
    if (!clave || !userId) return;
    const client = db();
    if (!client) return;
    await client.from("reglas_categoria").upsert(
      { user_id: userId, destinatario_norm: clave, categoria },
      { onConflict: "user_id,destinatario_norm" }
    );
  }

  async function guardarGasto(gasto: Expense) {
    setExpenses((prev) => prev.map((e) => (e.id === gasto.id ? gasto : e)));
    const client = db();
    if (!client) return;
    const { id, user_id: _user, created_at: _created, ...patch } = gasto;
    await client.from("expenses").update(patch).eq("id", id);
    if (gasto.categoria) await aprender(gasto.destinatario, gasto.categoria);
  }

  async function eliminarGasto(gasto: Expense) {
    setExpenses((prev) => prev.filter((e) => e.id !== gasto.id));
    const client = db();
    if (!client) return;
    await client.from("expenses").delete().eq("id", gasto.id);
  }

  async function guardarIngreso(input: { id?: string; fecha: string; hora: string; monto: number; detalle: string; origen: string }) {
    const hora = input.hora.length === 5 ? `${input.hora}:00` : input.hora;
    const client = db();
    if (input.id && input.id !== "propuesta") {
      setIngresos((prev) => prev.map((item) => (item.id === input.id ? { ...item, ...input, hora, monto: input.monto } : item)));
      if (client) {
        await client.from("ingresos_adicionales").update({
          fecha: input.fecha,
          hora,
          monto: input.monto,
          detalle: input.detalle || null,
          origen: input.origen || null,
        }).eq("id", input.id);
      }
      return;
    }
    const local: IngresoAdicional = {
      id: crypto.randomUUID(),
      user_id: userId || "demo",
      fecha: input.fecha,
      hora,
      monto: input.monto,
      detalle: input.detalle || null,
      origen: input.origen || null,
      created_at: new Date().toISOString(),
    };
    setIngresos((prev) => [local, ...prev]);
    if (!client || !userId) return;
    const { id: _id, ...row } = local;
    const { data, error } = await client.from("ingresos_adicionales").insert(row).select("*").single();
    if (data) setIngresos((prev) => prev.map((item) => (item.id === local.id ? (data as IngresoAdicional) : item)));
    if (error) setIngresos((prev) => prev.filter((item) => item.id !== local.id));
  }

  async function borrarIngreso(item: IngresoAdicional) {
    setIngresos((prev) => prev.filter((row) => row.id !== item.id));
    const client = db();
    if (client) await client.from("ingresos_adicionales").delete().eq("id", item.id);
  }

  async function agregarGasto(input: { fecha: string; hora: string; categoria: Categoria; detalle: string; banco: string; monto: number; destinatario: string }) {
    const row: Expense = {
      id: crypto.randomUUID(),
      user_id: userId || "demo",
      fecha: input.fecha,
      hora: input.hora.length === 5 ? `${input.hora}:00` : input.hora,
      categoria: input.categoria,
      detalle: input.detalle || null,
      banco: input.banco || "Manual",
      monto: input.monto,
      moneda: "PEN",
      numero_operacion: null,
      destinatario: input.destinatario || null,
      remitente: null,
      imagen_url: null,
      estado_revision: "confirmado",
      confianza: 1,
      tipo: "gasto",
      estado_comprobante: "exitoso",
      aplicado_a_ingreso: false,
      created_at: new Date().toISOString(),
    };
    setExpenses((prev) => [row, ...prev]);
    const client = db();
    if (!client || !userId) {
      setToast({ id: row.id, banco: row.banco || "", monto: String(row.monto), text: "Gasto registrado" });
      return;
    }
    const { id: _localId, ...insertRow } = row;
    const { data, error } = await client.from("expenses").insert(insertRow).select("*").single();
    if (!error && data) {
      setExpenses((prev) => prev.map((e) => (e.id === row.id ? (data as Expense) : e)));
      setToast({ id: (data as Expense).id, banco: row.banco || "", monto: String(row.monto), text: "Gasto registrado" });
    } else if (error) {
      setExpenses((prev) => prev.filter((e) => e.id !== row.id));
      setBanner("No se pudo guardar el gasto.");
    }
  }

  const mes = format(new Date(), "MMMM 'de' yyyy", { locale: es });

  if (!demo && userId && !profile.onboarding_completo) {
    return (
      <Onboarding
        profile={profile}
        userId={userId}
        onDone={(next, nuevos) => {
          setProfile(next);
          if (nuevos.length) setFijos((prev) => [...prev, ...nuevos]);
        }}
      />
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-6xl px-4 pb-28 pt-6">
      <header className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Hola, {profile.nombre} 👋</h1>
          <p className="text-sm text-muted">Resumen financiero de {mes}</p>
        </div>
        {!demo && <UserMenu nombre={profile.nombre} avatarUrl={profile.avatar_url} />}
      </header>

      {banner && (
        <p className="mb-4 rounded-2xl border border-warning bg-warning-light px-4 py-3 text-sm text-warning-dark">{banner}</p>
      )}

      <nav className="sticky top-0 z-30 -mx-4 mb-6 overflow-x-auto border-b border-border bg-[#F9FAFB]/95 px-4 backdrop-blur">
        <div className="flex min-w-max gap-2 py-2">
          {(
            [
              ["resumen", "Resumen", LayoutDashboard],
              ["analisis", "Análisis", BarChart3],
              ["movimientos", "Movimientos", Receipt],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => router.replace(id === "resumen" ? "/" : `/?tab=${id}`, { scroll: false })}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ${
                tab === id ? "bg-black text-white" : "bg-white text-muted"
              }`}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>
      </nav>

      <div className="space-y-6">
        {tab === "resumen" && (
          <>
            <DineroSeguro
              diario={resumen.diario}
              semanal={resumen.semanal}
              saldo={resumen.saldoDisponible}
              dias={resumen.diasRestantes}
              nivel={resumen.nivel}
              sePaso={resumen.sePaso}
            />
            <KpiGrid
              ingreso={resumen.ingreso}
              fijos={resumen.gastosFijos}
              gastado={resumen.gastadoMes}
              ahorro={resumen.ahorroObjetivo}
              detalleIngreso={`Base ${formatSoles(resumen.ingresoBase)} + adicionales ${formatSoles(resumen.ingresosAdicionales)}`}
              onIngreso={() => setShowIngreso(true)}
              onFijos={() => setShowFijos(true)}
            />
            <div className="grid gap-6 lg:grid-cols-2">
              <TasaAhorro real={resumen.tasaAhorroReal} objetivo={resumen.tasaAhorroObjetivo} />
              <MetasAhorro metas={metas} onAdd={() => setShowMeta(true)} onDelete={(id) => void borrarMeta(id)} onAportar={setAportar} />
            </div>
          </>
        )}
        {tab === "analisis" && (
          <>
            <div className="grid gap-6 lg:grid-cols-2">
              <GastosSemana data={serieSemanal(expenses)} />
              <GastosDiarios data={serieDiaria(expenses)} />
            </div>
            <Desglose fijos={resumen.gastosFijos} emergencia={resumen.fondoEmergencia} caprichos={resumen.caprichos} />
          </>
        )}
        {tab === "movimientos" && (
          <>
            <GastosFuga fugas={detectarFugas(expenses)} />
            <TablaGastos expenses={expenses} onEdit={setEditing} onDelete={(g) => void eliminarGasto(g)} />
            <ListaIngresos items={ingresos} onEdit={setEditIngreso} onDelete={(item) => void borrarIngreso(item)} />
          </>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white/95 p-3 backdrop-blur">
        <div className="mx-auto flex max-w-6xl gap-2">
          <Button className="flex-1" variant="outline" onClick={() => setShowUpload(true)}>
            <Upload className="h-4 w-4" /> Subir captura
          </Button>
          <Button className="flex-1" onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4" /> Agregar gasto
          </Button>
          <Button className="flex-1 border-success text-success-dark" variant="outline" onClick={() => setShowExtra(true)}>
            <Plus className="h-4 w-4" /> Ingreso adicional
          </Button>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-20 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center justify-between gap-3 rounded-2xl bg-black px-4 py-3 text-sm text-white shadow-lg">
          <span>
            {toast.text ?? `${toast.banco} · ${toast.monto ? `${formatSoles(Number(toast.monto))} registrado` : "registrado"}`}
          </span>
          <button
            type="button"
            className="font-semibold underline"
            onClick={() => {
              const found = expenses.find((e) => e.id === toast.id);
              if (found) void eliminarGasto(found);
              setToast(null);
            }}
          >
            Deshacer
          </button>
        </div>
      )}

      <GastoForm
        open={showAdd}
        title="Agregar gasto"
        onOpenChange={setShowAdd}
        onSubmit={(values) => {
          void agregarGasto(values);
          setShowAdd(false);
        }}
      />

      <Modal open={showUpload} onOpenChange={setShowUpload} title="Subir captura" description="Comparte o elige la foto del voucher. La leeremos y registraremos el gasto.">
        {demo ? (
          <p className="text-sm text-muted">Conecta Supabase y Anthropic para leer comprobantes. Mientras tanto usa «Agregar gasto».</p>
        ) : (
          <form action="/api/share" method="POST" encType="multipart/form-data" className="space-y-3">
            <Label>Captura del comprobante</Label>
            <Input type="file" name="voucher" accept="image/*" required />
            <Button type="submit" className="w-full">
              Registrar comprobante
            </Button>
          </form>
        )}
      </Modal>

      {editing && (
        <GastoForm
          key={editing.id}
          open
          title={editing.estado_revision === "pendiente" ? "Revisar gasto" : "Editar gasto"}
          initial={editing}
          onOpenChange={(open) => !open && setEditing(null)}
          onSubmit={(values) => {
            void guardarGasto({
              ...editing,
              ...values,
              hora: values.hora || null,
              detalle: values.detalle || null,
              destinatario: values.destinatario || null,
              estado_revision: "confirmado",
            });
            setEditing(null);
          }}
          quick={editing.estado_revision === "pendiente" && !editing.categoria}
        />
      )}

      <IngresoExtraForm
        open={showExtra || Boolean(editIngreso) || Boolean(propuesta)}
        title={propuesta ? "¿Registrar como ingreso adicional?" : editIngreso ? "Editar ingreso" : "Ingreso adicional"}
        description={propuesta ? "Detectamos un abono. Si confirmas, se suma a tu ingreso del mes y no se guarda como gasto." : "Suma un bono, una venta o una propina."}
        initial={editIngreso || propuesta}
        onOpenChange={(open) => {
          if (open) return;
          setShowExtra(false);
          setEditIngreso(null);
          setPropuesta(null);
        }}
        onSubmit={(values) => {
          void guardarIngreso({ ...values, id: editIngreso?.id });
          setShowExtra(false);
          setEditIngreso(null);
          setPropuesta(null);
        }}
      />

      <Modal open={showIngreso} onOpenChange={setShowIngreso} title="Ingreso y meta de ahorro">
        <IngresoForm
          profile={profile}
          onSave={(next) => {
            void guardarPerfil(next);
            setShowIngreso(false);
          }}
        />
      </Modal>

      <Modal open={showFijos} onOpenChange={setShowFijos} title="Gastos fijos">
        <FijosForm
          items={fijos}
          onAdd={async (nombre, monto) => {
            const item: GastoFijo = { id: crypto.randomUUID(), user_id: userId || "demo", nombre, monto };
            setFijos((prev) => [...prev, item]);
            const client = db();
            if (client && userId) {
              const { data } = await client.from("gastos_fijos").insert({ user_id: userId, nombre, monto }).select("*").single();
              if (data) setFijos((prev) => prev.map((f) => (f.id === item.id ? (data as GastoFijo) : f)));
            }
          }}
          onDelete={async (id) => {
            setFijos((prev) => prev.filter((f) => f.id !== id));
            const client = db();
            if (client) await client.from("gastos_fijos").delete().eq("id", id);
          }}
        />
      </Modal>

      <Modal open={showMeta} onOpenChange={setShowMeta} title="Nueva meta">
        <MetaForm
          onSave={async (nombre, objetivo) => {
            const item: MetaAhorro = { id: crypto.randomUUID(), user_id: userId || "demo", nombre, objetivo, actual: 0 };
            setMetas((prev) => [...prev, item]);
            const client = db();
            if (client && userId) {
              const { data } = await client.from("metas_ahorro").insert({ user_id: userId, nombre, objetivo, actual: 0 }).select("*").single();
              if (data) setMetas((prev) => prev.map((m) => (m.id === item.id ? (data as MetaAhorro) : m)));
            }
            setShowMeta(false);
          }}
        />
      </Modal>

      <Modal open={Boolean(aportar)} onOpenChange={(open) => !open && setAportar(null)} title="Aportar a la meta">
        {aportar && (
          <AporteForm
            onSave={async (monto) => {
              const actual = Number(aportar.actual) + monto;
              setMetas((prev) => prev.map((m) => (m.id === aportar.id ? { ...m, actual } : m)));
              const client = db();
              if (client) await client.from("metas_ahorro").update({ actual }).eq("id", aportar.id);
              setAportar(null);
            }}
          />
        )}
      </Modal>
    </div>
  );

  async function borrarMeta(id: string) {
    setMetas((prev) => prev.filter((m) => m.id !== id));
    const client = db();
    if (client) await client.from("metas_ahorro").delete().eq("id", id);
  }
}

function GastoForm({
  open,
  title,
  initial,
  quick,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  title: string;
  initial?: Expense;
  quick?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: { fecha: string; hora: string; categoria: Categoria; detalle: string; banco: string; monto: number; destinatario: string }) => void;
}) {
  const ahora = ahoraLima();
  const [fecha, setFecha] = useState(initial?.fecha || ahora.fecha);
  const [hora, setHora] = useState(initial?.hora?.slice(0, 5) || ahora.hora);
  const [categoria, setCategoria] = useState<Categoria>(initial?.categoria || "Caprichos");
  const [detalle, setDetalle] = useState(initial?.detalle || "");
  const [banco, setBanco] = useState<Origen | "">(normalizarBanco(initial?.banco) || "");
  const [monto, setMonto] = useState(initial?.monto != null ? String(initial.monto) : "");
  const [destinatario, setDestinatario] = useState(initial?.destinatario || "");
  const [errores, setErrores] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    const actual = ahoraLima();
    setFecha(initial?.fecha || actual.fecha);
    setHora(initial?.hora?.slice(0, 5) || actual.hora);
    setCategoria(initial?.categoria || "Caprichos");
    setDetalle(initial?.detalle || "");
    setBanco(normalizarBanco(initial?.banco) || "");
    setMonto(initial?.monto != null ? String(initial.monto) : "");
    setDestinatario(initial?.destinatario || "");
    setErrores({});
  }, [open, initial]);

  function validar(cat: Categoria = categoria) {
    const siguientes: Record<string, string> = {};
    if (!fecha) siguientes.fecha = "Elige la fecha.";
    if (!/^\d{2}:\d{2}/.test(hora)) siguientes.hora = "La hora debe tener formato HH:mm.";
    if (!cat) siguientes.categoria = "Elige una categoría.";
    const numero = Number(monto);
    if (!monto.trim() || !Number.isFinite(numero) || numero <= 0) siguientes.monto = "El monto debe ser mayor a 0.";
    if (!ORIGENES.includes(banco as Origen)) siguientes.banco = "Elige un origen de la lista.";
    setErrores(siguientes);
    return Object.keys(siguientes).length === 0;
  }

  function send(cat: Categoria = categoria) {
    if (!validar(cat)) return;
    onSubmit({ fecha, hora: hora.slice(0, 5), categoria: cat, detalle, banco, monto: Number(monto), destinatario });
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={title} description="Completa o corrige los datos del movimiento.">
      {quick && (
        <div className="mb-4 grid grid-cols-1 gap-2">
          <p className="text-sm text-muted">Elige la categoría con un toque:</p>
          {CATEGORIAS.map((c) => (
            <Button key={c} variant={c === categoria ? "default" : "outline"} onClick={() => send(c)}>
              {c}
            </Button>
          ))}
        </div>
      )}
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>Fecha</Label>
            <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
            {errores.fecha && <p className="mt-1 text-xs text-danger">{errores.fecha}</p>}
          </div>
          <div>
            <Label>Hora</Label>
            <Input type="time" value={hora} onChange={(e) => setHora(e.target.value)} required />
            {errores.hora && <p className="mt-1 text-xs text-danger">{errores.hora}</p>}
          </div>
        </div>
        <div>
          <Label>Categoría</Label>
          <Select value={categoria} onChange={(e) => setCategoria(e.target.value as Categoria)}>
            {CATEGORIAS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
          {errores.categoria && <p className="mt-1 text-xs text-danger">{errores.categoria}</p>}
        </div>
        <div>
          <Label>Monto (S/)</Label>
          <Input inputMode="decimal" value={monto} onChange={(e) => setMonto(e.target.value)} required />
          {errores.monto && <p className="mt-1 text-xs text-danger">{errores.monto}</p>}
        </div>
        <div>
          <Label>Detalle</Label>
          <Input value={detalle} onChange={(e) => setDetalle(e.target.value)} />
        </div>
        <div>
          <Label>Origen / banco</Label>
          <OrigenSelect value={banco} onValueChange={(valor) => setBanco(valor as Origen)} options={ORIGENES} />
          {errores.banco && <p className="mt-1 text-xs text-danger">{errores.banco}</p>}
        </div>
        <div>
          <Label>Destinatario</Label>
          <Input value={destinatario} onChange={(e) => setDestinatario(e.target.value)} />
        </div>
        <Button type="submit" className="w-full">
          Guardar
        </Button>
      </form>
    </Modal>
  );
}

function IngresoForm({ profile, onSave }: { profile: Profile; onSave: (profile: Profile) => void }) {
  const [nombre, setNombre] = useState(profile.nombre);
  const [ingreso, setIngreso] = useState(String(profile.ingreso_mensual));
  const [pct, setPct] = useState(String(profile.objetivo_ahorro_pct));
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ ...profile, nombre, ingreso_mensual: Number(ingreso) || 0, objetivo_ahorro_pct: Number(pct) || 0 });
      }}
    >
      <div>
        <Label>Nombre</Label>
        <Input value={nombre} onChange={(e) => setNombre(e.target.value)} />
      </div>
      <div>
        <Label>Ingreso mensual (S/)</Label>
        <Input inputMode="decimal" value={ingreso} onChange={(e) => setIngreso(e.target.value)} />
      </div>
      <div>
        <Label>Objetivo de ahorro (%)</Label>
        <Input inputMode="decimal" value={pct} onChange={(e) => setPct(e.target.value)} />
      </div>
      <Button type="submit" className="w-full">
        Guardar
      </Button>
    </form>
  );
}

function FijosForm({ items, onAdd, onDelete }: { items: GastoFijo[]; onAdd: (nombre: string, monto: number) => void; onDelete: (id: string) => void }) {
  const [nombre, setNombre] = useState("");
  const [monto, setMonto] = useState("");
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.id} className="flex items-center justify-between rounded-xl bg-background px-3 py-2 text-sm">
          <span>{item.nombre}</span>
          <span className="flex items-center gap-3">
            {formatSoles(Number(item.monto))}
            <button type="button" className="text-danger" onClick={() => onDelete(item.id)}>
              Quitar
            </button>
          </span>
        </div>
      ))}
      <form
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          onAdd(nombre, Number(monto) || 0);
          setNombre("");
          setMonto("");
        }}
      >
        <Input placeholder="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
        <Input placeholder="Monto" inputMode="decimal" value={monto} onChange={(e) => setMonto(e.target.value)} required />
        <Button type="submit" className="w-full">
          Agregar fijo
        </Button>
      </form>
    </div>
  );
}

function MetaForm({ onSave }: { onSave: (nombre: string, objetivo: number) => void }) {
  const [nombre, setNombre] = useState("");
  const [objetivo, setObjetivo] = useState("");
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(nombre, Number(objetivo) || 0);
      }}
    >
      <Input placeholder="Nombre de la meta" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
      <Input placeholder="Objetivo (S/)" inputMode="decimal" value={objetivo} onChange={(e) => setObjetivo(e.target.value)} required />
      <Button type="submit" className="w-full">
        Crear meta
      </Button>
    </form>
  );
}

function AporteForm({ onSave }: { onSave: (monto: number) => void }) {
  const [monto, setMonto] = useState("");
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(Number(monto) || 0);
      }}
    >
      <Input placeholder="Monto a aportar" inputMode="decimal" value={monto} onChange={(e) => setMonto(e.target.value)} required />
      <Button type="submit" className="w-full">
        Aportar
      </Button>
    </form>
  );
}

function IngresoExtraForm({
  open,
  title,
  description,
  initial,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  title: string;
  description?: string;
  initial?: IngresoAdicional | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: { fecha: string; hora: string; monto: number; detalle: string; origen: string }) => void;
}) {
  const actual = ahoraLima();
  const [fecha, setFecha] = useState(initial?.fecha || actual.fecha);
  const [hora, setHora] = useState(initial?.hora?.slice(0, 5) || actual.hora);
  const [monto, setMonto] = useState(initial?.monto ? String(initial.monto) : "");
  const [detalle, setDetalle] = useState(initial?.detalle || "");
  const [origen, setOrigen] = useState<Origen | "">(normalizarBanco(initial?.origen) || "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const ahora = ahoraLima();
    setFecha(initial?.fecha || ahora.fecha);
    setHora(initial?.hora?.slice(0, 5) || ahora.hora);
    setMonto(initial?.monto ? String(initial.monto) : "");
    setDetalle(initial?.detalle || "");
    setOrigen(normalizarBanco(initial?.origen) || "");
    setError(null);
  }, [open, initial]);

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={title} description={description}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          const numero = Number(monto);
          if (!fecha) {
            setError("Elige la fecha.");
            return;
          }
          if (!/^\d{2}:\d{2}/.test(hora)) {
            setError("La hora debe tener formato HH:mm.");
            return;
          }
          if (!Number.isFinite(numero) || numero <= 0) {
            setError("El monto debe ser mayor a 0.");
            return;
          }
          if (!ORIGENES.includes(origen as Origen)) {
            setError("Elige un origen de la lista.");
            return;
          }
          onSubmit({ fecha, hora: hora.slice(0, 5), monto: numero, detalle, origen });
        }}
      >
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>Fecha</Label>
            <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
          </div>
          <div>
            <Label>Hora</Label>
            <Input type="time" value={hora} onChange={(e) => setHora(e.target.value)} required />
          </div>
        </div>
        <div>
          <Label>Monto (S/)</Label>
          <Input inputMode="decimal" value={monto} onChange={(e) => setMonto(e.target.value)} required />
        </div>
        <div>
          <Label>Detalle</Label>
          <Input value={detalle} onChange={(e) => setDetalle(e.target.value)} placeholder="Venta, bono, propina…" />
        </div>
        <div>
          <Label>Origen</Label>
          <OrigenSelect value={origen} onValueChange={(valor) => setOrigen(valor as Origen)} options={ORIGENES} />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" className="w-full">
          {initial?.id === "propuesta" ? "Registrar ingreso" : "Guardar"}
        </Button>
      </form>
    </Modal>
  );
}
