// Siembra la tabla plantillas desde data/catalogo.js la primera vez que
// el servidor arranca contra una base de datos vacía. Así el admin ya
// tiene el catálogo actual para editar, en vez de empezar de cero.

const pool = require("./pool");
const catalogo = require("../data/catalogo");

// Mapeo de id de plantilla -> clase CSS de animación que ya existe en el
// frontend (public/styles.css), para que las tarjetas se rendericen igual
// que en el prototipo original.
const ANIMACION_POR_ID = {
  "cumpleanos-vuelta-al-sol": "p-birthday",
  "amor-late-por-ti": "p-love",
  "gracias-hojas": "p-thanks",
  "amistad-destello": "p-friend",
  "animo-aqui-estoy": "p-support",
  "logro-lo-lograste": "p-congrats",
  "invitacion-boda": "p-wedding",
  "invitacion-babyshower": "p-baby",
  "invitacion-quince": "p-quince",
  "invitacion-graduacion": "p-graduation",
};

async function sembrarCatalogo() {
  const { rows } = await pool.query("SELECT COUNT(*)::int AS total FROM plantillas");
  if (rows[0].total > 0) return;

  for (const item of catalogo) {
    await pool.query(
      `INSERT INTO plantillas (id, tipo, nombre, categoria, precio, descripcion, animacion)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO NOTHING`,
      [
        item.id,
        item.tipo,
        item.nombre,
        item.categoria,
        item.precio,
        item.descripcion,
        ANIMACION_POR_ID[item.id] || "p-birthday",
      ]
    );
  }
  console.log(`Catálogo sembrado con ${catalogo.length} plantillas.`);
}

module.exports = { sembrarCatalogo, ANIMACION_POR_ID };
