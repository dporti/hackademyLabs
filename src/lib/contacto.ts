// Datos de contacto de Checkpoint Academy (atención a familias y alumnos), en un solo
// sitio. El email se configura con NEXT_PUBLIC_CONTACT_EMAIL (el dominio aún no está
// decidido); si no hay, no se muestra. Nunca son datos de mentores (anti-bypass).
export const CONTACTO = {
  telefono: "634 48 40 29",
  telefonoHref: "tel:+34634484029",
  whatsappHref: "https://wa.me/34634484029",
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || null,
};
