// Animaciones disponibles para las plantillas (clases CSS definidas en
// public/styles.css). Se usa tanto en el panel admin (selector al crear/
// editar una plantilla) como en las vistas públicas (miniatura del
// catálogo y la tarjeta final ya abierta).

const ANIMACIONES = [
  { valor: "p-birthday", etiqueta: "Confeti + globos",
    markup: '<div class="balloon"></div><div class="balloon"></div><div class="balloon"></div>' },
  { valor: "p-love", etiqueta: "Latido de corazón",
    markup: '<div class="heart"></div>' },
  { valor: "p-thanks", etiqueta: "Hojas / brisa",
    markup: '<div class="leaf"></div><div class="leaf"></div><div class="leaf"></div>' },
  { valor: "p-friend", etiqueta: "Destellos",
    markup: '<div class="spark"></div><div class="spark"></div><div class="spark"></div><div class="spark"></div>' },
  { valor: "p-support", etiqueta: "Pulso de apoyo",
    markup: '<div class="ring"></div>' },
  { valor: "p-congrats", etiqueta: "Estrellas",
    markup: '<div class="star">★</div><div class="star">★</div><div class="star">★</div>' },
  { valor: "p-wedding", etiqueta: "Anillos",
    markup: '<div class="ring2"></div><div class="ring2"></div>' },
  { valor: "p-baby", etiqueta: "Luna / movimiento lento",
    markup: '<div class="moon"></div>' },
  { valor: "p-quince", etiqueta: "Destellos delicados",
    markup: '<div class="sparkle">✦</div><div class="sparkle">✦</div><div class="sparkle">✦</div>' },
  { valor: "p-graduation", etiqueta: "Birrete al vuelo",
    markup: '<div class="cap">🎓</div>' },
];

function previewMarkup(animacion) {
  const item = ANIMACIONES.find((a) => a.valor === animacion);
  return item ? item.markup : "";
}

module.exports = { ANIMACIONES, previewMarkup };
