-- Esquema de Aleteo. Se ejecuta al iniciar el servidor (CREATE TABLE IF NOT EXISTS),
-- así que no hace falta correr esto a mano.

CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  reset_token TEXT,
  reset_token_expira TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS plantillas (
  id TEXT PRIMARY KEY,
  tipo TEXT NOT NULL,           -- 'tarjeta' | 'invitacion'
  nombre TEXT NOT NULL,
  categoria TEXT NOT NULL,
  precio INTEGER NOT NULL,
  descripcion TEXT NOT NULL DEFAULT '',
  animacion TEXT NOT NULL,      -- clase CSS de animación (p-birthday, p-love, ...)
  activo BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS pedidos (
  id SERIAL PRIMARY KEY,
  codigo TEXT UNIQUE NOT NULL,
  plantilla_id TEXT NOT NULL REFERENCES plantillas(id),
  usuario_id INTEGER REFERENCES usuarios(id),
  para TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  de TEXT NOT NULL DEFAULT '',
  estado TEXT NOT NULL DEFAULT 'pendiente',  -- pendiente | pagado | enviado
  enviar_en TIMESTAMPTZ,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS eventos (
  id SERIAL PRIMARY KEY,
  codigo TEXT UNIQUE NOT NULL,
  titulo TEXT NOT NULL,
  fecha TEXT NOT NULL,
  lugar TEXT NOT NULL,
  descripcion TEXT NOT NULL DEFAULT '',
  creado_por INTEGER REFERENCES usuarios(id),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rsvps (
  id SERIAL PRIMARY KEY,
  evento_id INTEGER NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  asiste BOOLEAN NOT NULL DEFAULT true,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fase 2: envío por correo (inmediato o programado) de una tarjeta/invitación.
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS para_email TEXT;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS correo_enviado BOOLEAN NOT NULL DEFAULT false;

-- Fase 3: pago real. Una "compra" agrupa uno o más pedidos pagados juntos.
CREATE TABLE IF NOT EXISTS compras (
  id SERIAL PRIMARY KEY,
  codigo TEXT UNIQUE NOT NULL,
  usuario_id INTEGER REFERENCES usuarios(id),
  proveedor TEXT NOT NULL,                  -- 'stripe' (más adelante: 'paypal')
  external_id TEXT,                         -- id de la sesión de pago del proveedor
  total INTEGER NOT NULL,
  estado TEXT NOT NULL DEFAULT 'pendiente', -- pendiente | pagado | fallido
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS compra_id INTEGER REFERENCES compras(id);
