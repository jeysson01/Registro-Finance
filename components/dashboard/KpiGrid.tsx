import { Home, PiggyBank, ShoppingBag, Wallet } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatSoles } from "@/lib/utils";

const items = [
  { key: "ingreso", label: "Ingreso mensual", accent: "primary" as const, iconBg: "bg-black text-white", Icon: Wallet },
  { key: "fijos", label: "Gastos fijos", accent: "danger" as const, iconBg: "bg-danger-light text-danger", Icon: Home },
  { key: "gastado", label: "Gastado este mes", accent: "warning" as const, iconBg: "bg-warning-light text-warning-dark", Icon: ShoppingBag },
  { key: "ahorro", label: "Ahorro objetivo", accent: "success" as const, iconBg: "bg-success-light text-success-dark", Icon: PiggyBank },
];

export function KpiGrid({
  ingreso,
  fijos,
  gastado,
  ahorro,
  onIngreso,
  onFijos,
  detalleIngreso,
}: {
  ingreso: number;
  fijos: number;
  gastado: number;
  ahorro: number;
  onIngreso: () => void;
  onFijos: () => void;
  detalleIngreso?: string;
}) {
  const values = { ingreso, fijos, gastado, ahorro };
  const clicks = { ingreso: onIngreso, fijos: onFijos, gastado: undefined, ahorro: onIngreso };
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => {
        const click = clicks[item.key as keyof typeof clicks];
        return (
          <Card key={item.key} accent={item.accent}>
            <button type="button" onClick={click} disabled={!click} className="flex w-full items-center gap-3 text-left disabled:cursor-default">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.iconBg}`}>
                <item.Icon className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-sm text-muted">{item.label}</span>
                <span className="block text-2xl font-bold">{formatSoles(values[item.key as keyof typeof values])}</span>
                {item.key === "ingreso" && detalleIngreso && (
                  <span className="mt-0.5 block text-xs text-muted">{detalleIngreso}</span>
                )}
              </span>
            </button>
          </Card>
        );
      })}
    </div>
  );
}
