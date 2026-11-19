# Control de Gastos

PWA de finanzas personales en soles (Perú). El dashboard calcula cuánto puedes gastar al día sin tocar tu ahorro, y puedes registrar un gasto compartiendo la captura de Yape, Plin o tu banco.

## Variables de entorno

Copia `.env.example` a `.env.local`:

| Variable | Para qué |
| --- | --- |
| `SUPABASE_URL` | URL del proyecto |
| `SUPABASE_ANON_KEY` | Clave anon (también la usa el navegador) |
| `SUPABASE_SERVICE_ROLE_KEY` | Reservada en el servidor. No la pongas en el cliente |
| `ANTHROPIC_API_KEY` | Lectura del voucher con visión |
| `ANTHROPIC_MODEL` | Por defecto `claude-sonnet-4-5` |
| `NEXT_PUBLIC_APP_URL` | URL HTTPS pública (Android exige HTTPS para Compartir) |

Si dejas vacías `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`, la app reutiliza `SUPABASE_URL` y `SUPABASE_ANON_KEY`.

## Base de datos

1. En Supabase, Authentication → Providers → Email, activa el magic link.
2. En Authentication → URL Configuration, agrega `http://localhost:3000/auth/callback` (y la URL de producción).
3. Abre el SQL Editor y ejecuta, en este orden:
   - `supabase/migrations/20261117013000_init.sql`
   - `supabase/migrations/20261117021000_google_profiles.sql`
   - `supabase/migrations/20261117023000_ingresos_adicionales.sql`

Eso crea `profiles`, `gastos_fijos`, `expenses`, `metas_ahorro` y `reglas_categoria`, activa RLS, el índice único `(user_id, banco, numero_operacion)`, Realtime en `expenses` y el bucket privado `vouchers`.

## Desarrollo

```bash
npm install
npm run dev
```

Abre http://localhost:3000. Sin Supabase verás datos de ejemplo. Con Supabase, la app pide iniciar sesión y cada cuenta empieza en S/ 0.00.

## Entrar con Google

Cada familiar usa su Gmail. La app solo muestra las filas cuyo `user_id` es el de esa sesión.

1. Entra a [Google Cloud Console](https://console.cloud.google.com/) → APIs y servicios → Credenciales.
2. Configura la pantalla de consentimiento OAuth (tipo Externo, agrega el correo de prueba de cada familiar).
3. Crea un ID de cliente OAuth → Aplicación web.
4. En Orígenes de JavaScript autorizados pon `http://localhost:3000` y la URL HTTPS de producción.
5. En URI de redireccionamiento autorizados pon la URL que muestra Supabase, con esta forma: `https://TU-PROYECTO.supabase.co/auth/v1/callback`.
6. Copia el Client ID y el Client Secret.
7. En Supabase → Authentication → Providers → Google, activa el provider y pega el Client ID y el Client Secret.
8. En Authentication → URL Configuration:
   - Site URL: `http://localhost:3000` en local, o tu dominio en producción.
   - Redirect URLs: `http://localhost:3000/**` y `https://tu-dominio.com/**`.
9. Reinicia `npm run dev`, abre `/login` y pulsa **Continuar con Google**.
10. La primera vez verás el formulario de ingreso mensual, gastos fijos y porcentaje de ahorro. Al terminar, el saludo usa tu nombre de Google y el dashboard queda en S/ 0.00 hasta que registres movimientos.

```bash
npm test
npm run build
```

El logo de la app sale de `public/icons/cf.png`. Para regenerar favicon, íconos PWA y el ícono de Apple:

```bash
npm run icons
```

El destino «Compartir» solo aparece cuando la app está instalada y servida por HTTPS (en el celular, `localhost` del computador no cuenta).

1. Despliega la app (Vercel u otro host con HTTPS) o expón el servidor con un túnel HTTPS.
2. En Chrome Android abre la URL.
3. Menú → **Instalar app** / **Añadir a la pantalla principal**.
4. Ábrela desde el ícono. Debe verse sin la barra del navegador (`display: standalone`).

## Probar «Compartir» en Android

1. Inicia sesión en la PWA instalada (el enlace mágico tiene que abrirse en Chrome, el mismo perfil donde instalaste la app).
2. En Yape, Plin o la app del banco, toma la captura del comprobante exitoso.
3. Galería → la captura → **Compartir**.
4. Elige **Control de Gastos**.
5. La app sube la imagen, lee el monto, la fecha y el número de operación, y vuelve al dashboard.
6. Verás el aviso `Yape · S/ 25.00 registrado` con **Deshacer**. Si la confianza es menor a 0.7 o falta monto/fecha, el gasto queda pendiente y se abre el formulario para corregirlo.

En el escritorio, el mismo flujo está en **Subir captura** (envía el archivo a `POST /api/share`).

Si compartes sin internet, el service worker guarda la imagen y la reintenta al reconectar (Background Sync en Chrome).

Sin `ANTHROPIC_API_KEY`, el servidor intenta leer el texto con Tesseract. Esa lectura es menos precisa y casi siempre deja el gasto en revisión.
