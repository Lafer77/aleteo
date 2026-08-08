// Cliente de Stripe. Si no hay STRIPE_SECRET_KEY configurada, exporta null
// y el carrito cae de vuelta al checkout sin cobro de la Fase 2 — mismo
// patrón de degradación que lib/mailer.js con Resend.

const Stripe = require("stripe");

module.exports = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
