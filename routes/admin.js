const express = require("express");
const pool = require("../db/pool");
const requireAdmin = require("../middleware/requireAdmin");
const { ANIMACIONES } = require("../lib/preview");

const router = express.Router();

router.get("/login", (req, res) => {
  res.render("admin/login", { error: null });
});

router.post("/login", (req, res) => {
  const { password } = req.body;
  if (!process.env.ADMIN_PASSWORD) {
    return res.render("admin/login", { error: "El servidor no tiene configurada ADMIN_PASSWORD." });
  }
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.render("admin/login", { error: "Contraseña incorrecta." });
  }
  req.session.isAdmin = true;
  res.redirect("/admin");
});

router.post("/logout", (req, res) => {
  req.session.isAdmin = false;
  res.redirect("/admin/login");
});

router.use(requireAdmin);

// ---------- dashboard ----------

router.get("/", async (req, res) => {
  const [totalPedidos, totalEventos, ingresos, masVendida] = await Promise.all([
    pool.query("SELECT COUNT(*)::int AS total FROM pedidos"),
    pool.query("SELECT COUNT(*)::int AS total FROM eventos"),
    pool.query(
      `SELECT COALESCE(SUM(pl.precio), 0)::int AS total
       FROM pedidos pe JOIN plantillas pl ON pl.id = pe.plantilla_id
       WHERE pe.estado IN ('pagado', 'enviado')`
    ),
    pool.query(
      `SELECT pl.nombre, COUNT(*)::int AS ventas
       FROM pedidos pe JOIN plantillas pl ON pl.id = pe.plantilla_id
       GROUP BY pl.nombre ORDER BY ventas DESC LIMIT 1`
    ),
  ]);

  res.render("admin/dashboard", {
    totalPedidos: totalPedidos.rows[0].total,
    totalEventos: totalEventos.rows[0].total,
    ingresos: ingresos.rows[0].total,
    masVendida: masVendida.rows[0] || null,
  });
});

// ---------- catálogo ----------

router.get("/catalogo", async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM plantillas ORDER BY tipo, categoria, nombre");
  res.render("admin/catalogo-lista", { plantillas: rows });
});

router.get("/catalogo/nueva", (req, res) => {
  res.render("admin/catalogo-form", { modo: "nueva", plantilla: null, animaciones: ANIMACIONES, error: null });
});

router.post("/catalogo/nueva", async (req, res) => {
  const { id, tipo, nombre, categoria, precio, descripcion, animacion } = req.body;
  if (!id || !tipo || !nombre || !categoria || !precio || !animacion) {
    return res.render("admin/catalogo-form", {
      modo: "nueva",
      plantilla: req.body,
      animaciones: ANIMACIONES,
      error: "Completa todos los campos obligatorios.",
    });
  }

  try {
    await pool.query(
      `INSERT INTO plantillas (id, tipo, nombre, categoria, precio, descripcion, animacion)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, tipo, nombre, categoria, Number(precio), descripcion || "", animacion]
    );
    res.redirect("/admin/catalogo");
  } catch (err) {
    res.render("admin/catalogo-form", {
      modo: "nueva",
      plantilla: req.body,
      animaciones: ANIMACIONES,
      error: "Ya existe una plantilla con ese id, elige otro.",
    });
  }
});

router.get("/catalogo/:id/editar", async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM plantillas WHERE id = $1", [req.params.id]);
  if (rows.length === 0) return res.redirect("/admin/catalogo");
  res.render("admin/catalogo-form", { modo: "editar", plantilla: rows[0], animaciones: ANIMACIONES, error: null });
});

router.post("/catalogo/:id/editar", async (req, res) => {
  const { tipo, nombre, categoria, precio, descripcion, animacion } = req.body;
  if (!tipo || !nombre || !categoria || !precio || !animacion) {
    return res.render("admin/catalogo-form", {
      modo: "editar",
      plantilla: { ...req.body, id: req.params.id },
      animaciones: ANIMACIONES,
      error: "Completa todos los campos obligatorios.",
    });
  }
  await pool.query(
    `UPDATE plantillas SET tipo = $1, nombre = $2, categoria = $3, precio = $4,
       descripcion = $5, animacion = $6 WHERE id = $7`,
    [tipo, nombre, categoria, Number(precio), descripcion || "", animacion, req.params.id]
  );
  res.redirect("/admin/catalogo");
});

router.post("/catalogo/:id/eliminar", async (req, res) => {
  await pool.query("UPDATE plantillas SET activo = NOT activo WHERE id = $1", [req.params.id]);
  res.redirect("/admin/catalogo");
});

// ---------- pedidos ----------

router.get("/pedidos", async (req, res) => {
  const { rows } = await pool.query(
    `SELECT pe.*, pl.nombre AS plantilla_nombre, pl.precio
     FROM pedidos pe JOIN plantillas pl ON pl.id = pe.plantilla_id
     ORDER BY pe.creado_en DESC`
  );
  res.render("admin/pedidos", { pedidos: rows });
});

router.post("/pedidos/:id/estado", async (req, res) => {
  const { estado } = req.body;
  if (!["pendiente", "pagado", "enviado"].includes(estado)) {
    return res.redirect("/admin/pedidos");
  }
  await pool.query("UPDATE pedidos SET estado = $1 WHERE id = $2", [estado, req.params.id]);
  res.redirect("/admin/pedidos");
});

// ---------- eventos ----------

router.get("/eventos", async (req, res) => {
  const { rows } = await pool.query(
    `SELECT e.*, COUNT(r.id) FILTER (WHERE r.asiste) ::int AS confirmados
     FROM eventos e LEFT JOIN rsvps r ON r.evento_id = e.id
     GROUP BY e.id ORDER BY e.creado_en DESC`
  );
  res.render("admin/eventos", { eventos: rows });
});

router.get("/eventos/:id", async (req, res) => {
  const eventoRes = await pool.query("SELECT * FROM eventos WHERE id = $1", [req.params.id]);
  if (eventoRes.rows.length === 0) return res.redirect("/admin/eventos");
  const rsvpsRes = await pool.query(
    "SELECT * FROM rsvps WHERE evento_id = $1 ORDER BY creado_en DESC",
    [req.params.id]
  );
  res.render("admin/evento-detalle", { evento: eventoRes.rows[0], rsvps: rsvpsRes.rows });
});

module.exports = router;
