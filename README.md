# Aleteo — backend

Servidor con las tarjetas, invitaciones y eventos. Está hecho solo con
Node.js (sin paquetes externos que instalar), para que sea lo más
simple posible de subir a internet.

## Probarlo en tu computador (opcional, antes de subirlo)

1. Instala Node.js desde https://nodejs.org (versión LTS).
2. Abre una terminal en esta carpeta.
3. Ejecuta: `node server.js`
4. Abre en el navegador: http://localhost:3000

## Subirlo a internet (con Render.com, gratis)

1. **Crea una cuenta en GitHub** (https://github.com) si no tienes una.
2. **Sube esta carpeta a un repositorio nuevo en GitHub.**
   La forma más fácil sin usar la terminal: en github.com, botón
   "New repository" → nómbralo `aleteo` → luego "uploading an
   existing file" y arrastra todos los archivos de esta carpeta.
3. **Crea una cuenta en Render** (https://render.com), puedes entrar
   directo con tu cuenta de GitHub.
4. En Render: "New +" → "Web Service" → conecta el repositorio
   `aleteo` que subiste.
5. Configura así:
   - **Build Command:** (déjalo vacío, no hace falta)
   - **Start Command:** `node server.js`
6. Click en "Create Web Service". Render te dará una URL pública,
   algo como `https://aleteo.onrender.com` — esa es tu página, ya
   en internet.

## Qué hace cada archivo

- `server.js` — el servidor: recibe las peticiones y responde.
- `data/catalogo.js` — la lista de tarjetas e invitaciones disponibles.
- `db.js` — guarda los pedidos y eventos en un archivo (`db.json`,
  se crea solo la primera vez que alguien hace un pedido).
- `public/index.html` — el sitio web que ya diseñamos.

## Importante sobre el almacenamiento

Los datos se guardan en un archivo (`db.json`) dentro del propio
servidor. Esto es perfecto para probar y para empezar, pero en el
plan gratuito de Render ese archivo **se puede borrar** cada vez que
el servicio se reinicia (duerme tras 15 min sin uso). Cuando el
proyecto empiece a recibir pedidos reales, conviene pasar a una base
de datos real (por ejemplo PostgreSQL, que Render también ofrece
gratis) — puedo ayudarte con eso cuando llegue el momento.

## Endpoints disponibles

| Método | Ruta | Qué hace |
|---|---|---|
| GET | /api/cards | Lista todas las tarjetas e invitaciones |
| POST | /api/orders | Crea una tarjeta personalizada (para, mensaje, de) |
| GET | /api/orders/:codigo | Ver una tarjeta ya creada |
| POST | /api/events | Crea una página pública de evento |
| GET | /api/events/:codigo | Ver un evento |
| POST | /api/events/:codigo/rsvp | Confirmar asistencia a un evento |
