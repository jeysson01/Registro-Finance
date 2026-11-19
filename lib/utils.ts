import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const soles = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  minimumFractionDigits: 2,
});

const dolares = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

export function formatMoney(amount: number, moneda: "PEN" | "USD" = "PEN") {
  const value = Number.isFinite(amount) ? amount : 0;
  return moneda === "USD" ? dolares.format(value) : soles.format(value);
}

export function formatSoles(amount: number) {
  return formatMoney(amount, "PEN");
}
