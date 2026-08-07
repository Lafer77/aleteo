// Servidor de Aleteo.
// Escrito solo con módulos incluidos en Node.js (http, fs, path),
// para que no haya que instalar nada extra para empezar a probarlo.

const http = require("http");
const fs = require("fs");
const path = require("path");
const catalogo = require("./data/catalogo");
const db = require("./db");

const PUERTO = process.env.PORT || 3000;
const CARPETA_PUBLICA = path.join(__dirname, "public");

// ---------- utilidades ----------

function enviarJSON(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

function leerCuerpo(req) {
  return new Promise((resolve, reject) => {
    let cuerpo = "";
    req.on("data", (chunk) => (cuerpo += chunk));
    req.on("end", () => {
      if (!cuerpo) return resolve({});
      try {
        resolve(JSON.parse(cuerpo));
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

const TIPOS_MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

function servirArchivoEstatico(req, res) {
  let rutaArchivo = req.url === "/" ? "/index.html" : req.url;
  rutaArchivo = path.join(CARPETA_PUBLICA, rutaArchivo);

  // Evita que alguien pida archivos fuera de /public
  if (!rutaArchivo.startsWith(CARPETA_PUBLICA)) {
    res.writeHead(403);
    return res.end("Prohibido");
  }

  fs.readFile(rutaArchivo, (err, contenido) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("No encontrado");
    }
    const ext = path.extname(rutaArchivo);
    res.writeHead(200, { "Content-Type": TIPOS_MIME[ext] || "application/octet-stream" });
    res.end(contenido);
  });
}

// ---------- rutas de la API ----------

async function manejarAPI(req, res, url) {
  const partes = url.pathname.split("/").filter(Boolean); // ej: ["api","cards"]

  // GET /api/cards  -> catálogo completo
  if (req.method === "GET" && partes[0] === "api" && partes[1] === "cards" && !partes[2]) {
    return enviarJSON(res, 200, catalogo);
  }

  // POST /api/orders  -> crea una tarjeta/invitación personalizada
  // body: { templateId, para, mensaje, de }
  if (req.method === "POST" && partes[0] === "api" && partes[1] === "orders") {
    const body = await leerCuerpo(req);
    const plantilla = catalogo.find((c) => c.id === body.templateId);
    if (!plantilla) return enviarJSON(res, 400, { error: "templateId inválido" });
    if (!body.para || !body.mensaje) {
      return enviarJSON(res, 400, { error: "Faltan campos: para, mensaje" });
    }

    const datos = db.leer();
    const codigo = db.generarCodigo();
    const pedido = {
      codigo,
      templateId: plantilla.id,
      nombrePlantilla: plantilla.nombre,
      para: body.para,
      mensaje: body.mensaje,
      de: body.de || "",
      creado: new Date().toISOString(),
    };
    datos.pedidos.push(pedido);
    db.guardar(datos);

    return enviarJSON(res, 201, { codigo, url: `/t/${codigo}` });
  }

  // GET /api/orders/:codigo -> ver una tarjeta ya personalizada
  if (req.method === "GET" && partes[0] === "api" && partes[1] === "orders" && partes[2]) {
    const datos = db.leer();
    const pedido = datos.pedidos.find((p) => p.codigo === partes[2]);
    if (!pedido) return enviarJSON(res, 404, { error: "No encontrada" });
    return enviarJSON(res, 200, pedido);
  }

  // POST /api/events -> crea una página pública de evento
  // body: { titulo, fecha, lugar, descripcion }
  if (req.method === "POST" && partes[0] === "api" && partes[1] === "events") {
    const body = await leerCuerpo(req);
    if (!body.titulo || !body.fecha || !body.lugar) {
      return enviarJSON(res, 400, { error: "Faltan campos: titulo, fecha, lugar" });
    }
    const datos = db.leer();
    const codigo = db.generarCodigo();
    const evento = {
      codigo,
      titulo: body.titulo,
      fecha: body.fecha,
      lugar: body.lugar,
      descripcion: body.descripcion || "",
      confirmados: [],
      creado: new Date().toISOString(),
    };
    datos.eventos.push(evento);
    db.guardar(datos);
    return enviarJSON(res, 201, { codigo, url: `/e/${codigo}` });
  }

  // GET /api/events/:codigo -> ver un evento
  if (req.method === "GET" && partes[0] === "api" && partes[1] === "events" && partes[2] && !partes[3]) {
    const datos = db.leer();
    const evento = datos.eventos.find((e) => e.codigo === partes[2]);
    if (!evento) return enviarJSON(res, 404, { error: "No encontrado" });
    return enviarJSON(res, 200, evento);
  }

  // POST /api/events/:codigo/rsvp -> confirmar asistencia
  // body: { nombre, asiste: true|false }
  if (req.method === "POST" && partes[0] === "api" && partes[1] === "events" && partes[2] && partes[3] === "rsvp") {
    const body = await leerCuerpo(req);
    if (!body.nombre) return enviarJSON(res, 400, { error: "Falta el campo: nombre" });

    const datos = db.leer();
    const evento = datos.eventos.find((e) => e.codigo === partes[2]);
    if (!evento) return enviarJSON(res, 404, { error: "Evento no encontrado" });

    evento.confirmados.push({ nombre: body.nombre, asiste: body.asiste !== false });
    db.guardar(datos);
    return enviarJSON(res, 201, { ok: true, totalConfirmados: evento.confirmados.length });
  }

  enviarJSON(res, 404, { error: "Ruta de API no encontrada" });
}

// ---------- servidor ----------

const servidor = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname.startsWith("/api/")) {
    try {
      await manejarAPI(req, res, url);
    } catch (err) {
      console.error(err);
      enviarJSON(res, 500, { error: "Error interno del servidor" });
    }
    return;
  }

  servirArchivoEstatico(req, res);
});

servidor.listen(PUERTO, () => {
  console.log(`Aleteo escuchando en http://localhost:${PUERTO}`);
});
