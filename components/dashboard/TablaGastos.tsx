"use client";

import { useMemo, useState } from "react";
import { Pencil, Search, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/input";
import { ORIGENES } from "@/lib/constants";
import { CATEGORIAS, type Expense } from "@/lib/types";
import { formatMoney } from "@/lib/utils";

const PAGE = 8;

export function TablaGastos({
  expenses,
  onEdit,
  onDelete,
}: {
  expenses: Expense[];
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
}) {
  const [q, setQ] = useState("");
  const [categoria, setCategoria] = useState("");
  const [banco, setBanco] = useState("");
  const [page, setPage] = useState(0);

  const filtrados = useMemo(() => {
    return expenses.filter((e) => {
      if (categoria && e.categoria !== categoria) return false;
      if (banco && e.banco !== banco) return false;
      if (q && !(e.detalle || "").toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [expenses, q, categoria, banco]);

  const pages = Math.max(1, Math.ceil(filtrados.length / PAGE));
  const slice = filtrados.slice(page * PAGE, page * PAGE + PAGE);

  return (
    <Card accent="primary">
      <h3 className="text-base font-semibold">Gastos recientes</h3>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            placeholder="Buscar en detalle…"
            value={q}
            className="pl-9"
            onChange={(e) => {
              setQ(e.target.value);
              setPage(0);
            }}
          />
        </div>
        <Select
          value={categoria}
          className="sm:w-52"
          onChange={(e) => {
            setCategoria(e.target.value);
            setPage(0);
          }}
        >
          <option value="">Todas las categorías</option>
          {CATEGORIAS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        <Select
          value={banco}
          className="sm:w-44"
          onChange={(e) => {
            setBanco(e.target.value);
            setPage(0);
          }}
        >
          <option value="">Todos los bancos</option>
          {ORIGENES.map((origen) => (
            <option key={origen} value={origen}>
              {origen}
            </option>
          ))}
        </Select>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              {["Fecha", "Hora", "Categoría", "Detalle", "Origen", "Monto", ""].map((h) => (
                <th key={h} className="pb-2 pr-3 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.length === 0 && (
              <tr>
                <td colSpan={7} className="py-6 text-center text-muted">
                  No hay gastos con ese filtro.
                </td>
              </tr>
            )}
            {slice.map((g) => (
              <tr key={g.id} className="border-b border-border/70">
                <td className="py-2.5 pr-3 text-muted">{g.fecha ?? "—"}</td>
                <td className="py-2.5 pr-3 text-muted">{g.hora ? g.hora.slice(0, 8) : "—"}</td>
                <td className="py-2.5 pr-3">
                  <span className="mr-2">{g.categoria ?? "Sin categoría"}</span>
                  {g.estado_revision === "pendiente" && <Badge variant="warning">Revisar</Badge>}
                  {g.tipo === "ingreso" && <Badge variant="success">Ingreso</Badge>}
                </td>
                <td className="py-2.5 pr-3">{g.detalle || g.destinatario || "—"}</td>
                <td className="py-2.5 pr-3">
                  <Badge variant="info">{g.banco || "Manual"}</Badge>
                </td>
                <td className="py-2.5 pr-3 text-right font-semibold">{g.monto == null ? "—" : formatMoney(Number(g.monto), g.moneda)}</td>
                <td className="py-2.5">
                  <div className="flex justify-end gap-1">
                    <button type="button" aria-label="Editar" className="rounded-lg p-1.5 hover:bg-background" onClick={() => onEdit(g)}>
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button type="button" aria-label="Eliminar" className="rounded-lg p-1.5 text-danger hover:bg-danger-light" onClick={() => onDelete(g)}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center justify-between text-sm text-muted">
        <span>
          {filtrados.length} movimiento{filtrados.length === 1 ? "" : "s"}
        </span>
        <div className="flex gap-2">
          <button type="button" className="rounded-lg border border-border px-3 py-1 disabled:opacity-40" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            Anterior
          </button>
          <span className="py-1">
            {page + 1} / {pages}
          </span>
          <button type="button" className="rounded-lg border border-border px-3 py-1 disabled:opacity-40" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>
            Siguiente
          </button>
        </div>
      </div>
    </Card>
  );
}
