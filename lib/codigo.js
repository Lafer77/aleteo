// Genera un código corto y legible para usar en los links,
// por ejemplo: aleteo.onrender.com/t/x7f3ab
function generarCodigo() {
  return Math.random().toString(36).slice(2, 8);
}

module.exports = { generarCodigo };
