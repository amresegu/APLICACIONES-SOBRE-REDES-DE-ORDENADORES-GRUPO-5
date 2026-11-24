import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRequire } from "node:module";
import request from "supertest";

const require = createRequire(import.meta.url);
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Usuario = require("../../src/models/user.model");
const TokenInvalido = require("../../src/models/blacklist.model");
const sequelize = require("../../config/database");
const app = require("../../index");

const SECRET_KEY = process.env.SECRET_KEY || "mi_clave_super_secreta_perruqueria";

function bearer(nombre = "alain", tlf = "600111222") {
  const token = jwt.sign({ nombre, tlf }, SECRET_KEY, { expiresIn: "15m" });
  return `Bearer ${token}`;
}

describe("Integración API - Autenticación y perfil", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(TokenInvalido, "findOne").mockResolvedValue(null);
  });

  it("POST /registro valida campos y contraseña segura (400)", async () => {
    const res = await request(app).post("/registro").send({
      nombre: "alain",
      tlf: "600111222",
      contrasenia: "debil",
    });
    expect(res.status).toBe(400);
  });

  it("POST /registro devuelve 409 si el usuario ya existe", async () => {
    vi.spyOn(Usuario, "findOne").mockResolvedValue({ nombre: "alain" });

    const res = await request(app).post("/registro").send({
      nombre: "alain_test",
      tlf: "600111222",
      contrasenia: "Clave#2026",
    });
    expect(res.status).toBe(409);
  });

  it("POST /registro crea el usuario y devuelve 201 con token", async () => {
    vi.spyOn(Usuario, "findOne").mockResolvedValue(null);
    vi.spyOn(Usuario, "create").mockResolvedValue({
      nombre: "alain_test",
      tlf: "600111222",
    });

    const res = await request(app).post("/registro").send({
      nombre: "alain_test",
      tlf: "600111222",
      contrasenia: "Clave#2026",
    });

    expect(res.status).toBe(201);
    expect(res.body.nombre).toBe("alain_test");
    expect(typeof res.body.token).toBe("string");
  });

  it("POST /login rechaza credenciales inválidas (401) y acepta válidas (200)", async () => {
    vi.spyOn(Usuario, "findOne").mockResolvedValueOnce(null);
    const badLogin = await request(app).post("/login").send({
      nombre: "nadie",
      contrasenia: "Clave#2026",
    });
    expect(badLogin.status).toBe(401);

    vi.spyOn(Usuario, "findOne").mockResolvedValueOnce({
      nombre: "alain",
      tlf: "600111222",
      rol: "cliente",
      contrasenia: "$2b$10$hashfalso",
    });
    vi.spyOn(bcrypt, "compare").mockResolvedValue(true);

    const okLogin = await request(app).post("/login").send({
      nombre: "alain",
      contrasenia: "Clave#2026",
    });
    expect(okLogin.status).toBe(200);
    expect(okLogin.body.nombre).toBe("alain");
    expect(typeof okLogin.body.token).toBe("string");
  });

  it("GET /perfil y PUT /perfil funcionan con token válido", async () => {
    vi.spyOn(Usuario, "findByPk").mockResolvedValue({
      nombre: "alain",
      tlf: "600111222",
      rol: "cliente",
    });

    const getRes = await request(app)
      .get("/perfil")
      .set("Authorization", bearer("alain"));
    expect(getRes.status).toBe(200);
    expect(getRes.body.tlf).toBe("600111222");

    vi.spyOn(Usuario, "update").mockResolvedValue([1]);
    const putRes = await request(app)
      .put("/perfil")
      .set("Authorization", bearer("alain"))
      .send({ tlf: "699888777" });
    expect(putRes.status).toBe(200);
    expect(putRes.body.tlf).toBe("699888777");
  });

  it("POST /logout invalida el token y DELETE /perfil elimina la cuenta", async () => {
    vi.spyOn(TokenInvalido, "create").mockResolvedValue({});

    const logoutRes = await request(app)
      .post("/logout")
      .set("Authorization", bearer("alain"));
    expect(logoutRes.status).toBe(200);

    vi.spyOn(sequelize, "transaction").mockImplementation(async (fn) => fn({}));
    vi.spyOn(Usuario, "destroy").mockResolvedValue(1);

    const deleteRes = await request(app)
      .delete("/perfil")
      .set("Authorization", bearer("alain"));
    expect(deleteRes.status).toBe(200);
  });
});