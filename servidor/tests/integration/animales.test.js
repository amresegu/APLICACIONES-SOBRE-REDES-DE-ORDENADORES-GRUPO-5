import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRequire } from "node:module";
import request from "supertest";

const require = createRequire(import.meta.url);
const jwt = require("jsonwebtoken");
const TokenInvalido = require("../../src/models/blacklist.model");
const db = require("../../src/services/db.service");
const app = require("../../index");

const SECRET_KEY = process.env.SECRET_KEY || "mi_clave_super_secreta_perruqueria";

function tokenValido(nombre = "alain", tlf = "600111222") {
  const token = jwt.sign({ nombre, tlf }, SECRET_KEY, { expiresIn: "15m" });
  return `Bearer ${token}`;
}

describe("Integración API - /animales y /registrarAnimal", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(TokenInvalido, "findOne").mockResolvedValue(null);
  });

  it("rechaza con 401 si no se envía token", async () => {
    const res = await request(app).get("/animales");
    expect(res.status).toBe(401);
  });

  it("devuelve 200 y el listado de animales del usuario autenticado", async () => {
    const lista = [{ id: 1, nombreAnimal: "Thor", raza: "Pastor Alemán" }];
    vi.spyOn(db, "listarAnimales").mockResolvedValue(lista);

    const res = await request(app)
      .get("/animales")
      .set("Authorization", tokenValido("alain"));

    expect(res.status).toBe(200);
    expect(res.body).toEqual(lista);
    expect(db.listarAnimales).toHaveBeenCalledWith("alain");
  });

  it("devuelve 400 si faltan nombreAnimal o raza en /registrarAnimal", async () => {
    const res = await request(app)
      .post("/registrarAnimal")
      .set("Authorization", tokenValido("alain"))
      .send({ nombreAnimal: "Rocky" });

    expect(res.status).toBe(400);
  });

  it("devuelve 409 si ya existe un animal con ese nombre y raza", async () => {
    const dupErr = new Error("Duplicate");
    dupErr.name = "SequelizeUniqueConstraintError";
    vi.spyOn(db, "crearAnimal").mockRejectedValue(dupErr);

    const res = await request(app)
      .post("/registrarAnimal")
      .set("Authorization", tokenValido("alain"))
      .send({ nombreAnimal: "Rocky", raza: "Beagle", edad: 3, peso: 12 });

    expect(res.status).toBe(409);
  });

  it("crea el animal y devuelve 201 con datos normalizados", async () => {
    const creado = {
      id: 7,
      nombreAnimal: "Rocky",
      edad: null,
      peso: 12.5,
      raza: "Beagle",
      usuario: "alain",
    };
    vi.spyOn(db, "crearAnimal").mockResolvedValue(creado);

    const res = await request(app)
      .post("/registrarAnimal")
      .set("Authorization", tokenValido("alain"))
      .send({ nombreAnimal: "  Rocky ", edad: "", peso: "12.5", raza: " Beagle " });

    expect(res.status).toBe(201);
    expect(res.body).toEqual(creado);
    expect(db.crearAnimal).toHaveBeenCalledWith("Rocky", null, 12.5, "Beagle", "alain");
  });
});