import { cn } from "@/lib/utils";
import { type ReactNode } from "react";

const accents = {
  success: "border-l-success",
  danger: "border-l-danger",
  warning: "border-l-warning",
  info: "border-l-info",
  primary: "border-l-black",
} as const;

export function Card({
  children,
  accent = "primary",
  className,
}: {
  children: ReactNode;
  accent?: keyof typeof accents;
  className?: string;
}) {
  return (
    <section className={cn("rounded-2xl border border-border bg-white p-5 shadow-card border-l-4", accents[accent], className)}>
      {children}
    </section>
  );
}
