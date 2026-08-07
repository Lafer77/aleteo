// Catálogo de plantillas disponibles.
// Esto simula lo que normalmente estaría guardado en una base de datos.
// Cada plantilla representa un diseño de tarjeta o invitación que la
// persona puede elegir y personalizar.

const catalogo = [
  // --- Tarjetas ---
  { id: "cumpleanos-vuelta-al-sol", tipo: "tarjeta", nombre: "Vuelta al sol",
    categoria: "Cumpleaños", precio: 2900,
    descripcion: "Globos que suben y confeti al abrir." },
  { id: "amor-late-por-ti", tipo: "tarjeta", nombre: "Late por ti",
    categoria: "Amor", precio: 2900,
    descripcion: "Un corazón con pulso propio." },
  { id: "gracias-hojas", tipo: "tarjeta", nombre: "Hojas de gracias",
    categoria: "Gracias", precio: 2500,
    descripcion: "Movimiento lento, casi de brisa." },
  { id: "amistad-destello", tipo: "tarjeta", nombre: "Destello de amistad",
    categoria: "Amistad", precio: 2500,
    descripcion: "Pequeños brillos intermitentes." },
  { id: "animo-aqui-estoy", tipo: "tarjeta", nombre: "Aquí estoy",
    categoria: "Ánimo", precio: 2500,
    descripcion: "Un pulso constante, como una presencia." },
  { id: "logro-lo-lograste", tipo: "tarjeta", nombre: "Lo lograste",
    categoria: "Felicitaciones", precio: 2900,
    descripcion: "Estrellas que aparecen una a una." },

  // --- Invitaciones ---
  { id: "invitacion-boda", tipo: "invitacion", nombre: "Nuestra boda",
    categoria: "Boda", precio: 4500,
    descripcion: "Anillos que se encuentran suavemente. Incluye RSVP." },
  { id: "invitacion-babyshower", tipo: "invitacion", nombre: "Ya casi llega",
    categoria: "Baby shower", precio: 3900,
    descripcion: "Movimiento lento y tierno." },
  { id: "invitacion-quince", tipo: "invitacion", nombre: "Mis quince",
    categoria: "Quinceañera", precio: 3900,
    descripcion: "Destellos delicados." },
  { id: "invitacion-graduacion", tipo: "invitacion", nombre: "¡Lo logramos!",
    categoria: "Graduación", precio: 3900,
    descripcion: "Birrete al vuelo." },
];

module.exports = catalogo;
