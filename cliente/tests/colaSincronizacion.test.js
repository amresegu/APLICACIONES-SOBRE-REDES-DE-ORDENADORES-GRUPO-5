import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const storage = new Map();

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (k) => storage.get(k) ?? null),
    setItem: vi.fn(async (k, v) => storage.set(k, v)),
  },
}));

vi.mock("expo-constants", () => ({ default: { expoConfig: null } }));
vi.mock("react-native", () => ({ Platform: { OS: "ios" } }));

vi.mock("../src/services/token", () => ({
  obtenerToken: vi.fn(async () => "jwt-valido"),
  obtenerUsuarioDelToken: vi.fn(async () => "alain"),
}));

import {
  contarPendientes,
  esEncolable,
  guardarEnColaOffline,
  sincronizarColaOffline,
} from "../src/services/colaSincronizacion";
import { obtenerUsuarioDelToken } from "../src/services/token";

describe("services/colaSincronizacion", () => {
  beforeEach(() => {
    storage.clear();
    vi.restoreAllMocks();
    vi.mocked(obtenerUsuarioDelToken).mockResolvedValue("alain");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("identifica correctamente las rutas encolables y excluye login o lecturas", () => {
    expect(esEncolable("POST", "/reservas")).toBe(true);
    expect(esEncolable("PUT", "/reservas/12")).toBe(true);
    expect(esEncolable("DELETE", "/animales/4")).toBe(true);
    expect(esEncolable("POST", "/resenas")).toBe(true);

    expect(esEncolable("GET", "/reservas")).toBe(false);
    expect(esEncolable("POST", "/login")).toBe(false);
    expect(esEncolable("POST", "/registro")).toBe(false);
  });

  it("guarda operaciones sin duplicar por claveIdempotencia", async () => {
    await guardarEnColaOffline({
      path: "/reservas",
      metodo: "POST",
      cuerpo: JSON.stringify({ fecha: "2026-12-10" }),
      claveIdempotencia: "key-1",
      descripcion: "Crear reserva",
    });
    await guardarEnColaOffline({
      path: "/reservas",
      metodo: "POST",
      cuerpo: JSON.stringify({ fecha: "2026-12-10" }),
      claveIdempotencia: "key-1",
    });

    expect(await contarPendientes()).toBe(1);
  });

  it("sincroniza las peticiones pendientes del usuario activo y registra conflictos 409", async () => {
    await guardarEnColaOffline({
      path: "/registrarAnimal",
      metodo: "POST",
      cuerpo: JSON.stringify({ nombreAnimal: "Thor", raza: "Beagle" }),
      claveIdempotencia: "key-ok",
      descripcion: "Registrar Thor",
    });
    await guardarEnColaOffline({
      path: "/reservas",
      metodo: "POST",
      cuerpo: JSON.stringify({ horainicio: "10:00" }),
      claveIdempotencia: "key-conflicto",
      descripcion: "Reservar 10:00",
    });

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 1 }), { status: 201 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "Esa hora ya no está disponible" }), { status: 409 }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const resultado = await sincronizarColaOffline();

    expect(resultado.enviadas).toHaveLength(1);
    expect(resultado.enviadas[0].claveIdempotencia).toBe("key-ok");
    expect(resultado.conflictos).toHaveLength(1);
    expect(resultado.conflictos[0].estado).toBe(409);
    expect(resultado.pendientes).toBe(0);
    expect(await contarPendientes()).toBe(0);
  });

  it("descarta elementos con más de 7 días de antigüedad", async () => {
    const haceOchoDias = Date.now() - 8 * 24 * 60 * 60 * 1000;
    storage.set(
      "cola_peticiones_pendientes_v2",
      JSON.stringify([
        {
          claveIdempotencia: "vieja",
          usuario: "alain",
          metodo: "POST",
          path: "/resenas",
          cuerpo: "{}",
          descripcion: "Reseña antigua",
          creadaEn: haceOchoDias,
        },
      ]),
    );

    const resultado = await sincronizarColaOffline();

    expect(resultado.conflictos).toHaveLength(1);
    expect(resultado.pendientes).toBe(0);
  });
});