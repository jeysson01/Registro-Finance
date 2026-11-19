import { describe, expect, it } from "vitest";
import { necesitaRevision, parseVoucher } from "@/lib/voucher-schema";

const yape = {
  banco: "Yape",
  monto: 25,
  moneda: "PEN",
  fecha: "2026-10-16",
  hora: "14:32:08",
  numero_operacion: "YAPE-918273",
  destinatario: "María López",
  remitente: "Jeysson Ayala",
  detalle: "Almuerzo",
  estado: "exitoso",
  tipo: "gasto",
  confianza: 0.93,
  categoria_sugerida: null,
};

const bcp = {
  banco: "BCP",
  monto: "150.50",
  moneda: "S/",
  fecha: "16/10/2026",
  hora: "09:15",
  numero_operacion: "00491822",
  destinatario: "ENEL DISTRIBUCIÓN PERÚ",
  remitente: "Jeysson Ayala",
  detalle: "Pago de servicio de luz",
  estado: "completado",
  tipo: "gasto",
  confianza: "0.88",
};

const bbva = {
  banco: "BBVA",
  monto: 80,
  moneda: "USD",
  fecha: "2026-10-02",
  hora: "18:01:00",
  numero_operacion: "BBVA-2201",
  destinatario: "Clínica Internacional",
  remitente: null,
  detalle: "Consulta",
  estado: "exitoso",
  tipo: "gasto",
  confianza: 0.62,
  categoria_sugerida: "Fondo emergencia",
};

describe("parser Zod de vouchers", () => {
  it("acepta un Yape limpio", () => {
    const v = parseVoucher(yape);
    expect(v.banco).toBe("Yape");
    expect(v.monto).toBe(25);
    expect(v.moneda).toBe("PEN");
    expect(v.estado).toBe("exitoso");
    expect(necesitaRevision(v)).toBe(false);
  });

  it("normaliza un BCP con monto texto, fecha latina y hora corta", () => {
    const v = parseVoucher(bcp);
    expect(v.monto).toBeCloseTo(150.5);
    expect(v.moneda).toBe("PEN");
    expect(v.fecha).toBe("2026-10-16");
    expect(v.hora).toBe("09:15:00");
    expect(v.estado).toBe("exitoso");
    expect(v.confianza).toBeCloseTo(0.88);
    expect(necesitaRevision(v)).toBe(false);
  });

  it("marca un BBVA de baja confianza para revisión", () => {
    const v = parseVoucher(bbva);
    expect(v.moneda).toBe("USD");
    expect(v.categoria_sugerida).toBe("Fondo emergencia");
    expect(necesitaRevision(v)).toBe(true);
  });

  it("normaliza alias de bancos al origen del formulario", () => {
    expect(parseVoucher({ ...yape, banco: "Banco Falabella" }).banco).toBe("Falabella");
    expect(parseVoucher({ ...bbva, banco: "BBVA Continental" }).banco).toBe("BBVA");
    expect(parseVoucher({ ...yape, banco: "Agora" }).banco).toBe("SIP");
    expect(parseVoucher({ ...bcp, banco: "Scotiabank" }).banco).toBe("Scotiabank");
  });

  it("rechaza un JSON sin la forma esperada", () => {
    expect(() => parseVoucher({ monto: "no-es-numero", estado: "quizas" })).toThrow();
  });
});
