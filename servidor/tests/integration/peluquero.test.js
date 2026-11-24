import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRequire } from "node:module";
import request from "supertest";

const require = createRequire(import.meta.url);
const jwt = require("jsonwebtoken");
const Usuario = require("../../src/models/user.model");
const Reserva = require("../../src/models/reserva.model");
const Animal = require("../../src/models/animal.model");
const Resena = require("../../src/models/resena.model");
const TokenInvalido = require("../../src/models/blacklist.model");
const sequelize = require("../../config/database");
const horarioService = require("../../src/services/horario.service");
const app = require("../../index");

const SECRET_KEY = process.env.SECRET_KEY || "mi_clave_super_secreta_perruqueria";

function bearer(nombre = "peluquero1", tlf = "600000000") {
  const token = jwt.sign({ nombre, tlf }, SECRET_KEY, { expiresIn: "15m" });
  return `Bearer ${token}`;
}

describe("Integración API - Rutas de /horario y /peluquero", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(TokenInvalido, "findOne").mockResolvedValue(null);
  });

  it("GET /horario devuelve el horario configurado (200)", async () => {
    const horarioMock = {
      bloques: [{ inicio: "09:00", fin: "13:00" }],
      paso: 60,
      texto: "Abierto de 09:00 a 13:00",
    };
    vi.spyOn(horarioService, "leerHorario").mockResolvedValue(horarioMock);

    const res = await request(app).get("/horario");
    expect(res.status).toBe(200);
    expect(res.body).toEqual(horarioMock);
  });

  it("rechaza con 403 si un usuario con rol cliente intenta acceder a /peluquero/agenda", async () => {
    vi.spyOn(Usuario, "findByPk").mockResolvedValue({ rol: "cliente" });

    const res = await request(app)
      .get("/peluquero/agenda")
      .set("Authorization", bearer("cliente1"))
      .query({ fecha: "2026-12-10" });

    expect(res.status).toBe(403);
  });

  it("PUT /horario valida bloques (400) y guarda bloques válidos (200) para peluquero", async () => {
    vi.spyOn(Usuario, "findByPk").mockResolvedValue({ rol: "peluquero" });

    const invalido = await request(app)
      .put("/horario")
      .set("Authorization", bearer("peluquero1"))
      .send({ bloques: [] });
    expect(invalido.status).toBe(400);

    const guardado = {
      bloques: [{ inicio: "09:00", fin: "13:00" }],
      paso: 60,
      texto: "Abierto de 09:00 a 13:00",
    };
    vi.spyOn(horarioService, "guardarHorario").mockResolvedValue(guardado);

    const valido = await request(app)
      .put("/horario")
      .set("Authorization", bearer("peluquero1"))
      .send({ bloques: [{ inicio: "09:00", fin: "13:00" }] });
    expect(valido.status).toBe(200);
    expect(valido.body).toEqual(guardado);
  });

  it("GET /peluquero/agenda devuelve citas formateadas de la fecha indicada", async () => {
    vi.spyOn(Usuario, "findByPk").mockResolvedValue({ rol: "peluquero" });
    vi.spyOn(Reserva, "findAll").mockResolvedValue([
      {
        id: 3,
        fecha: "2026-12-10",
        horainicio: "10:00:00",
        horafin: "11:00:00",
        servicio: "Baño + secado",
        usuario: "alain",
        Animal: { nombreAnimal: "Thor", raza: "Pastor Alemán", edad: 4, peso: 28 },
        Usuario: { nombre: "alain", tlf: "600111222" },
      },
    ]);

    const res = await request(app)
      .get("/peluquero/agenda")
      .set("Authorization", bearer("peluquero1"))
      .query({ fecha: "2026-12-10" });

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.citas[0]).toEqual({
      id: 3,
      fecha: "2026-12-10",
      horainicio: "10:00",
      horafin: "11:00",
      servicio: "Baño + secado",
      perro: { nombre: "Thor", raza: "Pastor Alemán", edad: 4, peso: 28 },
      cliente: { nombre: "alain", tlf: "600111222" },
    });
  });

  it("DELETE /peluquero/reservas/:id valida id y cancela cita", async () => {
    vi.spyOn(Usuario, "findByPk").mockResolvedValue({ rol: "peluquero" });

    const idMalo = await request(app)
      .delete("/peluquero/reservas/abc")
      .set("Authorization", bearer("peluquero1"));
    expect(idMalo.status).toBe(400);

    vi.spyOn(Reserva, "destroy").mockResolvedValue(1);
    const ok = await request(app)
      .delete("/peluquero/reservas/3")
      .set("Authorization", bearer("peluquero1"));
    expect(ok.status).toBe(200);
  });

  it("gestiona roles y eliminación de usuarios impidiendo auto-cambios o borrar peluqueros", async () => {
    const findByPkSpy = vi
      .spyOn(Usuario, "findByPk")
      .mockResolvedValueOnce({ rol: "peluquero" }) 
      .mockResolvedValueOnce({ nombre: "cliente1", rol: "cliente", save: vi.fn().mockResolvedValue() });

    const rolOk = await request(app)
      .put("/peluquero/usuarios/cliente1/rol")
      .set("Authorization", bearer("peluquero1"))
      .send({ rol: "peluquero" });
    expect(rolOk.status).toBe(200);
    expect(rolOk.body.rol).toBe("peluquero");

    findByPkSpy
      .mockResolvedValueOnce({ rol: "peluquero" }) 
      .mockResolvedValueOnce({ nombre: "otro_pelu", rol: "peluquero" });

    const borrarPelu = await request(app)
      .delete("/peluquero/usuarios/otro_pelu")
      .set("Authorization", bearer("peluquero1"));
    expect(borrarPelu.status).toBe(400);

    findByPkSpy
      .mockResolvedValueOnce({ rol: "peluquero" }) 
      .mockResolvedValueOnce({ nombre: "cliente1", rol: "cliente" });

    vi.spyOn(sequelize, "transaction").mockImplementation(async (fn) => fn({}));
    vi.spyOn(Reserva, "destroy").mockResolvedValue(0);
    vi.spyOn(Resena, "destroy").mockResolvedValue(0);
    vi.spyOn(Animal, "destroy").mockResolvedValue(0);
    vi.spyOn(Usuario, "destroy").mockResolvedValue(1);

    const borrarCliente = await request(app)
      .delete("/peluquero/usuarios/cliente1")
      .set("Authorization", bearer("peluquero1"));
    expect(borrarCliente.status).toBe(200);
  });
});