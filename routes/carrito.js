const express = require("express");
const pool = require("../db/pool");
const { generarCodigo } = require("../lib/codigo");
const { enviarCorreo } = require("../lib/mailer");
const stripe = require("../lib/stripeClient");

const router = express.Router();

router.get("/", (req, res) => {
  const items = req.session.carrito || [];
  const total = items.reduce((suma, item) => suma + item.precio, 0);
  res.render("carrito", {
    items,
    total,
    stripeDisponible: Boolean(stripe),
    cancelado: req.query.cancelado === "1",
  });
});

router.post("/:index/eliminar", (req, res) => {
  const indice = Number(req.params.index);
  if (req.session.carrito && indice >= 0 && indice < req.session.carrito.length) {
    req.session.carrito.splice(indice, 1);
  }
  res.redirect("/carrito");
});

// ---------- checkout sin cobro (Fase 2), respaldo si Stripe no está configurado ----------

router.post("/finalizar", async (req, res) => {
  const carrito = req.session.carrito || [];
  if (carrito.length === 0) return res.redirect("/carrito");

  const usuarioId = req.session.usuario ? req.session.usuario.id : null;
  const creados = [];

  for (const item of carrito) {
    const codigo = generarCodigo();
    const enviarEnValor = item.enviarEn ? new Date(item.enviarEn) : null;
    const esInmediato = Boolean(item.paraEmail) && !enviarEnValor;

    const { rows } = await pool.query(
      `INSERT INTO pedidos (codigo, plantilla_id, usuario_id, para, mensaje, de, para_email, enviar_en)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [codigo, item.plantillaId, usuarioId, item.para, item.mensaje, item.de, item.paraEmail, enviarEnValor]
    );

    const link = `${req.protocol}://${req.get("host")}/t/${codigo}`;

    if (esInmediato) {
      const resultado = await enviarCorreo({
        para: item.paraEmail,
        asunto: `${item.de ? item.de + " te mandó" : "Te mandaron"} una tarjeta de Aleteo`,
        cuerpo: `Hola ${item.para}, tienes una tarjeta esperándote: ${link}`,
      });
      // Si Resend lo rechazó (ok: false), lo dejamos sin marcar para que el
      // programador (lib/scheduler.js) lo reintente más adelante.
      if (resultado.ok) {
        await pool.query("UPDATE pedidos SET correo_enviado = true WHERE id = $1", [rows[0].id]);
      }
    }

    creados.push({
      codigo,
      nombre: item.nombre,
      para: item.para,
      paraEmail: item.paraEmail,
      enviarEn: item.enviarEn,
      link,
    });
  }

  req.session.carrito = [];
  res.render("carrito-confirmacion", { items: creados });
});

// ---------- pago real con Stripe (Fase 3) ----------

router.post("/pagar", async (req, res) => {
  const carrito = req.session.carrito || [];
  if (carrito.length === 0) return res.redirect("/carrito");
  if (!stripe) return res.status(503).send("El pago con tarjeta no está disponible todavía.");

  const usuarioId = req.session.usuario ? req.session.usuario.id : null;
  const total = carrito.reduce((suma, item) => suma + item.precio, 0);
  const codigoCompra = generarCodigo();

  const compraRes = await pool.query(
    `INSERT INTO compras (codigo, usuario_id, proveedor, total) VALUES ($1, $2, 'stripe', $3) RETURNING id`,
    [codigoCompra, usuarioId, total]
  );
  const compraId = compraRes.rows[0].id;

  // Los pedidos ya se crean acá, en "pendiente" — el correo no se manda
  // todavía, recién cuando /pago-exitoso confirme que Stripe aprobó el pago.
  for (const item of carrito) {
    const codigo = generarCodigo();
    const enviarEnValor = item.enviarEn ? new Date(item.enviarEn) : null;
    await pool.query(
      `INSERT INTO pedidos (codigo, plantilla_id, usuario_id, para, mensaje, de, para_email, enviar_en, compra_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [codigo, item.plantillaId, usuarioId, item.para, item.mensaje, item.de, item.paraEmail, enviarEnValor, compraId]
    );
  }

  const baseUrl = `${req.protocol}://${req.get("host")}`;
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: carrito.map((item) => ({
      price_data: {
        currency: "clp", // moneda sin decimales en Stripe: el precio en pesos va directo
        product_data: { name: `${item.nombre} — para ${item.para}` },
        unit_amount: item.precio,
      },
      quantity: 1,
    })),
    success_url: `${baseUrl}/carrito/pago-exitoso?compra=${codigoCompra}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/carrito?cancelado=1`,
  });

  await pool.query("UPDATE compras SET external_id = $1 WHERE id = $2", [session.id, compraId]);

  req.session.carrito = [];
  res.redirect(303, session.url);
});

router.get("/pago-exitoso", async (req, res) => {
  const { compra: codigoCompra, session_id: sessionId } = req.query;
  if (!codigoCompra || !sessionId || !stripe) return res.redirect("/carrito");

  const compraRes = await pool.query("SELECT * FROM compras WHERE codigo = $1", [codigoCompra]);
  if (compraRes.rows.length === 0) return res.status(404).send("Compra no encontrada");
  let compra = compraRes.rows[0];

  if (compra.estado !== "pagado") {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.id === compra.external_id && session.payment_status === "paid") {
      await pool.query("UPDATE compras SET estado = 'pagado' WHERE id = $1", [compra.id]);
      await pool.query("UPDATE pedidos SET estado = 'pagado' WHERE compra_id = $1", [compra.id]);
      compra.estado = "pagado";
    } else {
      return res.render("pago-exitoso", { pagado: false, items: [] });
    }
  }

  const pedidosRes = await pool.query(
    `SELECT pe.*, pl.nombre AS plantilla_nombre
     FROM pedidos pe JOIN plantillas pl ON pl.id = pe.plantilla_id
     WHERE pe.compra_id = $1`,
    [compra.id]
  );

  const items = [];
  for (const pedido of pedidosRes.rows) {
    const link = `${req.protocol}://${req.get("host")}/t/${pedido.codigo}`;

    if (pedido.para_email && !pedido.correo_enviado && !pedido.enviar_en) {
      const resultado = await enviarCorreo({
        para: pedido.para_email,
        asunto: `${pedido.de ? pedido.de + " te mandó" : "Te mandaron"} una tarjeta de Aleteo`,
        cuerpo: `Hola ${pedido.para}, tienes una tarjeta esperándote: ${link}`,
      });
      if (resultado.ok) {
        await pool.query("UPDATE pedidos SET correo_enviado = true WHERE id = $1", [pedido.id]);
      }
    }

    items.push({
      codigo: pedido.codigo,
      nombre: pedido.plantilla_nombre,
      para: pedido.para,
      paraEmail: pedido.para_email,
      enviarEn: pedido.enviar_en,
      link,
    });
  }

  res.render("pago-exitoso", { pagado: true, items });
});

module.exports = router;
