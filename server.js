require("dotenv").config();
require("express-async-errors");

const path = require("path");
const express = require("express");
const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);

const PUERTO = process.env.PORT || 3000;

if (!process.env.DATABASE_URL) {
  console.error(
    "Falta DATABASE_URL. Copia .env.example a .env y pon ahí la cadena de conexión de tu base de datos (Neon)."
  );
  process.exit(1);
}
if (!process.env.SESSION_SECRET) {
  console.error("Falta SESSION_SECRET en las variables de entorno.");
  process.exit(1);
}
if (!process.env.ADMIN_PASSWORD) {
  console.error("Falta ADMIN_PASSWORD en las variables de entorno.");
  process.exit(1);
}

const pool = require("./db/pool");
const inicializarBaseDeDatos = require("./db/init");
const iniciarProgramador = require("./lib/scheduler");

const app = express();
app.set("trust proxy", 1);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    store: new pgSession({ pool, tableName: "session", createTableIfMissing: true }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  })
);

app.use("/api", require("./routes/api"));
app.use("/auth", require("./routes/auth"));
app.use("/admin", require("./routes/admin"));
app.use("/carrito", require("./routes/carrito"));
app.use("/", require("./routes/public"));

app.use((req, res) => {
  res.status(404).send("Página no encontrada");
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send("Error interno del servidor");
});

async function iniciar() {
  await inicializarBaseDeDatos();
  iniciarProgramador();
  app.listen(PUERTO, () => {
    console.log(`Aleteo escuchando en http://localhost:${PUERTO}`);
  });
}

iniciar().catch((err) => {
  console.error("No se pudo iniciar el servidor:", err);
  process.exit(1);
});
