// Envío de correo. Si RESEND_API_KEY está configurada, manda de verdad vía
// la API de Resend (https://resend.com). Si no, sigue en "modo prueba":
// escribe el correo en la consola del servidor, útil mientras no exista
// la cuenta de Resend o para desarrollo local sin gastar envíos.

const RESEND_URL = "https://api.resend.com/emails";

async function enviarCorreo({ para, asunto, cuerpo }) {
  if (!process.env.RESEND_API_KEY) {
    console.log("---- CORREO (modo prueba, aún no conectado a un proveedor real) ----");
    console.log(`Para: ${para}`);
    console.log(`Asunto: ${asunto}`);
    console.log(cuerpo);
    console.log("----------------------------------------------------------------------");
    return { ok: true, modo: "stub" };
  }

  const remitente = process.env.RESEND_FROM || "Aleteo <onboarding@resend.dev>";

  const respuesta = await fetch(RESEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: remitente,
      to: [para],
      subject: asunto,
      text: cuerpo,
    }),
  });

  if (!respuesta.ok) {
    const detalle = await respuesta.text();
    console.error("Resend respondió con un error:", respuesta.status, detalle);
    return { ok: false, modo: "resend", error: detalle };
  }

  return { ok: true, modo: "resend" };
}

module.exports = { enviarCorreo };
