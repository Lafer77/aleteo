const express = require("express");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const pool = require("../db/pool");
const { enviarCorreo } = require("../lib/mailer");

const router = express.Router();

router.get("/registro", (req, res) => {
  res.render("auth/registro", { error: null });
});

router.post("/registro", async (req, res) => {
  const { nombre, email, password } = req.body;
  if (!nombre || !email || !password) {
    return res.render("auth/registro", { error: "Completa todos los campos." });
  }
  if (password.length < 6) {
    return res.render("auth/registro", { error: "La contraseña debe tener al menos 6 caracteres." });
  }

  const existente = await pool.query("SELECT id FROM usuarios WHERE email = $1", [email]);
  if (existente.rows.length > 0) {
    return res.render("auth/registro", { error: "Ya existe una cuenta con ese correo." });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const { rows } = await pool.query(
    "INSERT INTO usuarios (nombre, email, password_hash) VALUES ($1, $2, $3) RETURNING id, nombre, email",
    [nombre, email, passwordHash]
  );

  req.session.usuario = { id: rows[0].id, nombre: rows[0].nombre, email: rows[0].email };
  res.redirect("/");
});

router.get("/login", (req, res) => {
  res.render("auth/login", { error: null });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const { rows } = await pool.query("SELECT * FROM usuarios WHERE email = $1", [email || ""]);
  const usuario = rows[0];
  const valido = usuario && (await bcrypt.compare(password || "", usuario.password_hash));
  if (!valido) {
    return res.render("auth/login", { error: "Correo o contraseña incorrectos." });
  }

  req.session.usuario = { id: usuario.id, nombre: usuario.nombre, email: usuario.email };
  res.redirect("/");
});

router.post("/logout", (req, res) => {
  req.session.usuario = null;
  res.redirect("/");
});

router.get("/recuperar", (req, res) => {
  res.render("auth/recuperar", { enviado: false });
});

router.post("/recuperar", async (req, res) => {
  const { email } = req.body;
  const { rows } = await pool.query("SELECT id, nombre FROM usuarios WHERE email = $1", [email || ""]);
  const usuario = rows[0];

  if (usuario) {
    const token = crypto.randomBytes(24).toString("hex");
    const expira = new Date(Date.now() + 60 * 60 * 1000); // 1 hora
    await pool.query(
      "UPDATE usuarios SET reset_token = $1, reset_token_expira = $2 WHERE id = $3",
      [token, expira, usuario.id]
    );
    const link = `${req.protocol}://${req.get("host")}/auth/restablecer/${token}`;
    await enviarCorreo({
      para: email,
      asunto: "Recupera tu contraseña de Aleteo",
      cuerpo: `Hola ${usuario.nombre}, para restablecer tu contraseña entra a este link (válido por 1 hora): ${link}`,
    });
  }

  // Se muestra el mismo mensaje exista o no la cuenta, para no filtrar
  // qué correos están registrados.
  res.render("auth/recuperar", { enviado: true });
});

router.get("/restablecer/:token", async (req, res) => {
  const { rows } = await pool.query(
    "SELECT id FROM usuarios WHERE reset_token = $1 AND reset_token_expira > now()",
    [req.params.token]
  );
  if (rows.length === 0) {
    return res.render("auth/restablecer", { valido: false, token: null, error: null });
  }
  res.render("auth/restablecer", { valido: true, token: req.params.token, error: null });
});

router.post("/restablecer/:token", async (req, res) => {
  const { password } = req.body;
  const { rows } = await pool.query(
    "SELECT id FROM usuarios WHERE reset_token = $1 AND reset_token_expira > now()",
    [req.params.token]
  );
  if (rows.length === 0) {
    return res.render("auth/restablecer", { valido: false, token: null, error: null });
  }
  if (!password || password.length < 6) {
    return res.render("auth/restablecer", {
      valido: true,
      token: req.params.token,
      error: "La contraseña debe tener al menos 6 caracteres.",
    });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await pool.query(
    "UPDATE usuarios SET password_hash = $1, reset_token = NULL, reset_token_expira = NULL WHERE id = $2",
    [passwordHash, rows[0].id]
  );
  res.render("auth/login", { error: "Contraseña actualizada. Ya puedes iniciar sesión." });
});

module.exports = router;
