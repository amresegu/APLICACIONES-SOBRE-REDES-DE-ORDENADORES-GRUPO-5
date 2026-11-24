import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  guardarEnColaMock: vi.fn(),
  sincronizarMock: vi.fn(),
  obtenerTokenMock: vi.fn(),
  borrarTokenMock: vi.fn(),
}));

vi.mock("expo-router", () => ({
  router: { replace: mocks.replaceMock },
}));

vi.mock("expo-constants", () => ({ default: { expoConfig: null } }));
vi.mock("react-native", () => ({ Platform: { OS: "ios" } }));

vi.mock("../src/services/colaSincronizacion", () => ({
  esEncolable: vi.fn((metodo, path) => metodo === "POST" && path === "/reservas"),
  guardarEnColaOffline: mocks.guardarEnColaMock,
  sincronizarColaOffline: mocks.sincronizarMock,
}));

vi.mock("../src/services/token", () => ({
  obtenerToken: mocks.obtenerTokenMock,
  borrarToken: mocks.borrarTokenMock,
  guardarToken: vi.fn(),
  obtenerUsuarioDelToken: vi.fn(),
}));

import { peticion } from "../src/services/api";
import { fetchAutenticado } from "../src/services/authService";

describe("services/authService y services/api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("encola y responde 202 con offline: true si falla la red en POST /reservas autenticado", async () => {
    mocks.obtenerTokenMock.mockResolvedValue("jwt-alain");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Offline")));

    const res = await fetchAutenticado("/reservas", {
      method: "POST",
      body: JSON.stringify({ fecha: "2026-12-10" }),
      reintentos: 1,
      retardoBaseMs: 1,
    });

    expect(res.status).toBe(202);
    const body = await res.json();
    expect(body.offline).toBe(true);
    expect(mocks.guardarEnColaMock).toHaveBeenCalledTimes(1);
  });

  it("cierra sesión y redirige a / cuando el servidor devuelve 401", async () => {
    mocks.obtenerTokenMock.mockResolvedValue("jwt-caducado");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "Token expirado" }), { status: 401 })),
    );

    await expect(peticion("/perfil")).rejects.toThrow("Token expirado");
    expect(mocks.borrarTokenMock).toHaveBeenCalledTimes(2);
    expect(mocks.replaceMock).toHaveBeenCalledWith("/");
  });
});