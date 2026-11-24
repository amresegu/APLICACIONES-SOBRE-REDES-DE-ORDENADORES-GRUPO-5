import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRequire } from "node:module";
import request from "supertest";

const require = createRequire(import.meta.url);
const jwt = require("jsonwebtoken");
const Resena = require("../../src/models/resena.model");
const TokenInvalido = require("../../src/models/blacklist.model");
const { servicios } = require("../../src/data/servicios");
const app = require("../../index");

const SECRET_KEY = process.env.SECRET_KEY || "mi_clave_super_secreta_perruqueria";

function bearer(nombre = "alain", tlf = "600111222") {
  const token = jwt.sign({ nombre, tlf }, SECRET_KEY, { expiresIn: "15m" });
  return `Bearer ${token}`;
}

describe("Integración API - /salud, /servicios y /resenas", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(TokenInvalido, "findOne").mockResolvedValue(null);
  });

  it("GET /salud devuelve 200 y { ok: true }", async () => {
    const res = await request(app).get("/salud");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it("GET /servicios devuelve el catálogo de servicios", async () => {
    const res = await request(app).get("/servicios");
    expect(res.status).toBe(200);
    expect(res.body).toEqual(servicios);
  });

  it("GET /resenas devuelve 200 con la lista de reseñas", async () => {
    const lista = [{ id: 1, puntuacion: 5, comentario: "Genial", usuario: "alain" }];
    vi.spyOn(Resena, "findAll").mockResolvedValue(lista);

    const res = await request(app).get("/resenas");
    expect(res.status).toBe(200);
    expect(res.body).toEqual(lista);
  });

  it("POST /resenas rechaza sin token (401) o sin campos obligatorios (400)", async () => {
    const sinToken = await request(app)
      .post("/resenas")
      .send({ puntuacion: 5, comentario: "Muy bien" });
    expect(sinToken.status).toBe(401);

    const incompleta = await request(app)
      .post("/resenas")
      .set("Authorization", bearer("alain"))
      .send({ puntuacion: 5 });
    expect(incompleta.status).toBe(400);
  });

  it("POST /resenas crea una reseña autenticada y devuelve 201", async () => {
    const creada = { id: 12, puntuacion: 5, comentario: "Trato excelente", usuario: "alain" };
    vi.spyOn(Resena, "create").mockResolvedValue(creada);

    const res = await request(app)
      .post("/resenas")
      .set("Authorization", bearer("alain"))
      .send({ puntuacion: 5, comentario: "Trato excelente" });

    expect(res.status).toBe(201);
    expect(res.body.resena).toEqual(creada);
    expect(Resena.create).toHaveBeenCalledWith({
      puntuacion: 5,
      comentario: "Trato excelente",
      usuario: "alain",
    });
  });
});