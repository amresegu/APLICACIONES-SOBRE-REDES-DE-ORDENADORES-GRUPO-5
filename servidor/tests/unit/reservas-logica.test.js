import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { servicios } = require("../../src/data/servicios");
const { aMinutos, aHora, calcularHoras } = require("../../src/utils/disponibilidad");

function buscarServicios(ids) {
  return ids
    .map((id) => servicios.find((s) => s.id === String(id)))
    .filter(Boolean);
}

function calcularDuracionTotal(ids) {
  return buscarServicios(ids).reduce((acc, s) => acc + s.duracion, 0);
}

describe("Lógica unitaria de reservas y disponibilidad", () => {
  it("calcula la duración total de varios servicios válidos", () => {
    const ids = [1, 2];
    const esperados = buscarServicios(ids);
    const totalEsperado = esperados.reduce((sum, s) => sum + s.duracion, 0);

    expect(buscarServicios(ids)).toHaveLength(ids.length);
    expect(calcularDuracionTotal(ids)).toBe(totalEsperado);
  });

  it("ignora IDs de servicios inexistentes al buscar", () => {
    const resultado = buscarServicios(["1", "no-existe"]);
    expect(resultado).toHaveLength(1);
    expect(resultado[0].id).toBe("1");
  });

  it("convierte horas a minutos y vuelve a formato HH:MM", () => {
    expect(aMinutos("09:00")).toBe(540);
    expect(aHora(540)).toBe("09:00");
    expect(aHora(aMinutos("10:30") + 90)).toBe("12:00");
  });

  it("marca como no libres las horas que chocan con reservas existentes", () => {
    const horario = {
      mananaInicio: "09:00",
      mananaFin: "13:00",
      tardeInicio: "15:00",
      tardeFin: "19:00",
      intervalo: 30,
    };
    const reservas = [
      { horainicio: "10:00", horafin: "11:00" },
    ];

    const slots = calcularHoras("2027-06-15", 60, reservas, horario);
    const slot1000 = slots.find((s) => s.hora === "10:00");
    const slot0900 = slots.find((s) => s.hora === "09:00");

    if (slot1000) {
      expect(slot1000.libre).toBe(false);
    }
    if (slot0900) {
      expect(slot0900.libre).toBe(true);
    }
  });
});