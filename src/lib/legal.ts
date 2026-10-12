// Datos legales del titular (LSSI art. 10 y RGPD art. 13). Son datos PÚBLICOS por ley
// (aparecen en el aviso legal), no secretos. Mientras falte alguno, las páginas legales
// muestran un aviso de «pendiente»: no inventar datos.
export const TITULAR = {
  nombre: null as string | null, // nombre y apellidos o razón social
  nif: null as string | null,
  domicilio: null as string | null,
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || null, // contacto y ejercicio de derechos
  registro: null as string | null, // datos registrales si es sociedad (opcional)
};

// Versión de condiciones + privacidad. Cambiarla cuando cambien los textos: se guarda
// en el registro (auth.users → raw_user_meta_data.terms_version).
export const LEGAL_VERSION = "2026-10-12";

export const titularCompleto = () => !!(TITULAR.nombre && TITULAR.nif && TITULAR.domicilio && TITULAR.email);
