const BASE_URL = process.env.API_URL || 'https://miperruqueria-api.onrender.com';
const TIMEOUT_MS = 60000;

async function comprobarEndpoint(ruta, validar) {
  const url = `${BASE_URL.replace(/\/$/, '')}${ruta}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`${ruta} respondió con HTTP ${res.status}`);
    }
    const data = await res.json();
    validar(data);
    console.log(`✅ ${ruta} -> OK (${res.status})`);
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  console.log(`Comprobando backend en ${BASE_URL}...`);

  await comprobarEndpoint('/', (data) => {
    if (!data || typeof data.mensaje !== 'string') {
      throw new Error('Respuesta inesperada en /');
    }
  });

  await comprobarEndpoint('/salud', (data) => {
    if (!data || data.ok !== true) {
      throw new Error('Respuesta inesperada en /salud');
    }
  });

  await comprobarEndpoint('/servicios', (data) => {
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('El catálogo de /servicios está vacío o no es un array');
    }
  });

  await comprobarEndpoint('/horario', (data) => {
    if (!data || !Array.isArray(data.bloques)) {
      throw new Error('Respuesta inesperada en /horario');
    }
  });

  console.log('🎉 Smoke test contra Render completado con éxito.');
}

main().catch((err) => {
  console.error('❌ Falló la comprobación contra Render:', err.message);
  if (err.cause) console.error('Detalle:', err.cause);
  process.exit(1);
});