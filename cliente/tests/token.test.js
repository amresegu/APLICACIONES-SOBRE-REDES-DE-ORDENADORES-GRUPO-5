import { beforeEach, describe, expect, it, vi } from "vitest";

const almacen = new Map();

vi.mock("react-native", () => ({
  Platform: { OS: "ios" },
}));

vi.mock("expo-secure-store", () => ({
  setItemAsync: vi.fn(async (k, v) => almacen.set(k, v)),
  getItemAsync: vi.fn(async (k) => almacen.get(k) ?? null),
  deleteItemAsync: vi.fn(async (k) => almacen.delete(k)),
}));

import { borrarToken, guardarToken, obtenerToken, obtenerUsuarioDelToken } from "../src/services/token";

function crearJwtFalso(payload) {
  const codificar = (obj) =>
    Buffer.from(JSON.stringify(obj))
      .toString("base64")
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
  return `${codificar({ alg: "HS256", typ: "JWT" })}.${codificar(payload)}.firma`;
}

describe("services/token", () => {
  beforeEach(() => {
    almacen.clear();
  });

  it("guarda, recupera y borra el token en SecureStore", async () => {
    expect(await obtenerToken()).toBeNull();

    await guardarToken("token-abc");
    expect(await obtenerToken()).toBe("token-abc");

    await borrarToken();
    expect(await obtenerToken()).toBeNull();
  });

  it("extrae el nombre de usuario del JWT almacenado y devuelve null si es inválido", async () => {
    await guardarToken(crearJwtFalso({ nombre: "alain_garcia", tlf: "600111222" }));
    expect(await obtenerUsuarioDelToken()).toBe("alain_garcia");

    await guardarToken("token-malformado");
    expect(await obtenerUsuarioDelToken()).toBeNull();
  });
});