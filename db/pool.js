const { Pool } = require("pg");

if (!process.env.DATABASE_URL) {
  throw new Error(
    "Falta la variable de entorno DATABASE_URL (cadena de conexión de Postgres/Neon)."
  );
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Sin este manejador, un cliente inactivo del pool que pierde la conexión
// (Neon cierra conexiones ociosas) tira un 'error' no capturado y mata el
// proceso entero. Las siguientes queries simplemente abren una conexión nueva.
pool.on("error", (err) => {
  console.error("Error inesperado en una conexión inactiva del pool de Postgres:", err.message);
});

module.exports = pool;
