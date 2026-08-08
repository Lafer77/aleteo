// Revisa cada cierto tiempo si hay tarjetas/invitaciones con envío por
// correo pendiente (inmediato o programado para una fecha ya cumplida) y
// las manda. El envío "ahora" normalmente ya se hace en el momento del
// checkout (routes/carrito.js); esto existe para los programados a
// futuro, y como respaldo si ese envío inmediato llegara a fallar.
//
// Nota: en el plan gratis de Render el servicio duerme tras 15 minutos
// sin tráfico, así que mientras duerme este programador no corre — un
// envío programado para esa hora saldrá recién cuando una visita
// despierte el servicio.

const pool = require("../db/pool");
const { enviarCorreo } = require("./mailer");

const INTERVALO_MS = 60 * 1000;

function urlBase() {
  return process.env.SITE_URL || `http://localhost:${process.env.PORT || 3000}`;
}

async function procesarPendientes() {
  const { rows } = await pool.query(
    `SELECT pe.*, pl.nombre AS plantilla_nombre
     FROM pedidos pe JOIN plantillas pl ON pl.id = pe.plantilla_id
     WHERE pe.para_email IS NOT NULL AND pe.correo_enviado = false
       AND (pe.enviar_en IS NULL OR pe.enviar_en <= now())`
  );

  for (const pedido of rows) {
    const link = `${urlBase()}/t/${pedido.codigo}`;
    const resultado = await enviarCorreo({
      para: pedido.para_email,
      asunto: `${pedido.de ? pedido.de + " te mandó" : "Te mandaron"} una tarjeta de Aleteo`,
      cuerpo: `Hola ${pedido.para}, tienes una tarjeta esperándote: ${link}`,
    });
    // Si falla, lo dejamos sin marcar — el próximo ciclo (60s) lo reintenta.
    if (resultado.ok) {
      await pool.query("UPDATE pedidos SET correo_enviado = true WHERE id = $1", [pedido.id]);
    }
  }
}

function iniciarProgramador() {
  procesarPendientes().catch((err) => console.error("Error en el programador de envíos:", err));
  setInterval(() => {
    procesarPendientes().catch((err) => console.error("Error en el programador de envíos:", err));
  }, INTERVALO_MS);
}

module.exports = iniciarProgramador;
