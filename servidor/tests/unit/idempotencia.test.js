import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Idempotencia = require("../../src/models/idempotencia.model");
const idempotencia = require("../../src/middlewares/idempotencia");

function crearResMock() {
  const headers = {};
  const res = {
    statusCode: 200,
    set: vi.fn((k, v) => {
      headers[k.toLowerCase()] = v;
      return res;
    }),
    getHeader: (k) => headers[k.toLowerCase()],
    status: vi.fn((code) => {
      res.statusCode = code;
      return res;
    }),
    json: vi.fn((body) => {
      res.body = body;
      return res;
    }),
  };
  return res;
}

describe("middlewares/idempotencia", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("continúa sin tocar la BD si no hay cabecera Idempotency-Key", async () => {
    const createSpy = vi.spyOn(Idempotencia, "create");
    const req = {
      headers: {},
      method: "POST",
      originalUrl: "/reservas",
      body: { fecha: "2026-12-01" },
      usuario: { nombre: "alain" },
    };
    const res = crearResMock();
    const next = vi.fn();

    await idempotencia(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(createSpy).not.toHaveBeenCalled();
  });

  it("rechaza con 400 si Idempotency-Key supera 100 caracteres", async () => {
    const req = {
      headers: { "idempotency-key": "k".repeat(101) },
      method: "POST",
      originalUrl: "/reservas",
      body: {},
      usuario: { nombre: "alain" },
    };
    const res = crearResMock();
    const next = vi.fn();

    await idempotencia(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it("devuelve 422 si la clave ya existe con otro cuerpo o ruta", async () => {
    const uniqueErr = new Error("Unique");
    uniqueErr.name = "SequelizeUniqueConstraintError";

    vi.spyOn(Idempotencia, "create").mockRejectedValue(uniqueErr);
    vi.spyOn(Idempotencia, "findOne").mockResolvedValue({
      huella: "huella_distinta",
      estado: "completada",
      creadaEn: new Date(),
    });

    const req = {
      headers: { "idempotency-key": "clave-1" },
      method: "POST",
      originalUrl: "/reservas",
      body: { idAnimal: 2 },
      usuario: { nombre: "alain" },
    };
    const res = crearResMock();
    const next = vi.fn();

    await idempotencia(req, res, next);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(next).not.toHaveBeenCalled();
  });

  it("reproduce la respuesta guardada con Idempotent-Replayed cuando ya está completada", async () => {
    const crypto = require("crypto");
    const cuerpo = { id: 55, mensaje: "Reserva creada" };
    const req = {
      headers: { "idempotency-key": "clave-ok" },
      method: "POST",
      originalUrl: "/reservas",
      body: { idAnimal: 1 },
      usuario: { nombre: "alain" },
    };
    const huellaEsperada = crypto
      .createHash("sha256")
      .update(`POST|/reservas|${JSON.stringify(req.body)}`)
      .digest("hex");

    const uniqueErr = new Error("Unique");
    uniqueErr.name = "SequelizeUniqueConstraintError";
    vi.spyOn(Idempotencia, "create").mockRejectedValue(uniqueErr);
    vi.spyOn(Idempotencia, "findOne").mockResolvedValue({
      huella: huellaEsperada,
      estado: "completada",
      codigoRespuesta: 201,
      cuerpoRespuesta: JSON.stringify(cuerpo),
      creadaEn: new Date(),
    });

    const res = crearResMock();
    const next = vi.fn();

    await idempotencia(req, res, next);

    expect(res.set).toHaveBeenCalledWith("Idempotent-Replayed", "true");
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(cuerpo);
    expect(next).not.toHaveBeenCalled();
  });

  it("actualiza el registro a completada cuando la respuesta es 2xx", async () => {
    const updateSpy = vi.fn().mockResolvedValue([]);
    const destroySpy = vi.fn().mockResolvedValue(1);
    vi.spyOn(Idempotencia, "create").mockResolvedValue({
      update: updateSpy,
      destroy: destroySpy,
    });

    const req = {
      headers: { "idempotency-key": "clave-nueva" },
      method: "POST",
      originalUrl: "/reservas",
      body: { idAnimal: 1 },
      usuario: { nombre: "alain" },
    };
    const res = crearResMock();
    const next = vi.fn(() => {
      res.statusCode = 201;
      res.json({ ok: true });
    });

    await idempotencia(req, res, next);
    await new Promise((r) => setImmediate(r));

    expect(next).toHaveBeenCalledTimes(1);
    expect(updateSpy).toHaveBeenCalledWith({
      estado: "completada",
      codigoRespuesta: 201,
      cuerpoRespuesta: JSON.stringify({ ok: true }),
    });
    expect(destroySpy).not.toHaveBeenCalled();
  });
});