const express = require("express");
const pool = require("../db/pool");
const requireAuth = require("../middleware/requireAuth");
const { previewMarkup } = require("../lib/preview");
const { generarCodigo } = require("../lib/codigo");

const router = express.Router();

function formatearFecha(fechaTexto) {
  const fecha = new Date(fechaTexto);
  if (isNaN(fecha.getTime())) return { dia: "--", mes: "---" };
  const dia = String(fecha.getUTCDate()).padStart(2, "0");
  const mes = fecha
    .toLocaleDateString("es-ES", { month: "short", timeZone: "UTC" })
    .replace(".", "")
    .toUpperCase();
  return { dia, mes };
}

// ---------- home ----------

router.get("/", async (req, res) => {
  const [tarjetasRes, invitacionesRes, eventosRes] = await Promise.all([
    pool.query("SELECT * FROM plantillas WHERE tipo = 'tarjeta' AND activo = true ORDER BY nombre"),
    pool.query("SELECT * FROM plantillas WHERE tipo = 'invitacion' AND activo = true ORDER BY nombre"),
    pool.query("SELECT * FROM eventos ORDER BY creado_en DESC LIMIT 3"),
  ]);

  res.render("index", {
    tarjetas: tarjetasRes.rows,
    invitaciones: invitacionesRes.rows,
    eventos: eventosRes.rows,
    usuario: req.session.usuario || null,
    carritoCount: (req.session.carrito || []).length,
    previewMarkup,
    formatearFecha,
  });
});

// ---------- personalizar una tarjeta/invitación ----------

router.get("/personalizar/:plantillaId", async (req, res) => {
  const { rows } = await pool.query(
    "SELECT * FROM plantillas WHERE id = $1 AND activo = true",
    [req.params.plantillaId]
  );
  if (rows.length === 0) return res.status(404).send("Plantilla no encontrada");
  res.render("personalizar", { plantilla: rows[0], error: null });
});

router.post("/personalizar/:plantillaId", async (req, res) => {
  const { rows } = await pool.query(
    "SELECT * FROM plantillas WHERE id = $1 AND activo = true",
    [req.params.plantillaId]
  );
  if (rows.length === 0) return res.status(404).send("Plantilla no encontrada");

  const { para, mensaje, de, paraEmail, cuandoEnviar, enviarEn } = req.body;
  if (!para || !mensaje) {
    return res.render("personalizar", { plantilla: rows[0], error: "Completa el destinatario y el mensaje." });
  }

  if (!req.session.carrito) req.session.carrito = [];
  req.session.carrito.push({
    plantillaId: rows[0].id,
    nombre: rows[0].nombre,
    precio: rows[0].precio,
    para,
    mensaje,
    de: de || "",
    paraEmail: paraEmail || null,
    enviarEn: cuandoEnviar === "programar" && enviarEn ? enviarEn : null,
  });

  res.redirect("/carrito");
});

// ---------- tarjeta final (link que se comparte) ----------

router.get("/t/:codigo", async (req, res) => {
  const { rows } = await pool.query(
    `SELECT pe.*, pl.nombre AS plantilla_nombre, pl.animacion
     FROM pedidos pe JOIN plantillas pl ON pl.id = pe.plantilla_id
     WHERE pe.codigo = $1`,
    [req.params.codigo]
  );
  if (rows.length === 0) return res.status(404).send("Esta tarjeta no existe o el link está mal escrito.");
  res.render("tarjeta", { pedido: rows[0], previewMarkup });
});

// ---------- eventos ----------

router.get("/crear-evento", (req, res) => {
  res.render("crear-evento", { error: null });
});

router.post("/crear-evento", async (req, res) => {
  const { titulo, fecha, lugar, descripcion } = req.body;
  if (!titulo || !fecha || !lugar) {
    return res.render("crear-evento", { error: "Completa título, fecha y lugar." });
  }

  const codigo = generarCodigo();
  const usuarioId = req.session.usuario ? req.session.usuario.id : null;
  await pool.query(
    `INSERT INTO eventos (codigo, titulo, fecha, lugar, descripcion, creado_por)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [codigo, titulo, fecha, lugar, descripcion || "", usuarioId]
  );

  res.redirect(`/e/${codigo}`);
});

router.get("/e/:codigo", async (req, res) => {
  const eventoRes = await pool.query("SELECT * FROM eventos WHERE codigo = $1", [req.params.codigo]);
  if (eventoRes.rows.length === 0) return res.status(404).send("Este evento no existe o el link está mal escrito.");

  const rsvpsRes = await pool.query(
    "SELECT * FROM rsvps WHERE evento_id = $1 ORDER BY creado_en DESC",
    [eventoRes.rows[0].id]
  );
  const totalConfirmados = rsvpsRes.rows.filter((r) => r.asiste).length;

  res.render("evento", {
    evento: eventoRes.rows[0],
    rsvps: rsvpsRes.rows,
    totalConfirmados,
    formatearFecha,
    enviado: req.query.confirmado === "1",
  });
});

router.post("/e/:codigo/rsvp", async (req, res) => {
  const { nombre, asiste } = req.body;
  const eventoRes = await pool.query("SELECT id FROM eventos WHERE codigo = $1", [req.params.codigo]);
  if (eventoRes.rows.length === 0) return res.status(404).send("Evento no encontrado");

  if (nombre) {
    await pool.query("INSERT INTO rsvps (evento_id, nombre, asiste) VALUES ($1, $2, $3)", [
      eventoRes.rows[0].id,
      nombre,
      asiste !== "no",
    ]);
  }

  res.redirect(`/e/${req.params.codigo}?confirmado=1`);
});

// ---------- cuenta del cliente ----------

router.get("/mis-pedidos", requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT pe.*, pl.nombre AS plantilla_nombre
     FROM pedidos pe JOIN plantillas pl ON pl.id = pe.plantilla_id
     WHERE pe.usuario_id = $1 ORDER BY pe.creado_en DESC`,
    [req.session.usuario.id]
  );
  res.render("mis-pedidos", { pedidos: rows });
});

module.exports = router;
