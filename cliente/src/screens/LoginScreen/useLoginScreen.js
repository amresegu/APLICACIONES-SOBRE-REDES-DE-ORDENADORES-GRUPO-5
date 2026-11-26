import { router } from "expo-router";
import { useEffect, useState } from "react";
import { API_URL, fetchAutenticado, guardarToken, obtenerToken } from "../../services/authService";
import { fetchConReintentos } from "../../services/red";

export function useLoginScreen() {
  const [usuario, setUsuario] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [cargando, setCargando] = useState(false);
  const [segundosBloqueo, setSegundosBloqueo] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        if (!(await obtenerToken())) return;
        const res = await fetchAutenticado("/perfil");
        if (res.ok) {
          const datos = await res.json();
          router.replace({ pathname: "/inicio", params: { usuario: datos.nombre } });
        }
      } catch { }
    })();
  }, []);

  useEffect(() => {
    if (segundosBloqueo <= 0) return;
    const id = setInterval(() => {
      setSegundosBloqueo((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [segundosBloqueo > 0]);

  const handleLogin = async () => {
    if (cargando || segundosBloqueo > 0) return;

    if (!usuario.trim() || !contrasena) {
      alert("Por favor, rellena todos los campos");
      return;
    }

    setCargando(true);
    try {
      const res = await fetchConReintentos(
        `${API_URL}/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nombre: usuario.trim(), contrasenia: contrasena }),
        },
        { reintentos: 3, timeoutMs: 15000 },
      );
      const datos = await res.json().catch(() => ({}));

      if (res.status === 429) {
        const segundos =
          Number(datos.reintentarEnSegundos) || Number(res.headers.get("Retry-After")) || 60;
        setSegundosBloqueo(segundos);

        const espera =
          segundos >= 60
            ? `${Math.ceil(segundos / 60)} minuto(s)`
            : `${segundos} segundo(s)`;
        alert(`Has superado el límite de intentos. Espera ${espera} para volver a intentarlo.`);
        return;
      }

      if (!res.ok) {
        alert(datos.error || "No se pudo iniciar sesión");
        return;
      }

      await guardarToken(datos.token);
      router.replace({ pathname: "/inicio", params: { usuario: datos.nombre } });
    } catch {
      alert("No se pudo conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.");
    } finally {
      setCargando(false);
    }
  };

  const handleIrARegistro = () => {
    router.push("/registro");
  };

  return {
    usuario,
    setUsuario,
    contrasena,
    setContrasena,
    cargando,
    segundosBloqueo,
    handleLogin,
    handleIrARegistro,
  };
}