const express = require("express");
const pool = require("../db/pool");
const { generarCodigo } = require("../lib/codigo");

const router = express.Router();

// GET /api/cards -> catálogo activo completo
router.get("/cards", async (req, res) => {
  const { rows } = await pool.query(
    "SELECT * FROM plantillas WHERE activo = true ORDER BY tipo, categoria, nombre"
  );
  res.json(rows);
});

// POST /api/orders -> crea una tarjeta/invitación personalizada
// body: { templateId, para, mensaje, de }
router.post("/orders", async (req, res) => {
  const { templateId, para, mensaje, de } = req.body;
  if (!para || !mensaje || !templateId) {
    return res.status(400).json({ error: "Faltan campos: templateId, para, mensaje" });
  }

  const plantillaRes = await pool.query(
    "SELECT * FROM plantillas WHERE id = $1 AND activo = true",
    [templateId]
  );
  if (plantillaRes.rows.length === 0) {
    return res.status(400).json({ error: "templateId inválido" });
  }

  const codigo = generarCodigo();
  const usuarioId = req.session.usuario ? req.session.usuario.id : null;
  await pool.query(
    `INSERT INTO pedidos (codigo, plantilla_id, usuario_id, para, mensaje, de)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [codigo, templateId, usuarioId, para, mensaje, de || ""]
  );

  res.status(201).json({ codigo, url: `/t/${codigo}` });
});

// GET /api/orders/:codigo -> ver una tarjeta ya personalizada
router.get("/orders/:codigo", async (req, res) => {
  const { rows } = await pool.query(
    `SELECT pe.*, pl.nombre AS plantilla_nombre, pl.animacion, pl.categoria
     FROM pedidos pe JOIN plantillas pl ON pl.id = pe.plantilla_id
     WHERE pe.codigo = $1`,
    [req.params.codigo]
  );
  if (rows.length === 0) return res.status(404).json({ error: "No encontrada" });
  res.json(rows[0]);
});

// POST /api/events -> crea una página pública de evento
// body: { titulo, fecha, lugar, descripcion }
router.post("/events", async (req, res) => {
  const { titulo, fecha, lugar, descripcion } = req.body;
  if (!titulo || !fecha || !lugar) {
    return res.status(400).json({ error: "Faltan campos: titulo, fecha, lugar" });
  }

  const codigo = generarCodigo();
  const usuarioId = req.session.usuario ? req.session.usuario.id : null;
  await pool.query(
    `INSERT INTO eventos (codigo, titulo, fecha, lugar, descripcion, creado_por)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [codigo, titulo, fecha, lugar, descripcion || "", usuarioId]
  );

  res.status(201).json({ codigo, url: `/e/${codigo}` });
});

// GET /api/events/:codigo -> ver un evento y sus confirmados
router.get("/events/:codigo", async (req, res) => {
  const eventoRes = await pool.query("SELECT * FROM eventos WHERE codigo = $1", [req.params.codigo]);
  if (eventoRes.rows.length === 0) return res.status(404).json({ error: "No encontrado" });

  const rsvpsRes = await pool.query(
    "SELECT nombre, asiste FROM rsvps WHERE evento_id = $1 ORDER BY creado_en",
    [eventoRes.rows[0].id]
  );

  res.json({ ...eventoRes.rows[0], confirmados: rsvpsRes.rows });
});

// POST /api/events/:codigo/rsvp -> confirmar asistencia
// body: { nombre, asiste: true|false }
router.post("/events/:codigo/rsvp", async (req, res) => {
  const { nombre, asiste } = req.body;
  if (!nombre) return res.status(400).json({ error: "Falta el campo: nombre" });

  const eventoRes = await pool.query("SELECT id FROM eventos WHERE codigo = $1", [req.params.codigo]);
  if (eventoRes.rows.length === 0) return res.status(404).json({ error: "Evento no encontrado" });

  await pool.query("INSERT INTO rsvps (evento_id, nombre, asiste) VALUES ($1, $2, $3)", [
    eventoRes.rows[0].id,
    nombre,
    asiste !== false,
  ]);

  const totalRes = await pool.query(
    "SELECT COUNT(*)::int AS total FROM rsvps WHERE evento_id = $1 AND asiste = true",
    [eventoRes.rows[0].id]
  );

  res.status(201).json({ ok: true, totalConfirmados: totalRes.rows[0].total });
});

module.exports = router;
