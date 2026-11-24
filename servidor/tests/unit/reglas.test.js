import { describe, expect, it } from "vitest";

function validarCredencialesPeluquero(nombre, contrasena) {
  if (typeof nombre !== "string" || nombre.length < 6 || nombre.length > 20) {
    return { valida: false, motivo: "nombre" };
  }
  const tieneLongitud = typeof contrasena === "string" && contrasena.length >= 7;
  const tieneMayuscula = /[A-Z]/.test(contrasena);
  const tieneMinuscula = /[a-z]/.test(contrasena);
  const tieneSimbolo = /[^A-Za-z0-9]/.test(contrasena);

  if (!tieneLongitud || !tieneMayuscula || !tieneMinuscula || !tieneSimbolo) {
    return { valida: false, motivo: "contrasena" };
  }
  return { valida: true };
}

describe("Validación de credenciales de peluquero", () => {
  it("acepta un nombre y contraseña válidos", () => {
    expect(validarCredencialesPeluquero("peluquero1", "Clave#2026")).toEqual({
      valida: true,
    });
  });

  it("rechaza un nombre demasiado corto o demasiado largo", () => {
    expect(validarCredencialesPeluquero("ana", "Clave#2026").motivo).toBe("nombre");
    expect(
      validarCredencialesPeluquero("nombre_de_peluquero_excesivamente_largo", "Clave#2026").motivo
    ).toBe("nombre");
  });

  it("rechaza una contraseña sin símbolo, mayúscula, minúscula o corta", () => {
    expect(validarCredencialesPeluquero("peluquero1", "Clave2026").motivo).toBe("contrasena");
    expect(validarCredencialesPeluquero("peluquero1", "clave#2026").motivo).toBe("contrasena");
    expect(validarCredencialesPeluquero("peluquero1", "CLAVE#2026").motivo).toBe("contrasena");
    expect(validarCredencialesPeluquero("peluquero1", "Cl#1").motivo).toBe("contrasena");
  });
});