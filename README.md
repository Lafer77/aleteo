# Aleteo — backend + panel de administración

Servidor Node.js/Express con las tarjetas, invitaciones, eventos, cuentas
de clientes y el panel de administración. Usa PostgreSQL como base de
datos real (recomendado: [Neon](https://neon.tech), gratis y sin
expiración).

## Antes de empezar: crear la base de datos (Neon)

1. Entra a https://neon.tech y crea una cuenta gratis (sin tarjeta).
2. Crea un proyecto nuevo.
3. En el dashboard del proyecto, copia el **Connection string** (empieza
   con `postgresql://...`). Lo vas a necesitar en el siguiente paso.

## Probarlo en tu computador

1. Instala Node.js desde https://nodejs.org (versión LTS).
2. Abre una terminal en esta carpeta y ejecuta `npm install`.
3. Copia `.env.example` a un archivo nuevo llamado `.env` y completa:
   - `DATABASE_URL` — la cadena de conexión de Neon del paso anterior.
   - `SESSION_SECRET` — cualquier texto largo y aleatorio.
   - `ADMIN_PASSWORD` — la contraseña con la que vas a entrar a `/admin`.
4. Ejecuta `node server.js` (crea las tablas y siembra el catálogo la
   primera vez que corre).
5. Abre en el navegador: http://localhost:3000

## Subirlo a internet (Render)

1. Sube los cambios de esta carpeta al repositorio de GitHub `aleteo`.
2. En Render, en el servicio existente (o uno nuevo): **Settings** →
   agrega estas **Environment Variables**: `DATABASE_URL`,
   `SESSION_SECRET`, `ADMIN_PASSWORD` (los mismos valores que usaste en
   `.env`, o distintos para producción).
3. **Build Command:** `npm install`
   **Start Command:** `node server.js`
4. Cada `git push` a la rama conectada vuelve a desplegar solo.

## Cómo entrar al panel de administración

Ve a `/admin` (o el link "Administración" en el pie de página del
sitio) y entra con la contraseña que pusiste en `ADMIN_PASSWORD`. Desde
ahí puedes:

- Ver estadísticas (pedidos, eventos, ingresos, plantilla más vendida).
- Crear, editar y activar/desactivar plantillas del catálogo (tarjetas
  e invitaciones), incluyendo su animación, categoría y precio.
- Ver todos los pedidos y cambiar su estado (pendiente/pagado/enviado).
- Ver todos los eventos y quién confirmó asistencia.

## Qué hace cada carpeta

- `server.js` — arma la app de Express, sesiones, y monta todas las rutas.
- `db/` — conexión a Postgres (`pool.js`), esquema de tablas
  (`schema.sql`, se aplica solo al iniciar) y siembra inicial del
  catálogo (`seed.js`, desde `data/catalogo.js`).
- `lib/` — utilidades: generación de códigos de link (`codigo.js`),
  envío de correo (`mailer.js`, ver nota abajo) y las animaciones
  disponibles para el catálogo (`preview.js`).
- `middleware/` — protege rutas que requieren sesión de cliente
  (`requireAuth.js`) o de administrador (`requireAdmin.js`).
- `routes/` — `api.js` (API JSON), `auth.js` (cuentas de clientes),
  `admin.js` (panel), `public.js` (sitio público, formularios y las
  páginas de tarjeta/evento que se comparten por link), `carrito.js`
  (agregar/quitar ítems y finalizar el pedido).
- `views/` — plantillas EJS de todas las páginas.
- `public/styles.css` — el diseño visual, compartido por todas las páginas.

## Carrito y envío de correo (Fase 2)

Al personalizar una tarjeta se agrega a un carrito (`/carrito`) en vez
de comprarse al toque — se pueden agregar varias, cada una con su
propio destinatario, y cada una puede tener opcionalmente:

- **Correo del destinatario** — si se completa, al finalizar el pedido
  se manda la tarjeta por correo automáticamente.
- **Cuándo enviarla** — "apenas confirme el pedido" (inmediato) o una
  fecha/hora programada. Un programador interno ([lib/scheduler.js](lib/scheduler.js))
  revisa cada minuto si ya llegó la hora de las programadas.

`lib/mailer.js` manda correos reales vía [Resend](https://resend.com)
si `RESEND_API_KEY` está configurada; si no, sigue en modo prueba
(escribe el correo en la consola del servidor). Esto también aplica a
"recuperar contraseña" — sin la key, el link de recuperación queda en
los logs en vez de llegar a la bandeja de entrada.

**Límite a tener en cuenta:** en el plan gratis de Render el servicio
duerme tras 15 minutos sin tráfico. Mientras duerme, el programador de
envíos programados no corre — el correo sale recién cuando una visita
despierta el servicio, no exactamente a la hora programada.

## Pago con tarjeta (Fase 3)

Si `STRIPE_SECRET_KEY` está configurada, el carrito muestra "Pagar con
tarjeta" en vez del checkout sin cobro de la Fase 2. El pago se hace en
la página de Stripe (Visa, Mastercard, etc. — Stripe procesa la tarjeta,
Aleteo nunca ve el número); al volver, el servidor le confirma a Stripe
que el pago quedó aprobado antes de marcar el pedido como `pagado` y
recién ahí manda el correo si correspondía.

Se usan llaves de **modo prueba** (`sk_test_...`) — no se cobra nada
real. Para probar un pago completo: tarjeta `4242 4242 4242 4242`,
cualquier fecha futura, cualquier CVC.

**Cómo se confirma el pago:** por redirección (el navegador vuelve al
sitio después de pagar y el servidor verifica con Stripe en ese
momento), no por webhook — así funciona sin publicar el sitio primero.
Si alguien cierra la pestaña justo después de pagar sin volver, ese
pedido queda visible como `pendiente` en `/admin/pedidos` para
resolverlo a mano; un webhook (recomendado por Stripe para producción)
se puede sumar más adelante una vez el sitio esté en Render.

**PayPal queda pendiente**: no admite pesos chilenos (CLP) como moneda
de cobro. Aceptarlo implicaría cobrar en otra moneda con una tasa de
conversión — es una decisión de negocio que falta tomar antes de
construirlo.

## Roadmap

- **Fase 1 (ya implementada)** — base de datos real, cuentas de
  clientes con recuperación de contraseña, catálogo editable, motor de
  tarjetas/invitaciones personalizadas, páginas de eventos con RSVP,
  panel de administración completo.
- **Fase 2 (ya implementada)** — carrito de compra multi-ítem, envío
  real de correos vía Resend (recuperación de contraseña real y envío
  inmediato o programado), botones de compartir por WhatsApp.
- **Fase 3 (ya implementada)** — pago real con Stripe (Visa/Mastercard).
  PayPal pendiente de una decisión de moneda (ver arriba).

## Endpoints de la API

| Método | Ruta | Qué hace |
|---|---|---|
| GET | /api/cards | Catálogo activo completo |
| POST | /api/orders | Crea una tarjeta/invitación personalizada |
| GET | /api/orders/:codigo | Ver un pedido |
| POST | /api/events | Crea una página pública de evento |
| GET | /api/events/:codigo | Ver un evento y sus confirmados |
| POST | /api/events/:codigo/rsvp | Confirmar asistencia a un evento |
