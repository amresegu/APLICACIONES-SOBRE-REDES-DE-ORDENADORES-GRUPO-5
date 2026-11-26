import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRequire } from "node:module";
import request from "supertest";

const require = createRequire(import.meta.url);
const jwt = require("jsonwebtoken");
const TokenInvalido = require("../../src/models/blacklist.model");
const ConfigTienda = require("../../src/models/config.model");
const db = require("../../src/services/db.service");
const app = require("../../index");

const SECRET_KEY = process.env.SECRET_KEY || "mi_clave_super_secreta_perruqueria";

function bearer(nombre = "alain", tlf = "600111222") {
  const token = jwt.sign({ nombre, tlf }, SECRET_KEY, { expiresIn: "15m" });
  return `Bearer ${token}`;
}

describe("Integración API - /disponibilidad y /reservas", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(TokenInvalido, "findOne").mockResolvedValue(null);
    vi.spyOn(ConfigTienda, "findByPk").mockResolvedValue({
      valor: JSON.stringify({
        bloques: [{ inicio: "09:00", fin: "14:00" }],
        paso: 60,
      }),
    });
  });

  describe("GET /disponibilidad", () => {
    it("responde 400 si la fecha no es válida o no hay servicios", async () => {
      const sinFecha = await request(app)
        .get("/disponibilidad")
        .set("Authorization", bearer())
        .query({ servicios: "1" });
      expect(sinFecha.status).toBe(400);

      const sinServicios = await request(app)
        .get("/disponibilidad")
        .set("Authorization", bearer())
        .query({ fecha: "2026-12-10" });
      expect(sinServicios.status).toBe(400);
    });

    it("responde 200 con duracion y array de horas", async () => {
      vi.spyOn(db, "reservasDelDia").mockResolvedValue([]);

      const res = await request(app)
        .get("/disponibilidad")
        .set("Authorization", bearer())
        .query({ fecha: "2026-12-10", servicios: "1,2" });

      expect(res.status).toBe(200);
      expect(typeof res.body.duracion).toBe("number");
      expect(res.body.duracion).toBeGreaterThan(0);
      expect(Array.isArray(res.body.horas)).toBe(true);
    });
  });

  describe("POST /reservas", () => {
    it("responde 404 si el animal no pertenece al usuario", async () => {
      vi.spyOn(db, "obtenerAnimalDeUsuario").mockResolvedValue(null);

      const res = await request(app)
        .post("/reservas")
        .set("Authorization", bearer("alain"))
        .send({
          idAnimal: 99,
          fecha: "2026-12-10",
          horainicio: "10:00",
          servicios: ["1"],
        });

      expect(res.status).toBe(404);
    });

    it("responde 409 si la hora ya está ocupada", async () => {
      vi.spyOn(db, "obtenerAnimalDeUsuario").mockResolvedValue({ id: 1, usuario: "alain" });
      vi.spyOn(db, "reservasDelDia").mockResolvedValue([
        { id: 10, horainicio: "10:00", horafin: "11:00" },
      ]);

      const res = await request(app)
        .post("/reservas")
        .set("Authorization", bearer("alain"))
        .send({
          idAnimal: 1,
          fecha: "2026-12-10",
          horainicio: "10:00",
          servicios: ["1"],
        });

      expect(res.status).toBe(409);
    });

    it("responde 201 cuando crea la reserva en un hueco libre", async () => {
      const reservaCreada = {
        id: 25,
        idAnimal: 1,
        usuario: "alain",
        fecha: "2026-12-10",
        horainicio: "11:00",
      };
      vi.spyOn(db, "obtenerAnimalDeUsuario").mockResolvedValue({ id: 1, usuario: "alain" });
      vi.spyOn(db, "reservasDelDia").mockResolvedValue([]);
      vi.spyOn(db, "crearReservaSiLibre").mockResolvedValue(reservaCreada);

      const res = await request(app)
        .post("/reservas")
        .set("Authorization", bearer("alain"))
        .send({
          idAnimal: 1,
          fecha: "2026-12-10",
          horainicio: "11:00",
          servicios: ["1"],
        });

      expect(res.status).toBe(201);
      expect(res.body).toEqual(reservaCreada);
    });
  });

  describe("GET /reservas y PUT /reservas/:id", () => {
    it("GET /reservas devuelve 200 con las reservas del usuario", async () => {
      const lista = [{ id: 1, fecha: "2026-12-10", horainicio: "10:00" }];
      vi.spyOn(db, "buscarReserva").mockResolvedValue(lista);

      const res = await request(app)
        .get("/reservas")
        .set("Authorization", bearer("alain"));

      expect(res.status).toBe(200);
      expect(res.body).toEqual(lista);
    });

    it("PUT /reservas/:id devuelve 404 si no existe y 200 si modifica correctamente", async () => {
      vi.spyOn(db, "reservaDeUsuario").mockResolvedValueOnce(null);

      const noExiste = await request(app)
        .put("/reservas/77")
        .set("Authorization", bearer("alain"))
        .send({
          fecha: "2026-12-15",
          horainicio: "11:00",
          servicios: ["1"],
        });
      expect(noExiste.status).toBe(404);

      vi.spyOn(db, "reservaDeUsuario").mockResolvedValueOnce({ id: 77, usuario: "alain" });
      vi.spyOn(db, "reservasDelDia").mockResolvedValue([]);
      vi.spyOn(db, "modificarReservaDeUsuario").mockResolvedValue([1]);

      const ok = await request(app)
        .put("/reservas/77")
        .set("Authorization", bearer("alain"))
        .send({
          fecha: "2026-12-15",
          horainicio: "11:00",
          servicios: ["1"],
        });
      expect(ok.status).toBe(200);
    });
  });
});