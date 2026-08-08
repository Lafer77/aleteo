const fs = require("fs");
const path = require("path");
const pool = require("./pool");
const { sembrarCatalogo } = require("./seed");

async function inicializarBaseDeDatos() {
  const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf-8");
  await pool.query(schema);
  await sembrarCatalogo();
}

module.exports = inicializarBaseDeDatos;
