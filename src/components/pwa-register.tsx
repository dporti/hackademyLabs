"use client";

import { useEffect } from "react";

// Registra el service worker de la PWA (solo en producción: en desarrollo molestaría
// con la recarga en caliente).
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* sin service worker la web funciona igual */
    });
  }, []);
  return null;
}
