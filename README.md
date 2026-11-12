# eSports API + Panel Admin

Proyecto académico con Node.js, Express, Sequelize, MySQL y frontend HTML/CSS/JavaScript. Incluye administración de jugadores y rosters, autenticación local de Admin y Google OAuth 2.0 para usuarios Public, JWT en cookie HTTP-Only y protección CSRF.

## Requisitos
- Node.js 20 o superior
- MySQL 8
- Navegador moderno

## 1. Configuración

En una terminal de PowerShell, entra a la carpeta del proyecto:

```powershell
npm install
Copy-Item .env.example .env
notepad .env
```

Edita `.env` y configura `DB_USER`, `DB_PASSWORD`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` y `JWT_SECRET`. `JWT_SECRET` debe ser una cadena aleatoria robusta (32 caracteres como mínimo; mejor 64). Para Google OAuth también configura `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` y `GOOGLE_CALLBACK_URL`. No compartas ni subas el archivo `.env`.

Crea la base de datos si aún no existe:

```sql
CREATE DATABASE esports_api CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## 2. Ejecutar

```powershell
npm run dev
```

Abre:
- Panel Admin: http://localhost:3000
- API: http://localhost:3000/api/v1
- Swagger: http://localhost:3000/api-docs
- Salud: http://localhost:3000/api/v1/health

El servidor crea las tablas que falten con `sequelize.sync()`, incluida `usuarios` para las cuentas de Google. En una aplicación real se recomienda usar migraciones versionadas.

## 3. Iniciar sesión

Utiliza los valores de `ADMIN_EMAIL` y `ADMIN_PASSWORD` definidos en `.env`. Para esta práctica hay una cuenta Admin configurada por variables de entorno. El inicio de sesión con Google registra las cuentas externas en `usuarios`; estas reciben el rol `Public` por defecto.

## 4. Cómo funciona la autorización

- El login emite un JWT firmado que incluye el rol `Admin`.
- El JWT se almacena en `jwt_token`, cookie `HttpOnly`, por lo que el frontend no puede leerla desde JavaScript.
- El token CSRF se guarda en `csrf_token` (cookie accesible para el frontend) y dentro del JWT. Las peticiones que modifican datos deben enviar `X-CSRF-Token` con el mismo valor que la cookie y el claim CSRF del JWT.
- Los endpoints de escritura requieren JWT válido, rol `Admin` y CSRF válido.
- Los endpoints GET de jugadores y rosters permanecen públicos.
- CORS permite los orígenes definidos en `CLIENT_URL` (separados por coma) y credenciales. En el desarrollo de este proyecto, el frontend se sirve desde el mismo origen `http://localhost:3000`.
- En producción configura `NODE_ENV=production`, usa HTTPS y verifica `Secure` para las cookies.

## 5. Endpoints de autenticación

- `POST /api/v1/auth/login` con JSON `{ "email": "...", "password": "..." }`
- `GET /api/v1/auth/google/login` inicia el flujo OAuth y redirige a Google.
- `GET /api/v1/auth/google/callback` recibe la respuesta de Google, verifica el ID token y registra/recupera al usuario.
- Los usuarios Google se guardan en `usuarios` con `google_id`, `email`, `nombre`, `foto`, `proveedor` y `rol`. El rol inicial es `Public`; no concede acceso al panel Admin.
- `GET /api/v1/auth/me` devuelve la sesión activa y el token CSRF.
- `POST /api/v1/auth/logout` requiere cookie JWT y encabezado `X-CSRF-Token`.

Ejemplo de login con fetch:

```js
const response = await fetch('/api/v1/auth/login', {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});
const data = await response.json();
// Guardar data.csrfToken en memoria y enviarlo en X-CSRF-Token en POST/PUT/DELETE.
```

### Configurar Google Cloud OAuth

1. En Google Cloud Console crea o selecciona un proyecto y configura la pantalla de consentimiento OAuth.
2. Crea un ID de cliente OAuth de tipo **Aplicación web**.
3. En **URI de redireccionamiento autorizados**, agrega exactamente `http://localhost:3000/api/v1/auth/google/callback`.
4. Copia el ID de cliente y el secreto a `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` en `.env`.
5. Configura `GOOGLE_CALLBACK_URL` con la misma URI autorizada y reinicia el servidor.
6. Abre `http://localhost:3000` y selecciona **Continuar con Google**.

En producción usa HTTPS y registra la URI pública exacta. No subas el secreto OAuth al repositorio.

## 6. Funcionalidades del frontend Admin

### Jugadores
- Listado, búsqueda por nickname/nombre real y filtros por rol/estado.
- Crear, editar y eliminar jugadores.
- Mensajes de validación y confirmación al eliminar.

### Rosters
- Listar y filtrar por tipo/temporada.
- Crear, editar y eliminar rosters.
- Ver integrantes, asignar jugadores, cambiar entre Titular/Suplente y quitar integrantes.
- Se mantienen las validaciones existentes del backend: máximo cinco titulares y un titular por rol dentro de cada roster.

## 7. Pruebas manuales recomendadas

1. Abre el panel e inicia sesión con las credenciales Admin configuradas en `.env`.
2. Prueba **Continuar con Google** con una cuenta Google; verifica que aparezca una fila en `usuarios` con rol `Public`.
3. Crea un jugador y un roster; asigna jugadores al roster.
3. Intenta crear un jugador desde Postman sin cookie: debe responder `401`.
4. Inicia sesión en Postman y manda un POST sin `X-CSRF-Token`: debe responder `403`.
5. Intenta una solicitud desde un origen no incluido en `CLIENT_URL`: CORS debe bloquearla.
6. Cierra sesión y confirma que las cookies se eliminan.

## Nota de seguridad
La autenticación por variables de entorno es adecuada solo para una práctica con un único administrador. No es una gestión completa de cuentas. El token CSRF protege solicitudes autenticadas frente a CSRF, pero no reemplaza la defensa contra XSS, HTTPS, CSP, límites de intentos ni la validación de entradas. No se recomienda usar `sequelize.sync()` como estrategia de migración en producción.
