import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ConfigTienda = require("../../src/models/config.model");
const {
  leerHorario,
  obtenerHorario,
  validarBloques,
  guardarHorario,
} = require("../../src/services/horario.service");

describe("services/horario.service", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("validarBloques", () => {
    it("rechaza cantidad de tramos fuera de rango (0 o más de 3)", () => {
      expect(validarBloques([]).error).toBeDefined();
      expect(validarBloques(null).error).toBeDefined();
      expect(
        validarBloques([
          { inicio: "08:00", fin: "10:00" },
          { inicio: "10:30", fin: "12:00" },
          { inicio: "13:00", fin: "15:00" },
          { inicio: "16:00", fin: "18:00" },
        ]).error
      ).toBeDefined();
    });

    it("rechaza formatos de hora inválidos o cierre menor/igual a apertura", () => {
      expect(validarBloques([{ inicio: "9:00", fin: "12:00" }]).error).toBeDefined();
      expect(validarBloques([{ inicio: "09:00", fin: "25:00" }]).error).toBeDefined();
      expect(validarBloques([{ inicio: "12:00", fin: "12:00" }]).error).toBeDefined();
      expect(validarBloques([{ inicio: "14:00", fin: "10:00" }]).error).toBeDefined();
    });

    it("rechaza tramos que se solapan incluso si llegan desordenados", () => {
      const res = validarBloques([
        { inicio: "12:00", fin: "14:00" },
        { inicio: "11:00", fin: "13:00" },
      ]);
      expect(res.error).toBeDefined();
    });

    it("acepta tramos válidos y los ordena cronológicamente", () => {
      const res = validarBloques([
        { inicio: "16:00", fin: "20:00" },
        { inicio: "09:00", fin: "13:00" },
      ]);

      expect(res.error).toBeUndefined();
      expect(res.bloques).toEqual([
        { inicio: "09:00", fin: "13:00" },
        { inicio: "16:00", fin: "20:00" },
      ]);
    });
  });

  describe("leerHorario y obtenerHorario", () => {
    it("usa el horario por defecto si no hay registro en BD", async () => {
      vi.spyOn(ConfigTienda, "findByPk").mockResolvedValue(null);

      const leido = await leerHorario();
      expect(Array.isArray(leido.bloques)).toBe(true);
      expect(typeof leido.texto).toBe("string");
      expect(leido.texto.startsWith("Abierto de ")).toBe(true);
    });

    it("hace fallback al horario por defecto si el JSON guardado está corrupto", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      vi.spyOn(ConfigTienda, "findByPk").mockResolvedValue({ valor: "{json-roto" });

      const leido = await leerHorario();
      expect(Array.isArray(leido.bloques)).toBe(true);
      expect(consoleSpy).toHaveBeenCalled();
    });

    it("lee bloques guardados y los convierte a minutos en obtenerHorario", async () => {
      vi.spyOn(ConfigTienda, "findByPk").mockResolvedValue({
        valor: JSON.stringify({
          bloques: [
            { inicio: "09:00", fin: "13:00" },
            { inicio: "16:00", fin: "19:00" },
          ],
          paso: 60,
        }),
      });

      const horarioMin = await obtenerHorario();
      expect(horarioMin).toEqual({
        bloques: [
          { inicio: 540, fin: 780 },
          { inicio: 960, fin: 1140 },
        ],
        paso: 60,
      });
    });
  });

  describe("guardarHorario", () => {
    it("persiste el horario mediante upsert y devuelve la lectura actualizada", async () => {
      const nuevosBloques = [{ inicio: "10:00", fin: "14:00" }];
      const findSpy = vi
        .spyOn(ConfigTienda, "findByPk")
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          valor: JSON.stringify({ bloques: nuevosBloques, paso: 60 }),
        });
      const upsertSpy = vi.spyOn(ConfigTienda, "upsert").mockResolvedValue([]);

      const resultado = await guardarHorario(nuevosBloques);

      expect(upsertSpy).toHaveBeenCalledWith({
        clave: "horario",
        valor: JSON.stringify({ bloques: nuevosBloques, paso: 60 }),
      });
      expect(resultado.bloques).toEqual(nuevosBloques);
      expect(resultado.texto).toBe("Abierto de 10:00 a 14:00");
      expect(findSpy).toHaveBeenCalledTimes(2);
    });
  });
});