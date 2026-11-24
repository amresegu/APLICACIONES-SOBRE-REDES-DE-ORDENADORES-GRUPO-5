import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const jwt = require("jsonwebtoken");
const TokenInvalido = require("../../src/models/blacklist.model");
const { generarToken, verificarToken } = require("../../src/middlewares/auth.middleware");

function crearResMock() {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe("middlewares/auth.middleware", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("genera un JWT verificable con nombre y tlf del usuario", () => {
    const token = generarToken({ nombre: "alain", tlf: "600123456" });
    expect(typeof token).toBe("string");

    const decoded = jwt.decode(token);
    expect(decoded.nombre).toBe("alain");
    expect(decoded.tlf).toBe("600123456");
  });

  it("responde 401 si falta la cabecera Authorization o no empieza por Bearer", async () => {
    const resSinCabecera = crearResMock();
    const next = vi.fn();

    await verificarToken({ headers: {} }, resSinCabecera, next);
    expect(resSinCabecera.status).toHaveBeenCalledWith(401);
    expect(resSinCabecera.json).toHaveBeenCalledWith({ error: "Token no proporcionado" });
    expect(next).not.toHaveBeenCalled();

    const resMalFormato = crearResMock();
    await verificarToken({ headers: { authorization: "Basic abc" } }, resMalFormato, next);
    expect(resMalFormato.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("responde 401 si el token está en la lista de revocados", async () => {
    const token = generarToken({ nombre: "alain", tlf: "600123456" });
    vi.spyOn(TokenInvalido, "findOne").mockResolvedValue({ token });

    const res = crearResMock();
    const next = vi.fn();

    await verificarToken({ headers: { authorization: `Bearer ${token}` } }, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: "La sesión fue cerrada. Inicia sesión de nuevo.",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("responde 401 indicando Token expirado cuando el JWT ha caducado", async () => {
    vi.spyOn(TokenInvalido, "findOne").mockResolvedValue(null);
    const expiredError = new Error("jwt expired");
    expiredError.name = "TokenExpiredError";
    vi.spyOn(jwt, "verify").mockImplementation(() => {
      throw expiredError;
    });

    const res = crearResMock();
    const next = vi.fn();

    await verificarToken({ headers: { authorization: "Bearer token.caducado" } }, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Token expirado" });
    expect(next).not.toHaveBeenCalled();
  });

  it("asigna req.usuario y llama a next() si el token es válido y no está revocado", async () => {
    const usuario = { nombre: "alain", tlf: "600123456" };
    const token = generarToken(usuario);
    vi.spyOn(TokenInvalido, "findOne").mockResolvedValue(null);

    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = crearResMock();
    const next = vi.fn();

    await verificarToken(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.usuario.nombre).toBe("alain");
    expect(req.usuario.tlf).toBe("600123456");
  });
});