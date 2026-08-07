// Base de datos muy simple guardada en un archivo JSON (db.json).
// No requiere instalar ningún motor de base de datos aparte:
// ideal para empezar. Más adelante esto se puede reemplazar por
// PostgreSQL, MySQL, etc. sin cambiar el resto del código si se
// mantienen las mismas funciones (leer, guardar).

const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "db.json");

function leer() {
  if (!fs.existsSync(DB_PATH)) {
    const inicial = { pedidos: [], eventos: [] };
    fs.writeFileSync(DB_PATH, JSON.stringify(inicial, null, 2));
    return inicial;
  }
  const contenido = fs.readFileSync(DB_PATH, "utf-8");
  return JSON.parse(contenido);
}

function guardar(datos) {
  fs.writeFileSync(DB_PATH, JSON.stringify(datos, null, 2));
}

// Genera un código corto y legible para usar en los links,
// por ejemplo: aleteo.com/t/x7f3ab
function generarCodigo() {
  return Math.random().toString(36).slice(2, 8);
}

module.exports = { leer, guardar, generarCodigo };
