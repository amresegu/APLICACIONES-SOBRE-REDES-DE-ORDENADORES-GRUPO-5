import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Usuario = require("../../src/models/user.model");
const Reserva = require("../../src/models/reserva.model");
const sequelize = require("../../config/database");
const db = require("../../src/services/db.service");

describe("services/db.service (aislado con mocks)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("obtenerTelefono", () => {
    it("devuelve el teléfono si el usuario existe", async () => {
      vi.spyOn(Usuario, "findByPk").mockResolvedValue({ tlf: "600111222" });

      const tlf = await db.obtenerTelefono("alain");
      expect(tlf).toBe("600111222");
    });

    it("devuelve null si el usuario no existe", async () => {
      vi.spyOn(Usuario, "findByPk").mockResolvedValue(null);

      const tlf = await db.obtenerTelefono("inexistente");
      expect(tlf).toBeNull();
    });
  });

  describe("crearReservaSiLibre", () => {
    it("devuelve null y no crea reserva si detecta solapamiento en la transacción", async () => {
      const fakeTx = { LOCK: { UPDATE: "UPDATE" } };
      vi.spyOn(sequelize, "transaction").mockImplementation(async (fn) => fn(fakeTx));
      vi.spyOn(Reserva, "findOne").mockResolvedValue({ id: 99 });
      const createSpy = vi.spyOn(Reserva, "create");

      const res = await db.crearReservaSiLibre(
        1,
        "alain",
        "2026-12-01",
        "10:00",
        "11:00",
        "Baño + secado"
      );

      expect(res).toBeNull();
      expect(createSpy).not.toHaveBeenCalled();
    });

    it("crea y devuelve la reserva dentro de la transacción cuando el hueco está libre", async () => {
      const fakeTx = { LOCK: { UPDATE: "UPDATE" } };
      const nuevaReserva = { id: 100, fecha: "2026-12-01", horainicio: "11:00", horafin: "12:00" };

      vi.spyOn(sequelize, "transaction").mockImplementation(async (fn) => fn(fakeTx));
      vi.spyOn(Reserva, "findOne").mockResolvedValue(null);
      const createSpy = vi.spyOn(Reserva, "create").mockResolvedValue(nuevaReserva);

      const res = await db.crearReservaSiLibre(
        1,
        "alain",
        "2026-12-01",
        "11:00",
        "12:00",
        "Baño + secado"
      );

      expect(res).toEqual(nuevaReserva);
      expect(createSpy).toHaveBeenCalledWith(
        {
          idAnimal: 1,
          usuario: "alain",
          fecha: "2026-12-01",
          horainicio: "11:00",
          horafin: "12:00",
          servicio: "Baño + secado",
        },
        { transaction: fakeTx }
      );
    });
  });
});