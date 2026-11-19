# Aplicaciones sobre Redes de Ordenadores - Grupo 5

Aplicación para la gestión y reserva de servicios de peluquería y cuidado de mascotas

## Índice

- [Integrantes](#integrantes)
- [Descripción](#descripción)
- [Funcionalidades](#funcionalidades)
- [Tecnologías](#tecnologías)
- [Cliente (aplicación móvil)](#cliente-aplicación-móvil)
- [Servidor](#servidor)
- [Base de datos](#base-de-datos)
- [API](#api)
- [Backend Desplegado](#backend-desplegado)
- [Descarga e Instalación de la Aplicación (Android)](#descarga-e-instalación-de-la-aplicación-android)
- [Descarga e Instalación de la Aplicación (iOS)](#descarga-e-instalación-de-la-aplicación-ios)

## Integrantes

- Naroa Azparren Villanueva
- Alain Martínez Arpón 
- Ángela Ochoa Martínez
- Amaia Duo Resano Eguizabal 

## Descripción

Los usuarios pueden registrarse, iniciar sesión, crear el perfil de sus mascotas, elegir servicios, consultar la disponibilidad y reservar. También pueden consultar el historial de mascotas y reservas, dejar reseñas y ver la localización de la peluquería.

## Funcionalidades

- Registro e inicio de sesión con tokens.
- Gestión de mascotas e historial.
- Selección de servicios y cálculo de la duración total.
- Consulta de disponibilidad y reservas.
- Reseñas.
- Localización: mapa con la peluquería y la posición del usuario, distancia y tiempo aproximado a pie.

Servicios disponibles:

| ID | Servicio                      |
| -: | ----------------------------- |
|  1 | Baño + secado                 |
|  2 | Corte de uñas                 |
|  3 | Completo                      |
|  4 | Lavado de dientes             |
|  5 | Tratamiento pulgas y garrapatas |
|  6 | Corte de pelo                 |

## Tecnologías

- Cliente: React Native, Expo
- Servidor: Node.js, Express, Sequelize, MySQL2
- Base de datos: MySQL (Aiven)
- Seguridad: autenticación con tokens y conexión SSL/TLS con `ca.pem`

## Cliente (aplicación móvil)

Desde la carpeta `cliente`:

```bash
npm install
npx expo start
```

En Windows, si PowerShell bloquea los comandos, usar `npm.cmd install` y `npx.cmd expo start`.

### Pantalla de localización

La pantalla de localización usa estas dependencias, que deben estar instaladas:

```bash
npx expo install expo-location react-native-webview
```

Notas:

- El mapa usa OpenStreetMap dentro de un `WebView`. No necesita clave de Google Maps.
- El móvil necesita conexión a internet para cargar el mapa.
- La aplicación pide permiso de ubicación al entrar en la pantalla. Si se deniega, se puede activar desde los ajustes del móvil.
- En navegador (web) no se muestra el mapa, solo el nombre de la peluquería y el botón para abrir Google Maps.
- Tras instalar dependencias nuevas, reiniciar con la caché limpia:

```bash
npx expo start -c
```

Si se ejecuta en Expo Go, escanear el QR desde el móvil. Para Android, pulsar `a` en la terminal. No pulsar `w` para probar la localización.

## Servidor

Requiere Node.js. Comprobar con `node --version` y `npm --version`.

Desde la raíz del proyecto:

```bash
cd servidor
npm install
node index.js
```

Si la conexión es correcta aparecerá:

```text
Conexión con MySQL establecida correctamente.
Modelos sincronizados correctamente.
Servidor corriendo en http://localhost:3000
```

Para detenerlo: `Ctrl + C`.

## Base de datos

MySQL alojada en Aiven. El servidor se conecta con Sequelize mediante SSL/TLS, verificando el certificado del servidor con `ca.pem`.

Las credenciales son necesarias para ejecutar el servidor, pero no deben subirse al repositorio.

## API

La aplicación móvil se comunica con el servidor mediante una API REST que gestiona:

- Usuarios y autenticación
- Mascotas
- Servicios
- Reservas
- Reseñas
- Historial

Los endpoints se documentarán a medida que se implementen.

## Backend Desplegado

El backend de MiPerruquería está desplegado en Render y conectado a una base de datos MySQL alojada en Aiven

- **URL de la API:** https://miperruqueria-api.onrender.com
- **Servidor:** Render
- **Base de datos:** Aiven (MySQL)

Para comprobar que el servidor está funcionando, accede a la URL de la API. Deberías recibir el siguiente mensaje:

```json
{
  "mensaje": "¡API REST levantada y conectada a Aiven!"
}
```
## Descarga e Instalación de la Aplicación (Android)

La aplicación **MiPerruqueria** está disponible para dispositivos Android mediante un archivo APK, que permite instalarla directamente en el móvil sin necesidad de utilizar Expo Go ni descargarla desde Google Play

**Tecnologías y herramientas utilizadas para la compilación:**

- **React Native:** Desarrollo de la aplicación móvil
- **Expo:** framework desarrollo de la app
- **EAS Build (Expo Application Services):** Servicio para compilar la aplicación y generar el archivo APK
- **Android Keystore:** Sistema de firma digital utilizado para firmar la app 

### Enlace de descarga

- **[Descargar MiPerruqueria (APK)](AQUÍ_TU_ENLACE_DE_DESCARGA)**

### Pasos para instalar la aplicación en un móvil Android

1. Abre el enlace de descarga desde el navegador de tu dispositivo Android
2. Descarga el archivo `.apk` de MiPerruqueria
3. Una vez descargado, abre el archivo desde las notificaciones o desde la carpeta **Descargas**
4. Si Android muestra un aviso de seguridad, permite la instalación de aplicaciones desconocidas para el navegador o gestor de archivos que estés utilizando
5. Pulsa en **Instalar** y espera a que finalice el proceso
6. Una vez instalada, pulsa en **Abrir** para comenzar a utilizar MiPerruqueria

**Nota:** No es necesario tener Expo Go instalado. La aplicación se ejecuta de forma independiente y necesita conexión a Internet para comunicarse con el backend desplegado en Render y acceder a los servicios de la aplicación

### Enlace de Descarga

- **[Descargar App](https://stellar-alfajores-731d07.netlify.app)**

### Pasos para instalar desde un movil iPhone:

1. Abre Safari en tu iPhone.
2. Accede al enlace de MiPerruqueria publicado en Netlify
3. Pulsa el botón de compartir de Safari
4. Selecciona **«Añadir a pantalla de inicio»**
5. Confirma pulsando **«Añadir»**
