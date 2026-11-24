import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorDeRed, fetchConReintentos, generarClaveIdempotencia } from "../src/services/red";

describe("services/red", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("generarClaveIdempotencia genera identificadores únicos en formato UUID", () => {
    const a = generarClaveIdempotencia();
    const b = generarClaveIdempotencia();

    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(a).not.toBe(b);
  });

  it("no reintenta ante errores de cliente como 400 o 401", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 400 }));
    vi.stubGlobal("fetch", fetchMock);

    const res = await fetchConReintentos("https://api.test/reservas", {}, { reintentos: 3, retardoBaseMs: 1 });

    expect(res.status).toBe(400);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("reintenta ante respuestas 503 hasta obtener 200", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const res = await fetchConReintentos("https://api.test/salud", {}, { reintentos: 3, retardoBaseMs: 1 });

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("lanza ErrorDeRed tras agotar los reintentos por fallo de red", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("Network request failed"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      fetchConReintentos("https://api.test/reservas", {}, { reintentos: 2, retardoBaseMs: 1 }),
    ).rejects.toBeInstanceOf(ErrorDeRed);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});