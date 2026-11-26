const VENTANA_IP_MS = 15 * 60 * 1000;
const MAX_INTENTOS_IP = 5;
const MAX_INTENTOS_CUENTA = 5;
const BLOQUEO_BASE_MS = 60 * 1000;
const BLOQUEO_MAX_MS = 60 * 60 * 1000;
const OLVIDO_MS = 24 * 60 * 60 * 1000;

const porIp = new Map();
const porCuenta = new Map();

function rechazar(res, msRestantes) {
    const segundos = Math.max(1, Math.ceil(msRestantes / 1000));
    res.set('Retry-After', String(segundos));
    return res.status(429).json({
        error: 'Demasiados intentos. Inténtalo de nuevo más tarde.',
        reintentarEnSegundos: segundos,
    });
}

function limitadorLogin(req, res, next) {
    const ahora = Date.now();
    const ip = req.ip;
    const nombre = String(req.body?.nombre ?? '').trim().toLowerCase().slice(0, 100);

    // --- IP ---
    let regIp = porIp.get(ip);
    if (!regIp || ahora - regIp.inicio > VENTANA_IP_MS) {
        regIp = { intentos: 0, inicio: ahora };
        porIp.set(ip, regIp);
    }
    let regCuenta = nombre ? porCuenta.get(nombre) : null;
    if (regCuenta) {
        if (regCuenta.bloqueadoHasta > ahora) {
            return rechazar(res, regCuenta.bloqueadoHasta - ahora);
        }
        if (regCuenta.bloqueadoHasta) {
            regCuenta.bloqueadoHasta = 0;
            regCuenta.intentos = 0;
        }
    }

    if (regIp.intentos >= MAX_INTENTOS_IP) {
        return rechazar(res, regIp.inicio + VENTANA_IP_MS - ahora);
    }
    regIp.intentos++;

    if (nombre) {
        if (!regCuenta) {
            regCuenta = { intentos: 0, bloqueos: 0, bloqueadoHasta: 0, ultimo: ahora };
            porCuenta.set(nombre, regCuenta);
        }
        regCuenta.intentos++;
        regCuenta.ultimo = ahora;

        if (regCuenta.intentos >= MAX_INTENTOS_CUENTA) {
            regCuenta.bloqueos++;
            const duracion = Math.min(BLOQUEO_BASE_MS * 2 ** (regCuenta.bloqueos - 1), BLOQUEO_MAX_MS);
            regCuenta.bloqueadoHasta = ahora + duracion;
        }
    }

    res.on('finish', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
            if (nombre) porCuenta.delete(nombre);
            regIp.intentos = Math.max(0, regIp.intentos - 1);
        }
    });

    next();
}

setInterval(() => {
    const ahora = Date.now();
    for (const [ip, reg] of porIp) {
        if (ahora - reg.inicio > VENTANA_IP_MS) porIp.delete(ip);
    }
    for (const [nombre, reg] of porCuenta) {
        if (reg.bloqueadoHasta < ahora && ahora - reg.ultimo > OLVIDO_MS) porCuenta.delete(nombre);
    }
}, 10 * 60 * 1000).unref();

const VENTANA_REGISTRO_MS = 60 * 60 * 1000;
const MAX_REGISTROS_IP = 5;
const registrosPorIp = new Map();

function limitadorRegistro(req, res, next) {
    const ahora = Date.now();
    let reg = registrosPorIp.get(req.ip);
    if (!reg || ahora - reg.inicio > VENTANA_REGISTRO_MS) {
        reg = { intentos: 0, inicio: ahora };
        registrosPorIp.set(req.ip, reg);
    }

    if (reg.intentos >= MAX_REGISTROS_IP) {
        return rechazar(res, reg.inicio + VENTANA_REGISTRO_MS - ahora);
    }

    reg.intentos++;
    res.on('finish', () => {
        if (res.statusCode === 400) reg.intentos = Math.max(0, reg.intentos - 1);
    });
    next();
}

setInterval(() => {
    const ahora = Date.now();
    for (const [ip, reg] of registrosPorIp) {
        if (ahora - reg.inicio > VENTANA_REGISTRO_MS) registrosPorIp.delete(ip);
    }
}, 10 * 60 * 1000).unref();

module.exports = limitadorLogin;
module.exports.limitadorLogin = limitadorLogin;
module.exports.limitadorRegistro = limitadorRegistro;