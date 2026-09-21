# Publicar Spark AI (Render + Netlify)

Backend en **Render** y app web en **Netlify**. Las claves se escriben solo en los paneles de cada servicio, nunca en el código.

> Los archivos `render.yaml` y `netlify.toml` no se han probado en los servicios reales. La generación de la web sí se probó en local con `expo export --platform web`.

## 1. Antes de empezar
- Fork actualizado en GitHub con esta rama.
- Cuentas en Render y en Netlify (se puede entrar con GitHub).
- Claves: `GEMINI_API_KEY`, `CLERK_PUBLISHABLE_KEY` (pk_...) y `CLERK_SECRET_KEY` (sk_..., regenerada si se expuso).
- En Clerk: **Configurar > Usuario y autenticación > Modo de acceso > Solo por invitación**.

## 2. Backend en Render
1. Render > **New > Blueprint**, elige el repositorio y la rama. Lee `render.yaml`.
2. Cuando pida las variables, rellena `GEMINI_API_KEY`, `CLERK_PUBLISHABLE_KEY` y `CLERK_SECRET_KEY`. Deja `ALLOWED_ORIGINS` vacío por ahora.
3. Al terminar, anota la dirección (ej. `spark-ai-api.onrender.com`) y comprueba `https://<dirección>/api/healthz`.

## 3. App web en Netlify
1. Netlify > **Add new site > Import an existing project**, elige el repositorio y la rama. Lee `netlify.toml`.
2. Antes de desplegar, define las variables:
   - `EXPO_PUBLIC_DOMAIN` = dirección del backend, **sin** `https://`
   - `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` = clave pública de Clerk
3. Al terminar, anota la dirección de la web (ej. `https://mi-app.netlify.app`).

## 4. Conectar las dos piezas
1. En Render, define `ALLOWED_ORIGINS` = dirección de la web con `https://` y sin barra final.
2. Render reinicia solo. Abre la web desde el celular, con datos móviles.

## 5. Límites y avisos
- `CHAT_RATE_LIMIT_PER_HOUR` (30) y `TRANSCRIBE_RATE_LIMIT_PER_HOUR` (20) limitan mensajes por usuario. Se guardan en memoria: se reinician con el servidor.
- El plan gratuito de Render duerme el backend tras un rato sin uso; la primera respuesta puede tardar.
- Las conversaciones se guardan solo en el navegador de cada dispositivo.
- Con claves `pk_test_` Clerk funciona en modo de pruebas. Para uso real, Clerk pide una instancia de producción (con sus propias claves y restricciones).
- El repositorio no incluye `pnpm-lock.yaml`, por eso las compilaciones usan `--no-frozen-lockfile` y pueden resolver versiones nuevas.
