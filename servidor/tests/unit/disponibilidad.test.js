import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  aMinutos,
  aHora,
  fechaDeHoy,
  calcularHoras,
} = require("../../src/utils/disponibilidad");

describe("utils/disponibilidad", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 24, 10, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("convierte entre HH:MM y minutos correctamente", () => {
    expect(aMinutos("00:00")).toBe(0);
    expect(aMinutos("09:30")).toBe(570);
    expect(aHora(0)).toBe("00:00");
    expect(aHora(570)).toBe("09:30");
    expect(aHora(810)).toBe("13:30");
  });

  it("formatea fechaDeHoy como AAAA-MM-DD", () => {
    expect(fechaDeHoy()).toBe("2026-11-24");
  });

  it("marca como no libre una hora que supera el fin del bloque", () => {
    const horario = {
      bloques: [{ inicio: 720, fin: 840 }], 
      paso: 30,
    };

    const slots = calcularHoras("2026-12-01", 90, [], horario);
    const porHora = Object.fromEntries(slots.map((s) => [s.hora, s.libre]));

    expect(porHora["12:00"]).toBe(true); 
    expect(porHora["12:30"]).toBe(true);
    expect(porHora["13:00"]).toBe(false); 
    expect(porHora["13:30"]).toBe(false); 
  });

  it("detecta solapamiento con reservas existentes y respeta huecos libres", () => {
    const horario = {
      bloques: [{ inicio: 540, fin: 780 }], 
      paso: 30,
    };
    const reservas = [{ horainicio: "10:00", horafin: "11:00" }];

    const slots = calcularHoras("2026-12-01", 60, reservas, horario);
    const porHora = Object.fromEntries(slots.map((s) => [s.hora, s.libre]));

    expect(porHora["09:00"]).toBe(true);  
    expect(porHora["09:30"]).toBe(false); 
    expect(porHora["10:00"]).toBe(false); 
    expect(porHora["10:30"]).toBe(false); 
    expect(porHora["11:00"]).toBe(true);  
  });

  it("marca como no libres las horas pasadas en el día de hoy", () => {
    const horario = {
      bloques: [{ inicio: 540, fin: 720 }],
      paso: 30,
    };

    const slots = calcularHoras("2026-11-24", 30, [], horario);
    const porHora = Object.fromEntries(slots.map((s) => [s.hora, s.libre]));

    expect(porHora["09:00"]).toBe(false);
    expect(porHora["09:30"]).toBe(false);
    expect(porHora["10:00"]).toBe(false);
    expect(porHora["10:30"]).toBe(true);
    expect(porHora["11:00"]).toBe(true);
  });

  it("marca todas las horas como no libres si la fecha ya pasó", () => {
    const horario = {
      bloques: [{ inicio: 540, fin: 720 }],
      paso: 30,
    };

    const slots = calcularHoras("2026-11-23", 30, [], horario);
    expect(slots.every((s) => s.libre === false)).toBe(true);
  });
});